import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ServerListItem } from "./use-show-servers";

interface ServerCardStatusBadgesProps {
	server: ServerListItem;
	isCloud: boolean;
	isBuildServer: boolean;
}

export const ServerCardStatusBadges = ({
	server,
	isCloud,
	isBuildServer,
}: ServerCardStatusBadgesProps) => {
	const t = useTranslations("settingsServers");

	return (
		<TooltipProvider>
			<div className="mt-2 flex flex-wrap gap-2">
				{isCloud && (
					<>
						{server.serverStatus === "active" ? (
							<Badge variant="default">{server.serverStatus}</Badge>
						) : (
							<Tooltip delayDuration={0}>
								<TooltipTrigger asChild>
									<span className="inline-block">
										<Badge variant="destructive" className="cursor-help">
											{server.serverStatus}
										</Badge>
									</span>
								</TooltipTrigger>
								<TooltipContent className="max-w-xs" side="bottom">
									<p className="text-sm">{t("serverDeactivated")}</p>
								</TooltipContent>
							</Tooltip>
						)}
					</>
				)}
				<Badge variant={isBuildServer ? "secondary" : "default"}>
					{server.serverType}
				</Badge>
			</div>
		</TooltipProvider>
	);
};
