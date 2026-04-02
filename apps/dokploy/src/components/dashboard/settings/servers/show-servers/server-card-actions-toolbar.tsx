import { Terminal } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { TerminalModal } from "../../web-server/terminal-modal";
import { ShowServerActions } from "../actions/show-server-actions";
import { HandleServers } from "../handle-servers";
import { SetupServer } from "../setup-server";
import { ServerDeleteDialogButton } from "./server-delete-dialog-button";
import type { ServerListItem } from "./use-show-servers";

interface ServerCardActionsToolbarProps {
	server: ServerListItem;
	isBuildServer: boolean;
	canDeleteServices: boolean;
	canDeletePermission: boolean;
	onRemoveServer: (serverId: string, serverName: string) => Promise<void>;
}

export const ServerCardActionsToolbar = ({
	server,
	isBuildServer,
	canDeleteServices,
	canDeletePermission,
	onRemoveServer,
}: ServerCardActionsToolbarProps) => {
	const t = useTranslations("settingsServers");

	return (
		<div className="mt-auto flex flex-wrap items-center gap-2 border-t pt-3">
			<div className="flex w-full items-center gap-2">
				<Tooltip>
					<TooltipTrigger asChild>
						<div>
							<SetupServer asButton serverId={server.serverId} />
						</div>
					</TooltipTrigger>
					<TooltipContent className="max-w-xs" side="bottom">
						<div className="space-y-1">
							<p className="font-semibold">{t("setupServerTitle")}</p>
							<p className="text-xs text-muted-foreground">
								{t("setupServerDesc")}
							</p>
						</div>
					</TooltipContent>
				</Tooltip>
			</div>

			<TooltipProvider>
				{server.sshKeyId && (
					<Tooltip>
						<TooltipTrigger asChild>
							<div>
								<TerminalModal serverId={server.serverId} asButton={true}>
									<Button variant="outline" size="icon" className="h-9 w-9">
										<Terminal className="h-4 w-4" />
									</Button>
								</TerminalModal>
							</div>
						</TooltipTrigger>
						<TooltipContent>
							<p>{t("terminalTooltip")}</p>
						</TooltipContent>
					</Tooltip>
				)}

				<Tooltip>
					<TooltipTrigger asChild>
						<div>
							<HandleServers serverId={server.serverId} asButton={true} />
						</div>
					</TooltipTrigger>
					<TooltipContent>
						<p>{t("editServerTooltip")}</p>
					</TooltipContent>
				</Tooltip>

				{server.sshKeyId && !isBuildServer && (
					<Tooltip>
						<TooltipTrigger asChild>
							<div>
								<ShowServerActions serverId={server.serverId} asButton={true} />
							</div>
						</TooltipTrigger>
						<TooltipContent>
							<p>{t("serverActionsTooltip")}</p>
						</TooltipContent>
					</Tooltip>
				)}

				<div className="flex-1" />

				{canDeletePermission && (
					<ServerDeleteDialogButton
						canDelete={canDeleteServices}
						serverId={server.serverId}
						serverName={server.name}
						onRemoveServer={onRemoveServer}
					/>
				)}
			</TooltipProvider>
		</div>
	);
};
