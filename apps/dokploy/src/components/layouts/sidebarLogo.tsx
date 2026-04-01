import { Bell, ChevronsUpDown, Loader2, Star, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { authClient } from '../../lib/auth-client'
import { cn } from '../../lib/utils'
import { api } from '../../utils/api'
import { AddOrganization } from '../dashboard/organization/handle-organization'
import { DialogAction } from '../shared/dialog-action'
import { Logo } from '../shared/logo'
import { Button } from '../ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '../ui/sidebar'

export function SidebarLogo() {
	const t = useTranslations('sidebar')
	const {state} = useSidebar()
	const {data: isCloud} = api.settings.isCloud.useQuery()
	const {data: user} = api.user.get.useQuery()
	const {data: session} = api.user.session.useQuery()
	const {
		data: organizations,
		refetch,
		isLoading,
	} = api.organization.all.useQuery()
	const {mutateAsync: deleteOrganization, isPending: isRemoving} =
		api.organization.delete.useMutation()
	const {mutateAsync: setDefaultOrganization, isPending: isSettingDefault} =
		api.organization.setDefault.useMutation()
	const {isMobile} = useSidebar()
	const isCollapsed = state === 'collapsed' && !isMobile
	const {data: activeOrganization} = api.organization.active.useQuery()

	const {data: invitations, refetch: refetchInvitations} =
		api.user.getInvitations.useQuery()

	const [_activeTeam, setActiveTeam] = useState<
		typeof activeOrganization | null
	>(null)

	useEffect(() => {
		if (activeOrganization) {
			setActiveTeam(activeOrganization)
		}
	}, [activeOrganization])

	return (
		<>
			{isLoading ? (
				<div className="flex flex-row gap-2 items-center justify-center text-sm text-muted-foreground min-h-[5vh] pt-4">
					<Loader2 className="animate-spin size-4"/>
				</div>
			) : (
				<SidebarMenu
					className={cn(
						'flex gap-2',
						isCollapsed ? 'flex-col' : 'flex-row justify-between items-center',
					)}
				>
					{/* Organization Logo and Selector */}
					<SidebarMenuItem className={'w-full'}>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<SidebarMenuButton
									size={isCollapsed ? 'sm' : 'lg'}
									className={cn(
										'data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground',
										isCollapsed &&
										'flex justify-center items-center p-2 h-10 w-10 mx-auto',
									)}
								>
									<div
										className={cn(
											'flex items-center gap-2',
											isCollapsed && 'justify-center',
										)}
									>
										<div
											className={cn(
												'flex items-center justify-center rounded-sm border',
												'size-6',
											)}
										>
											<Logo
												className={cn(
													'transition-all',
													isCollapsed ? 'size-4' : 'size-5',
												)}
												logoUrl={activeOrganization?.logo || undefined}
											/>
										</div>
										<div
											className={cn(
												'flex flex-col items-start',
												isCollapsed && 'hidden',
											)}
										>
											<p className="text-sm font-medium leading-none">
												{activeOrganization?.name ?? t('selectOrganization')}
											</p>
										</div>
									</div>
									<ChevronsUpDown
										className={cn('ml-auto', isCollapsed && 'hidden')}
									/>
								</SidebarMenuButton>
							</DropdownMenuTrigger>
							<DropdownMenuContent
								className="rounded-lg max-h-[min(70vh,28rem)] flex flex-col"
								align="start"
								side={isMobile ? 'bottom' : 'right'}
								sideOffset={4}
							>
								<DropdownMenuLabel className="text-xs text-muted-foreground shrink-0">
									{t('organizationsHeading')}
								</DropdownMenuLabel>
								<div className="overflow-y-auto overflow-x-hidden min-h-0 -mx-1 px-1">
									{organizations?.map((org) => {
										const isDefault = org.members?.[0]?.isDefault ?? false
										return (
											<div
												className="flex flex-row justify-between"
												key={org.name}
											>
												<DropdownMenuItem
													onClick={async () => {
														await authClient.organization.setActive({
															organizationId: org.id,
														})
														window.location.reload()
													}}
													className="w-full gap-2 p-2"
												>
													<div className="flex flex-col gap-1">
														<div className="flex items-center gap-2">
															{org.name}
														</div>
													</div>
													<div className="flex size-6 items-center justify-center rounded-sm border">
														<Logo
															className={cn(
																'transition-all',
																state === 'collapsed' ? 'size-6' : 'size-10',
															)}
															logoUrl={org.logo ?? undefined}
														/>
													</div>
												</DropdownMenuItem>

												<div className="flex items-center gap-2">
													<Button
														variant="ghost"
														size="icon"
														className={cn(
															'group',
															isDefault
																? 'hover:bg-yellow-500/10'
																: 'hover:bg-blue-500/10',
														)}
														isLoading={isSettingDefault && !isDefault}
														disabled={isDefault}
														onClick={async (e) => {
															if (isDefault) return
															e.stopPropagation()
															await setDefaultOrganization({
																organizationId: org.id,
															})
																.then(() => {
																	refetch()
																	toast.success(t('toastDefaultOrgUpdated'))
																})
																.catch((error) => {
																	toast.error(
																		error?.message || t('toastDefaultOrgError'),
																	)
																})
														}}
														title={
															isDefault
																? t('tooltipDefaultOrg')
																: t('tooltipSetAsDefault')
														}
													>
														{isDefault ? (
															<Star
																fill="#eab308"
																stroke="#eab308"
																className="size-4 text-yellow-500"
															/>
														) : (
															<Star
																fill="none"
																stroke="currentColor"
																className="size-4 text-gray-400 group-hover:text-blue-500 transition-colors"
															/>
														)}
													</Button>
													{org.ownerId === session?.user?.id && (
														<>
															<AddOrganization organizationId={org.id}/>
															<DialogAction
																title={t('deleteOrgTitle')}
																description={t('deleteOrgDescription')}
																type="destructive"
																onClick={async () => {
																	await deleteOrganization({
																		organizationId: org.id,
																	})
																		.then(() => {
																			refetch()
																			toast.success(t('toastOrgDeleted'))
																		})
																		.catch((error) => {
																			toast.error(
																				error?.message ||
																				t('toastOrgDeleteError'),
																			)
																		})
																}}
															>
																<Button
																	variant="ghost"
																	size="icon"
																	className="group hover:bg-red-500/10"
																	isLoading={isRemoving}
																>
																	<Trash2 className="size-4 text-primary group-hover:text-red-500"/>
																</Button>
															</DialogAction>
														</>
													)}
												</div>
											</div>
										)
									})}
								</div>
								{(user?.role === 'owner' ||
									user?.role === 'admin' ||
									isCloud) && (
									<>
										<DropdownMenuSeparator/>
										<AddOrganization/>
									</>
								)}
							</DropdownMenuContent>
						</DropdownMenu>
					</SidebarMenuItem>

					{/* Notification Bell */}
					<SidebarMenuItem className={cn(isCollapsed && 'mt-2')}>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									className={cn(
										'relative',
										isCollapsed && 'h-8 w-8 p-1.5 mx-auto',
									)}
								>
									<Bell className="size-4"/>
									{invitations && invitations.length > 0 && (
										<span
											className="absolute -top-0 -right-0 flex size-4 items-center justify-center rounded-full bg-blue-500 text-xs text-white">
											{invitations.length}
										</span>
									)}
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent
								align="start"
								side={'right'}
								className="w-80"
							>
								<DropdownMenuLabel>{t('pendingInvitations')}</DropdownMenuLabel>
								<div className="flex flex-col gap-2">
									{invitations && invitations.length > 0 ? (
										invitations.map((invitation) => (
											<div key={invitation.id} className="flex flex-col gap-2">
												<DropdownMenuItem
													className="flex flex-col items-start gap-1 p-3"
													onSelect={(e) => e.preventDefault()}
												>
													<div className="font-medium">
														{invitation?.organization?.name}
													</div>
													<div className="text-xs text-muted-foreground">
														{t('expiresLabel')}:{' '}
														{new Date(invitation.expiresAt).toLocaleString()}
													</div>
													<div className="text-xs text-muted-foreground">
														{t('roleLabel')}: {invitation.role}
													</div>
												</DropdownMenuItem>
												<DialogAction
													title={t('acceptInvitationTitle')}
													description={t('acceptInvitationDescription')}
													type="default"
													onClick={async () => {
														const {error} =
															await authClient.organization.acceptInvitation({
																invitationId: invitation.id,
															})

														if (error) {
															toast.error(
																error.message || t('toastAcceptInviteError'),
															)
														} else {
															toast.success(t('toastAcceptInviteSuccess'))
															await refetchInvitations()
															await refetch()
														}
													}}
												>
													<Button size="sm" variant="secondary">
														{t('acceptInvitationButton')}
													</Button>
												</DialogAction>
											</div>
										))
									) : (
										<DropdownMenuItem disabled>
											{t('noPendingInvitations')}
										</DropdownMenuItem>
									)}
								</div>
							</DropdownMenuContent>
						</DropdownMenu>
					</SidebarMenuItem>
				</SidebarMenu>
			)}
		</>
	)
}
