import { useCallback } from 'react'
import { format } from 'date-fns'
import copy from 'copy-to-clipboard'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { PlatformUserSubscriptionCell } from '@/components/dashboard/settings/users/platform-user-subscription-cell'
import { TableCell, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { RouterOutputs } from '@/utils/api'

const ID_PREVIEW_PREFIX = 8
const ID_PREVIEW_SUFFIX = 4

const truncateId = (id: string) =>
	id.length <= ID_PREVIEW_PREFIX + ID_PREVIEW_SUFFIX + 1
		? id
		: `${id.slice(0, ID_PREVIEW_PREFIX)}…${id.slice(-ID_PREVIEW_SUFFIX)}`

const displayUserName = (firstName: string, lastName: string) => {
	const full = `${firstName} ${lastName}`.trim()
	return full.length > 0 ? full : '—'
}

export type PlatformMembershipRow = RouterOutputs['user']['allUsers'][number];

interface PlatformMembershipTableRowProps {
	member: PlatformMembershipRow;
	currentUserId?: string;
}

export const PlatformMembershipTableRow = ({
	member,
	currentUserId,
}: PlatformMembershipTableRowProps) => {
	const t = useTranslations('settingsUsers')
	const {user} = member
	const isYou = user.id === currentUserId

	const idCellClass = 'min-w-36 align-top p-4'
	const mutedTextClass = 'text-sm text-muted-foreground'
	const copyIdTriggerClass = cn(
		'w-full cursor-pointer rounded-sm px-1 py-0.5 text-left font-mono text-xs break-all transition-colors',
		'hover:bg-muted/80 hover:text-foreground',
		'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
	)

	const handleCopyUserId = useCallback(() => {
		if (copy(user.id)) {
			toast.success(t('copyIdSuccess'))
		} else {
			toast.error(t('copyIdError'))
		}
	}, [user.id, t])

	const handleCopyOrganizationId = useCallback(() => {
		if (copy(member.organizationId)) {
			toast.success(t('copyIdSuccess'))
		} else {
			toast.error(t('copyIdError'))
		}
	}, [member.organizationId, t])

	return (
		<TableRow className="group">
			<TableCell
				className={cn(
					'sticky left-0 z-10 min-w-48 border-r border-border bg-background align-top p-4',
					'group-hover:bg-muted/50',
				)}
			>
				<div className="flex flex-col gap-0.5">
          <span className="font-medium">
            {displayUserName(user.firstName, user.lastName)}
						{isYou && (
							<span className="text-muted-foreground font-normal">
                {' '}
								{t('youLabel')}
              </span>
						)}
          </span>
					<span className={mutedTextClass}>{user.email}</span>
				</div>
			</TableCell>
			<TableCell className={idCellClass}>
				<button
					type="button"
					className={copyIdTriggerClass}
					title={t('copyIdHint')}
					onClick={handleCopyUserId}
				>
					{truncateId(user.id)}
				</button>
			</TableCell>
			<TableCell className={idCellClass}>
				<button
					type="button"
					className={copyIdTriggerClass}
					title={t('copyIdHint')}
					onClick={handleCopyOrganizationId}
				>
					{truncateId(member.organizationId)}
				</button>
			</TableCell>

			<PlatformUserSubscriptionCell
				targetUserId={user.id}
				userEmail={user.email}
				subscription={user.subscription}
			/>
			{/* <TableCell className="min-w-52 align-top p-4">
			 <div className="flex flex-wrap gap-1">
			 <Badge variant={user.emailVerified ? "secondary" : "outline"}>
			 {user.emailVerified ? t("emailVerifiedYes") : t("emailVerifiedNo")}
			 </Badge>
			 <Badge variant="outline">
			 {user.twoFactorEnabled ? t("twoFaEnabled") : t("twoFaDisabled")}
			 </Badge>
			 {user.banned ? (
			 <Badge variant="destructive" title={user.banReason ?? undefined}>
			 {t("bannedYes")}
			 </Badge>
			 ) : null}
			 {user.isValidEnterpriseLicense ? (
			 <Badge variant="outline">{t("enterpriseYes")}</Badge>
			 ) : null}
			 {user.enablePaidFeatures ? (
			 <Badge variant="outline">{t("paidYes")}</Badge>
			 ) : null}
			 {!user.isRegistered ? (
			 <Badge variant="outline">{t("registrationIncomplete")}</Badge>
			 ) : null}
			 </div>
			 </TableCell> */}

			<TableCell
				className={cn('align-top whitespace-nowrap p-4', mutedTextClass)}
			>
				{user.createdAt
					? format(new Date(user.createdAt), 'PPp')
					: format(new Date(user.createdAt2), 'PPp')}
			</TableCell>
		</TableRow>
	)
}
