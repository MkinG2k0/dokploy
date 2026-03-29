import { ServerIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ServerCardActionsToolbar } from "./server-card-actions-toolbar";
import { ServerCardAdvancedMenu } from "./server-card-advanced-menu";
import { ServerCardDetailRows } from "./server-card-detail-rows";
import { ServerCardStatusBadges } from "./server-card-status-badges";
import { ServerDeleteDialogButton } from "./server-delete-dialog-button";
import { ServerPlanLockedOverlay } from "./server-plan-locked-overlay";
import type { ServerListItem } from "./use-show-servers";

interface ServerCardProps {
	server: ServerListItem;
	isCloud: boolean;
	canDeletePermission: boolean;
	onRemoveServer: (serverId: string, serverName: string) => Promise<void>;
}

export const ServerCard = ({
	server,
	isCloud,
	canDeletePermission,
	onRemoveServer,
}: ServerCardProps) => {
	const t = useTranslations("settingsServers");
	const canDeleteServices = server.totalSum === 0;
	const isActive = server.serverStatus === "active";
	const isBuildServer = server.serverType === "build";
	const cardLocked = Boolean(isCloud && server.planAccessBlocked);

	return (
		<Card className="relative flex flex-col overflow-hidden bg-transparent transition-shadow hover:shadow-lg">
			<div className="relative flex min-h-0 flex-1 flex-col">
				<CardHeader className={cn("pb-3", cardLocked && "opacity-70")}>
					<div className="flex items-start justify-between">
						<div className="flex items-center gap-2">
							<ServerIcon className="size-5 text-muted-foreground" />
							<CardTitle className="text-lg">{server.name}</CardTitle>
						</div>
						{isActive && server.sshKeyId && !isBuildServer && !cardLocked && (
							<ServerCardAdvancedMenu server={server} isCloud={isCloud} />
						)}
					</div>
					<ServerCardStatusBadges
						server={server}
						isCloud={isCloud}
						isBuildServer={isBuildServer}
					/>
				</CardHeader>
				<CardContent
					className={cn(
						"flex flex-1 flex-col space-y-3",
						cardLocked && "opacity-70",
					)}
				>
					<ServerCardDetailRows server={server} />

					{isActive && !cardLocked && (
						<ServerCardActionsToolbar
							server={server}
							isBuildServer={isBuildServer}
							canDeleteServices={canDeleteServices}
							canDeletePermission={canDeletePermission}
							onRemoveServer={onRemoveServer}
						/>
					)}
				</CardContent>
				{cardLocked && (
					<ServerPlanLockedOverlay
						ctaLabel={t("planLockedCta")}
						hintLabel={t("planLockedHint")}
					/>
				)}
				{isActive && cardLocked && canDeletePermission && (
					<CardContent className="relative z-20 mt-auto border-t-0 pt-0">
						<div className="flex flex-wrap items-center gap-2 border-t pt-3">
							<TooltipProvider>
								<ServerDeleteDialogButton
									canDelete={canDeleteServices}
									serverId={server.serverId}
									serverName={server.name}
									onRemoveServer={onRemoveServer}
								/>
							</TooltipProvider>
						</div>
					</CardContent>
				)}
			</div>
		</Card>
	);
};
