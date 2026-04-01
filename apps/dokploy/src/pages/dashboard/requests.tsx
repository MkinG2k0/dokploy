import { IS_CLOUD } from '@dokploy/server/constants'
import { validateRequest } from '@dokploy/server/lib/auth'
import type { GetServerSidePropsContext } from 'next'
import type { ReactElement } from 'react'
import { ShowRequests } from '@/components/dashboard/requests/show-requests'
import { DashboardLayout } from '@/components/layouts/dashboard-layout'
import { isSuperAdmin } from '../../server/api'

export default function Requests() {
	return <ShowRequests/>
}
Requests.getLayout = (page: ReactElement) => {
	return <DashboardLayout pageTitleKey="requests">{page}</DashboardLayout>
}

export async function getServerSideProps(
	ctx: GetServerSidePropsContext<{ serviceId: string }>,
) {

	const {user} = await validateRequest(ctx.req)

	if (IS_CLOUD && !isSuperAdmin(user)) {
		return {
			redirect: {
				permanent: true,
				destination: '/dashboard/projects',
			},
		}
	}

	if (!user) {
		return {
			redirect: {
				permanent: true,
				destination: '/',
			},
		}
	}

	return {
		props: {},
	}
}
