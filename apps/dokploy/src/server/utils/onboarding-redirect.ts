import { IS_CLOUD } from '@dokploy/server'
import { db } from '@dokploy/server/db'
import { user as userTable } from '@dokploy/server/db/schema'
import { eq } from 'drizzle-orm'
import type { Redirect } from 'next'

/**
 * Cloud-only: users who have not finished the onboarding wizard must not use the dashboard yet.
 */
export const getDashboardOnboardingRedirect = async (
	userId: string,
): Promise<Redirect | null> => {
	if (!IS_CLOUD) {
		return null
	}
	const row = await db.query.user.findFirst({
		where: eq(userTable.id, userId),
		columns: {onboardingCompleted: true},
	})
	if (row && !row.onboardingCompleted) {
		return {destination: '/onboarding', permanent: false}
	}
	return null
}

/**
 * Cloud-only: completed users should not reopen the wizard URL.
 */
export const getOnboardingPageRedirect = async (
	userId: string,
): Promise<Redirect | null> => {
	if (!IS_CLOUD) {
		return {destination: '/dashboard/projects', permanent: false}
	}
	const row = await db.query.user.findFirst({
		where: eq(userTable.id, userId),
		columns: {onboardingCompleted: true},
	})

	if (row?.onboardingCompleted) {
		return {destination: '/dashboard/projects', permanent: false}
	}
	return null
}
