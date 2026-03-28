"use client";

import { ChevronsUpDown } from "lucide-react";
import { useRouter } from "next/router";
import { useTranslations } from "next-intl";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenuButton, useSidebar } from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { api } from "@/utils/api";

type Props = {
	className?: string;
};

type TranslateFn = ReturnType<typeof useTranslations<"sidebar">>;

const toPlanLabel = (t: TranslateFn, raw: string): string => {
	switch (raw) {
		case "free":
			return t("plan.free");
		case "pro":
			return t("plan.pro");
		case "agency":
			return t("plan.agency");
		default:
			return t("plan.unknown", { plan: raw });
	}
};

export const SidebarUserCard = ({ className }: Props) => {
	const tSidebar = useTranslations("sidebar");
	const t = useTranslations();
	const router = useRouter();
	const { isMobile, state } = useSidebar();
	const isCollapsed = state === "collapsed" && !isMobile;

	const { data: user } = api.user.get.useQuery();
	const { data: subscription } = api.billing.getSubscription.useQuery();

	const email = user?.user?.email ?? "";
	const avatarLetter = (email.trim().at(0) ?? "?").toUpperCase();
	const plan = subscription?.status === "active" ? subscription.plan : "free";
	const planLabel = toPlanLabel(tSidebar, plan);

	const handleOpenProfile = () => {
		void router.push("/dashboard/settings/profile");
	};

	const handleLogout = () => {
		void authClient.signOut().then(() => {
			void router.push("/");
		});
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<SidebarMenuButton
					size="lg"
					className={cn(
						"data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground",
						className,
					)}
				>
					<Avatar className="h-8 w-8 rounded-lg">
						<AvatarFallback className="rounded-lg">{avatarLetter}</AvatarFallback>
					</Avatar>
					<div className="grid flex-1 text-left text-sm leading-tight">
						<span className="truncate font-medium">{email}</span>
						<span className="truncate text-xs text-muted-foreground">
							{planLabel}
						</span>
					</div>
					<ChevronsUpDown
						className={cn("ml-auto size-4 shrink-0", isCollapsed && "hidden")}
					/>
				</SidebarMenuButton>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
				side={isMobile ? "bottom" : "top"}
				align="start"
				sideOffset={4}
			>
				<DropdownMenuItem className="cursor-pointer" onSelect={handleOpenProfile}>
					{t("dashboard.settings.profile")}
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem className="cursor-pointer" onSelect={handleLogout}>
					{t("auth.logout")}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};
