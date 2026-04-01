'use client'
import { Badge } from '@/components/ui/badge'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList } from '@/components/ui/breadcrumb'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Separator } from '@/components/ui/separator'
import {
	Sidebar,
	SIDEBAR_COOKIE_NAME,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarInset,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	SidebarProvider,
	SidebarRail,
	SidebarSeparator,
	SidebarTrigger,
} from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'
import { api } from '@/utils/api'
import { ChevronRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { TimeBadge } from '../ui/time-badge'
import { createMenuForAuthUser, HelpMenuItem, NavItem, SingleNavItem } from './MENU'
import { SidebarUserCard } from './sidebar-user-card'
import { SidebarLogo } from './sidebarLogo'
import { UpdateServerButton } from './update-server'

/**
 * Determines if an item url is active based on the current pathname
 * @returns true if the item url is active, false otherwise
 */
function isActiveRoute(opts: {
	/** The url of the item. Usually obtained from `item.url` */
	itemUrl: string;
	/** The current pathname. Usually obtained from `usePathname()` */
	pathname: string;
}): boolean {
	const normalizedItemUrl = opts.itemUrl?.replace('/projects', '/project')
	const normalizedPathname = opts.pathname?.replace('/projects', '/project')

	if (!normalizedPathname) return false

	if (normalizedPathname === normalizedItemUrl) return true

	if (normalizedPathname.startsWith(normalizedItemUrl)) {
		const nextChar = normalizedPathname.charAt(normalizedItemUrl.length)
		return nextChar === '/'
	}

	return false
}

/**
 * Finds the active nav item based on the current pathname
 * @returns the active nav item with `SingleNavItem` type or undefined if none is active
 */
function findActiveNavItem(
	navItems: NavItem[],
	pathname: string,
): SingleNavItem | undefined {
	const found = navItems.find((item) =>
		item.isSingle !== false
			? // The current item is single, so check if the item url is active
			isActiveRoute({itemUrl: item.url, pathname})
			: // The current item is not single, so check if any of the sub items are active
			item.items.some((item) =>
				isActiveRoute({itemUrl: item.url, pathname}),
			),
	)

	if (found?.isSingle !== false) {
		// The found item is single, so return it
		return found
	}

	// The found item is not single, so find the active sub item
	return found?.items.find((item) =>
		isActiveRoute({itemUrl: item.url, pathname}),
	)
}

function internalHelpItemsAsNavItems(
	helpList: HelpMenuItem[],
): SingleNavItem[] {
	return helpList
		.filter(
			(item): item is Extract<HelpMenuItem, { behavior: 'internal' }> =>
				item.behavior === 'internal',
		)
		.map((item) => ({
			isSingle: true as const,
			title: item.name,
			url: item.url,
			icon: item.icon,
		}))
}

interface Props {
	children: React.ReactNode;
}

function LogoWrapper() {
	return <SidebarLogo/>
}

export default function Page({children}: Props) {
	const t = useTranslations()
	const [defaultOpen, setDefaultOpen] = useState<boolean | undefined>(
		undefined,
	)
	const [isLoaded, setIsLoaded] = useState(false)

	useEffect(() => {
		const cookieValue = document.cookie
			.split('; ')
			.find((row) => row.startsWith(`${SIDEBAR_COOKIE_NAME}=`))
			?.split('=')[1]

		setDefaultOpen(cookieValue === undefined ? true : cookieValue === 'true')
		setIsLoaded(true)
	}, [])

	const pathname = usePathname()
	const {data: auth} = api.user.get.useQuery()
	const {data: permissions} = api.user.getPermissions.useQuery()
	const {data: dokployVersion} = api.settings.getDokployVersion.useQuery()
	const {data: subscription} = api.billing.getSubscription.useQuery()
	const {data: whitelabeling} = api.whitelabeling.get.useQuery(undefined, {
		staleTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false,
	})

	const includesProjects = pathname?.includes('/dashboard/project')
	const {data: isCloud} = api.settings.isCloud.useQuery()
	const subscriptionPlan =
		subscription?.status === 'active' ? subscription.plan : 'free'
	const isFreePlan = subscriptionPlan === 'free'

	const {
		home: filteredHome,
		settings: filteredSettings,
		help,
	} = createMenuForAuthUser({
		auth,
		permissions,
		isCloud: !!isCloud,
		whitelabeling,
	})

	const activeItem = findActiveNavItem(
		[
			...filteredHome,
			...filteredSettings,
			...internalHelpItemsAsNavItems(help),
		],
		pathname,
	)

	if (!isLoaded) {
		return <div className="w-full h-screen bg-background"/> // Placeholder mientras se carga
	}

	return (
		<SidebarProvider
			defaultOpen={defaultOpen}
			open={defaultOpen}
			onOpenChange={(open) => {
				setDefaultOpen(open)

				// biome-ignore lint/suspicious/noDocumentCookie: this sets the cookie to keep the sidebar state.
				document.cookie = `${SIDEBAR_COOKIE_NAME}=${open}`
			}}
			style={
				{
					'--sidebar-width': '19.5rem',
					'--sidebar-width-mobile': '19.5rem',
				} as React.CSSProperties
			}
		>
			<Sidebar collapsible="icon" variant="floating">
				<SidebarHeader>
					{/* <SidebarMenuButton
					 className="group-data-[collapsible=icon]:!p-0"
					 size="lg"
					 > */}
					<LogoWrapper/>
					{/* </SidebarMenuButton> */}
				</SidebarHeader>
				<SidebarContent>
					<SidebarGroup>
						<SidebarMenu>
							{filteredHome.map((item) => {
								const isSingle = item.isSingle !== false
								const isActive = isSingle
									? isActiveRoute({itemUrl: item.url, pathname})
									: item.items.some((item) =>
										isActiveRoute({itemUrl: item.url, pathname}),
									)

								return (
									<Collapsible
										key={item.title}
										asChild
										defaultOpen={isActive}
										className="group/collapsible"
									>
										<SidebarMenuItem>
											{isSingle ? (
												<SidebarMenuButton
													asChild
													tooltip={t(item.title)}
													className={cn(isActive && 'bg-border')}
												>
													<Link
														href={item.url}
														className="flex w-full items-center gap-2"
													>
														{item.icon && (
															<item.icon
																className={cn(isActive && 'text-primary')}
															/>
														)}
														<span>{t(item.title)}</span>
													</Link>
												</SidebarMenuButton>
											) : (
												<>
													<CollapsibleTrigger asChild>
														<SidebarMenuButton
															tooltip={t(item.title)}
															isActive={isActive}
														>
															{item.icon && <item.icon/>}

															<span>{t(item.title)}</span>
															{item.items?.length && (
																<ChevronRight
																	className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"/>
															)}
														</SidebarMenuButton>
													</CollapsibleTrigger>
													<CollapsibleContent>
														<SidebarMenuSub>
															{item.items?.map((subItem) => (
																<SidebarMenuSubItem key={subItem.title}>
																	<SidebarMenuSubButton
																		asChild
																		className={cn(isActive && 'bg-border')}
																	>
																		<Link
																			href={subItem.url}
																			className="flex w-full items-center"
																		>
																			{subItem.icon && (
																				<span className="mr-2">
																					<subItem.icon
																						className={cn(
																							'h-4 w-4 text-muted-foreground',
																							isActive && 'text-primary',
																						)}
																					/>
																				</span>
																			)}
																			<span>{t(subItem.title)}</span>
																		</Link>
																	</SidebarMenuSubButton>
																</SidebarMenuSubItem>
															))}
														</SidebarMenuSub>
													</CollapsibleContent>
												</>
											)}
										</SidebarMenuItem>
									</Collapsible>
								)
							})}
						</SidebarMenu>
					</SidebarGroup>
					<SidebarSeparator/>
					<SidebarGroup>
						<SidebarGroupLabel>{t('common.settings')}</SidebarGroupLabel>
						<SidebarMenu className="gap-1">
							{filteredSettings.map((item) => {
								const isSingle = item.isSingle !== false
								const itemUrl = isSingle ? item.url : null
								const isActive = isSingle
									? isActiveRoute({itemUrl: itemUrl ?? '', pathname})
									: item.items.some((item) =>
										isActiveRoute({itemUrl: item.url, pathname}),
									)
								const showUpgrade =
									isFreePlan && itemUrl === '/dashboard/settings/billing'

								return (
									<Collapsible
										key={item.title}
										asChild
										defaultOpen={isActive}
										className="group/collapsible"
									>
										<SidebarMenuItem className={cn(showUpgrade && 'relative')}>
											{isSingle ? (
												<>
													<SidebarMenuButton
														asChild
														tooltip={t(item.title)}
														className={cn(isActive && 'bg-border')}
													>
														<Link
															href={item.url}
															className="flex w-full items-center gap-2"
														>
															{item.icon && (
																<item.icon
																	className={cn(isActive && 'text-primary')}
																/>
															)}
															<span>{t(item.title)}</span>
														</Link>
													</SidebarMenuButton>
													{showUpgrade && (
														<Link
															href="/dashboard/settings/billing"
															className="absolute right-2 top-1/2 -translate-y-1/2"
														>
															<Badge variant="green">↑ Upgrade</Badge>
														</Link>
													)}
												</>
											) : (
												<>
													<CollapsibleTrigger asChild>
														<SidebarMenuButton
															tooltip={t(item.title)}
															isActive={isActive}
														>
															{item.icon && <item.icon/>}

															<span>{t(item.title)}</span>
															{item.items?.length && (
																<ChevronRight
																	className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"/>
															)}
														</SidebarMenuButton>
													</CollapsibleTrigger>
													<CollapsibleContent>
														<SidebarMenuSub>
															{item.items?.map((subItem) => (
																<SidebarMenuSubItem key={subItem.title}>
																	<SidebarMenuSubButton
																		asChild
																		className={cn(isActive && 'bg-border')}
																	>
																		<Link
																			href={subItem.url}
																			className="flex w-full items-center"
																		>
																			{subItem.icon && (
																				<span className="mr-2">
																					<subItem.icon
																						className={cn(
																							'h-4 w-4 text-muted-foreground',
																							isActive && 'text-primary',
																						)}
																					/>
																				</span>
																			)}
																			<span>{t(subItem.title)}</span>
																		</Link>
																	</SidebarMenuSubButton>
																</SidebarMenuSubItem>
															))}
														</SidebarMenuSub>
													</CollapsibleContent>
												</>
											)}
										</SidebarMenuItem>
									</Collapsible>
								)
							})}
						</SidebarMenu>
					</SidebarGroup>
					<SidebarSeparator/>
					<SidebarGroup className="group-data-[collapsible=icon]:hidden">
						<SidebarGroupLabel>{t('common.help')}</SidebarGroupLabel>
						<SidebarMenu>
							{help.map((item) =>
								item.behavior === 'external' ? (
									<SidebarMenuItem key={item.name}>
										<SidebarMenuButton asChild>
											<a
												href={item.url}
												target="_blank"
												rel="noopener noreferrer"
												className="flex w-full items-center gap-2"
											>
												<span className="mr-2">
													<item.icon className="h-4 w-4"/>
												</span>
												<span>{t(item.name)}</span>
											</a>
										</SidebarMenuButton>
									</SidebarMenuItem>
								) : (
									<SidebarMenuItem key={item.name}>
										<SidebarMenuButton asChild>
											<Link
												href={item.url}
												className="flex w-full items-center gap-2"
											>
												<span className="mr-2">
													<item.icon className="h-4 w-4"/>
												</span>
												<span>{t(item.name)}</span>
											</Link>
										</SidebarMenuButton>
									</SidebarMenuItem>
								),
							)}
						</SidebarMenu>
					</SidebarGroup>
				</SidebarContent>
				<SidebarFooter>
					<SidebarMenu className="flex flex-col gap-2">
						{!isCloud && permissions?.organization.update && (
							<SidebarMenuItem>
								<UpdateServerButton/>
							</SidebarMenuItem>
						)}
						<SidebarMenuItem>
							<SidebarUserCard/>
						</SidebarMenuItem>
						{whitelabeling?.footerText && (
							<div className="px-3 text-xs text-muted-foreground text-center group-data-[collapsible=icon]:hidden">
								{whitelabeling.footerText}
							</div>
						)}
						{/* {dokployVersion && (
						 <div className="px-3 text-xs text-muted-foreground text-center group-data-[collapsible=icon]:hidden">
						 Version {dokployVersion}
						 </div>
						 )} */}
					</SidebarMenu>
				</SidebarFooter>
				<SidebarRail/>
			</Sidebar>
			<SidebarInset>
				{!includesProjects && (
					<header
						className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
						<div className="flex items-center justify-between w-full px-4">
							<div className="flex items-center gap-2">
								<SidebarTrigger className="-ml-1"/>
								<Separator orientation="vertical" className="mr-2 h-4"/>
								<Breadcrumb>
									<BreadcrumbList>
										<BreadcrumbItem className="block">
											<BreadcrumbLink asChild>
												<Link
													href={activeItem?.url || '/'}
													className="flex items-center gap-1.5"
												>
													{activeItem ? t(activeItem.title) : null}
												</Link>
											</BreadcrumbLink>
										</BreadcrumbItem>
									</BreadcrumbList>
								</Breadcrumb>
							</div>
							{!isCloud && <TimeBadge/>}
						</div>
					</header>
				)}

				<div className="flex flex-1 flex-col w-full p-4 pt-0">{children}</div>
			</SidebarInset>
		</SidebarProvider>
	)
}
