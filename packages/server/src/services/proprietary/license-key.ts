import { db, ESubPlan, ESubStatus, subscription } from '@dokploy/server/db'
import { user } from '@dokploy/server/db/schema'
import { eq } from 'drizzle-orm'
import { getOrganizationOwnerId } from './sso'

export const hasValidLicense = async (organizationId: string) => {
	const ownerId = await getOrganizationOwnerId(organizationId)

	if (!ownerId) {
		return false
	}

	// const currentUser = await db.query.user.findFirst({
	// 	where: eq(user.id, ownerId),
	// 	columns: {
	// 		enableEnterpriseFeatures: true,
	// 		isValidEnterpriseLicense: true,
	// 	},
	// })

	const currentSubscription = await db.query.subscription.findFirst({
		where: eq(subscription.userId, ownerId),
	})

	if (!currentSubscription) return false

	const validPlan = ESubPlan[currentSubscription.plan] >= ESubPlan.pro

	return validPlan && currentSubscription.status === ESubStatus.active
	// return !!(
	// 	currentUser?.enableEnterpriseFeatures &&
	// 	currentUser?.isValidEnterpriseLicense
	// )
}
