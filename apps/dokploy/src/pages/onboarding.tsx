import { db, projects } from '@dokploy/server/db'
import { validateRequest } from '@dokploy/server/lib/auth'
import type { CreateNextContextOptions } from '@trpc/server/adapters/next'
import { eq } from 'drizzle-orm'
import type { GetServerSidePropsContext } from 'next'
import type { ReactElement } from 'react'
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard'
import { OnboardingWizardPageLayout } from '@/components/onboarding/onboarding-wizard-page-layout'
import { appRouter } from '@/server/api/root'
import { createTRPCContext } from '@/server/api/trpc'
import { getOnboardingPageRedirect } from '@/server/utils/onboarding-redirect'

const OnboardingPage = () => {
	return <OnboardingWizard />
}

export default OnboardingPage

OnboardingPage.getLayout = (page: ReactElement) => (
	<OnboardingWizardPageLayout>{page}</OnboardingWizardPageLayout>
)

export async function getServerSideProps(ctx: GetServerSidePropsContext) {
	const {user} = await validateRequest(ctx.req)
	if (!user) {
		return {
			redirect: {destination: '/', permanent: false},
		}
	}
	const redirect = await getOnboardingPageRedirect(user.id)

	if (redirect) {

		// const {mutateAsync} = api.project.create.useMutation()
		//
		// await mutateAsync({
		// 	name: 'First Project',
		// 	description: '',
		// })

// TODO
		return {redirect}
	}

	const data = await db.query.projects.findFirst({
		where: eq(projects.name, 'First Project'),
	})

	if (!data) {
		const caller = appRouter.createCaller(
			await createTRPCContext({
				req: ctx.req,
				res: ctx.res,
			} as CreateNextContextOptions),
		)
		const app = await caller.project.create({
			name: 'First Project',
			description: '',
			env: '',
		})
		return { props: {} }
	}
	return { props: {} }
}
