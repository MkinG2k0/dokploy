import { Loader2, Shield } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { PlatformMembershipTableRow } from '@/components/dashboard/settings/users/platform-membership-table-row'
import { PlatformUsersStatsSummary } from '@/components/dashboard/settings/users/platform-users-stats-summary'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import {
	TableBody,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table'
import { api } from '@/utils/api'

export const TableUsers = () => {
	const t = useTranslations('settingsUsers')
	const {data, isPending} = api.user.allUsers.useQuery()
	const {data: session} = api.user.session.useQuery()

	const platformTableGroupHeadClass =
		'sticky top-0 z-20 h-10 border-b border-border bg-background py-2 text-center align-middle text-xs font-semibold uppercase tracking-wide text-muted-foreground'
	const platformTableSubHeadClass =
		'sticky top-0 z-30 h-12 border-b border-border bg-background px-4 text-left align-middle font-medium text-muted-foreground'
	const platformTableCornerHeadClass =
		'sticky left-0 top-0 z-40 h-12 border-b border-r border-border bg-background px-4 text-left align-middle font-medium text-muted-foreground'
	const platformTableHeaderRowClass = 'border-b-0 hover:bg-transparent'

	return (
		<div className="flex w-full flex-col gap-4">
			<Card className="mx-auto h-full w-full max-w-full rounded-xl bg-sidebar p-2.5">
				<div className="rounded-xl bg-background shadow-md">
					<CardHeader>
						<CardTitle className="flex flex-row gap-2 text-xl">
							<Shield className="size-6 self-center text-muted-foreground"/>
							{t('platformTableTitle')}
						</CardTitle>
						<CardDescription>{t('platformTableDescription')}</CardDescription>
					</CardHeader>
					<CardContent className="space-y-2 border-t py-6">
						{isPending ? (
							<div className="flex min-h-[25vh] flex-row items-center justify-center gap-2 text-sm text-muted-foreground">
								<span>{t('loading')}</span>
								<Loader2 className="size-4 animate-spin"/>
							</div>
						) : !data || data.length === 0 ? (
							<div className="flex min-h-[25vh] flex-col items-center justify-center gap-3">
								<Shield className="size-8 text-muted-foreground"/>
								<span className="text-base text-muted-foreground">
                  {t('platformEmpty')}
                </span>
							</div>
						) : (
							<div className="flex flex-col gap-4">

								<PlatformUsersStatsSummary data={data}/>
								<div className="relative max-h-[600px] w-full overflow-auto rounded-md border border-border">
									<table className="w-full text-sm">
										<TableHeader>
											<TableHead className={platformTableCornerHeadClass}>
												{t('colUser')}
											</TableHead>
											<TableHead className={platformTableSubHeadClass}>
												{t('colUserId')}
											</TableHead>
											<TableHead className={platformTableSubHeadClass}>
												{t('colOrgId')}
											</TableHead>
											<TableHead className={platformTableSubHeadClass}>
												{t('colSubscription')}
											</TableHead>
											{/* <TableHead className={platformTableSubHeadClass}>
											 {t("colSecurity")}
											 </TableHead> */}
											<TableHead className={platformTableSubHeadClass}>
												{t('colAccountCreated')}
											</TableHead>
										</TableHeader>
										<TableBody>
											{data.map((member) => (
												<PlatformMembershipTableRow
													key={member.id}
													member={member}
													currentUserId={session?.user?.id}
												/>
											))}
										</TableBody>
									</table>
								</div>
							</div>
						)}
					</CardContent>
				</div>
			</Card>
		</div>
	)
}
