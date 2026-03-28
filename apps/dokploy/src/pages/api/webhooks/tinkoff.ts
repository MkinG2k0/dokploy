import type { NextApiRequest, NextApiResponse } from 'next'

import { logger } from '@dokploy/server'
import type { PlanKey } from '@dokploy/server/billing/plans'
import { addSubscriptionPeriodEnd } from '@dokploy/server/billing/subscription-period'
import { payment as tinkoffPaymentClient } from '@dokploy/server/billing/payment'
import { db } from '@dokploy/server/db'
import { payment, subscription, user } from '@dokploy/server/db/schema'
import { eq } from 'drizzle-orm'

const BASE_SERVERS_QUANTITY = 1 as const
const SERVERS_QUANTITY_BY_PLAN: Record<PlanKey, number> = {
	free: BASE_SERVERS_QUANTITY,
	pro: 10,
	agency: 50,
}

const getServersQuantityByPlan = (planKey: PlanKey): number => {
	return SERVERS_QUANTITY_BY_PLAN[planKey]
}

const updateUserServersQuantityByPlan = async (
	userId: string,
	planKey: PlanKey,
) => {
	const serversQuantity = getServersQuantityByPlan(planKey)

	await db.update(user).set({serversQuantity}).where(eq(user.id, userId))
}

type CurrentPayment = NonNullable<
	Awaited<ReturnType<typeof db.query.payment.findFirst>>
>;

const getRebillId = (body: Record<string, unknown>): string | null => {
	const v = body.RebillId ?? body.RebillID
	if (v === undefined || v === null || v === '') return null
	return String(v)
}

const customerKeyFromBody = (body: Record<string, unknown>): string | null => {
	const v = body.CustomerKey
	if (v === undefined || v === null || v === '') return null
	return String(v)
}

const handleSubscriptionPayment = async (
	current: CurrentPayment,
	status: string,
	body: Record<string, unknown>,
) => {
	if (status === 'AUTHORIZED') {
		const paymentId = current.tinkoffPaymentId
		if (!paymentId) return
		const isConfirmed = await tinkoffPaymentClient.confirm(paymentId)
		if (!isConfirmed) {
			logger.warn(
				{paymentId, paymentRowId: current.id},
				'Tinkoff webhook: Confirm не прошёл, платёж останется pending до следующего уведомления или сверки',
			)
			return
		}
	}

	if (status === 'AUTHORIZED' || status === 'CONFIRMED') {
		const sid = current.subscriptionId
		if (!sid) {
			throw new Error('Payment missing subscriptionId')
		}
		const subRow = await db.query.subscription.findFirst({
			where: eq(subscription.id, sid),
		})
		if (!subRow) {
			throw new Error('Subscription not found for payment')
		}
		const planKey = subRow.plan
		const now = new Date()
		const periodBase = subRow.currentPeriodEnd ?? now

		await db
			.update(payment)
			.set({status: 'succeeded'})
			.where(eq(payment.id, current.id))

		await db
			.insert(subscription)
			.values({
				userId: current.userId,
				plan: planKey,
				status: 'active',
				rebillId: getRebillId(body),
				tinkoffCustomerKey: customerKeyFromBody(body),
				currentPeriodEnd: addSubscriptionPeriodEnd(periodBase),
				cancelAtPeriodEnd: false,
				autoRenew: true,
				updatedAt: now,
			})
			.onConflictDoUpdate({
				target: subscription.userId,
				set: {
					plan: planKey,
					status: 'active',
					rebillId: getRebillId(body),
					tinkoffCustomerKey: customerKeyFromBody(body),
					currentPeriodEnd: addSubscriptionPeriodEnd(periodBase),
					cancelAtPeriodEnd: false,
					autoRenew: true,
					updatedAt: now,
				},
			})

		await updateUserServersQuantityByPlan(current.userId, planKey)

		return
	}

	if (status === 'REJECTED') {
		await db
			.update(payment)
			.set({status: 'failed'})
			.where(eq(payment.id, current.id))

		const userSub = await db.query.subscription.findFirst({
			where: eq(subscription.userId, current.userId),
		})
		if (userSub?.status === 'pending_payment') {
			await db
				.update(subscription)
				.set({
					plan: 'free',
					status: 'active',
					autoRenew: true,
					updatedAt: new Date(),
				})
				.where(eq(subscription.userId, current.userId))
		} else {
			await db
				.update(subscription)
				.set({
					status: 'past_due',
				})
				.where(eq(subscription.userId, current.userId))
		}
	}

	if (status === 'REFUNDED') {
		await db
			.update(payment)
			.set({status: 'canceled'})
			.where(eq(payment.id, current.id))

		await db
			.update(subscription)
			.set({status: 'canceled', updatedAt: new Date()})
			.where(eq(subscription.userId, current.userId))

		await db
			.update(user)
			.set({serversQuantity: BASE_SERVERS_QUANTITY})
			.where(eq(user.id, current.userId))
	}
}

const handleOneTimePayment = async (
	current: CurrentPayment,
	status: string,
	body: Record<string, unknown>,
) => {
	const sid = current.subscriptionId
	if (!sid) {
		throw new Error('Payment missing subscriptionId')
	}

	if (status === 'AUTHORIZED') {
		const paymentId = current.tinkoffPaymentId
		if (!paymentId) return
		const isConfirmed = await tinkoffPaymentClient.confirm(paymentId)
		if (!isConfirmed) {
			logger.warn(
				{paymentId, paymentRowId: current.id},
				'Tinkoff webhook (one_time): Confirm не прошёл',
			)
			return
		}
	}

	if (status === 'AUTHORIZED' || status === 'CONFIRMED') {
		const subRow = await db.query.subscription.findFirst({
			where: eq(subscription.id, sid),
		})
		if (!subRow) {
			throw new Error('Subscription not found for one_time payment')
		}
		const planKey = subRow.plan
		const now = new Date()

		await db
			.update(payment)
			.set({status: 'succeeded'})
			.where(eq(payment.id, current.id))

		await db
			.insert(subscription)
			.values({
				userId: current.userId,
				plan: planKey,
				status: 'active',
				rebillId: null,
				tinkoffCustomerKey: customerKeyFromBody(body),
				currentPeriodEnd: addSubscriptionPeriodEnd(now),
				cancelAtPeriodEnd: false,
				autoRenew: false,
				updatedAt: now,
			})
			.onConflictDoUpdate({
				target: subscription.userId,
				set: {
					plan: planKey,
					status: 'active',
					rebillId: null,
					tinkoffCustomerKey: customerKeyFromBody(body),
					currentPeriodEnd: addSubscriptionPeriodEnd(now),
					cancelAtPeriodEnd: false,
					autoRenew: false,
					updatedAt: now,
				},
			})

		await updateUserServersQuantityByPlan(current.userId, planKey)
		return
	}

	if (status === 'REJECTED') {
		await db
			.update(payment)
			.set({status: 'failed'})
			.where(eq(payment.id, current.id))

		const userSub = await db.query.subscription.findFirst({
			where: eq(subscription.userId, current.userId),
		})
		if (userSub?.status === 'pending_payment') {
			await db
				.update(subscription)
				.set({
					plan: 'free',
					status: 'active',
					autoRenew: true,
					updatedAt: new Date(),
				})
				.where(eq(subscription.userId, current.userId))
		}
		return
	}

	if (status === 'REFUNDED') {
		await db
			.update(payment)
			.set({status: 'canceled'})
			.where(eq(payment.id, current.id))
	}
}

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	if (req.method !== 'POST') {
		res.status(405).send('OK')
		return
	}

	const body = req.body as Record<string, unknown>

	const tokenOk = tinkoffPaymentClient.verifyWebhook(body)
	if (!tokenOk) {
		res.status(400).send('OK')
		return
	}

	const paymentIdRaw = body.PaymentId
	const paymentId =
		paymentIdRaw !== undefined && paymentIdRaw !== null && paymentIdRaw !== ''
			? String(paymentIdRaw)
			: undefined
	if (!paymentId) {
		res.status(200).send('OK')
		return
	}

	const current = await db.query.payment.findFirst({
		where: eq(payment.tinkoffPaymentId, paymentId),
	})

	if (!current) {
		res.status(200).send('OK')
		return
	}

	const state = await tinkoffPaymentClient.status(paymentId)
	const status = state.status

	// Возврат приходит, когда в БД уже succeeded; раньше обрабатывались только pending.
	const isPendingFlow = current.status === 'pending'
	const isRefundAfterSuccess =
		current.status === 'succeeded' && status === 'REFUNDED'

	if (!isPendingFlow && !isRefundAfterSuccess) {
		res.status(200).send('OK')
		return
	}

	if (current.type === 'one_time') {
		await handleOneTimePayment(current, status, body)
	} else {
		await handleSubscriptionPayment(current, status, body)
	}

	res.status(200).send('OK')
}
