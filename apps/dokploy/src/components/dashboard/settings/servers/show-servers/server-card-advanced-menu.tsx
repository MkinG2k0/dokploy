import { MoreHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ShowNodesModal } from "../../cluster/nodes/show-nodes-modal";
import { ShowDockerContainersModal } from "../show-docker-containers-modal";
import { ShowMonitoringModal } from "../show-monitoring-modal";
import { ShowSchedulesModal } from "../show-schedules-modal";
import { ShowSwarmOverviewModal } from "../show-swarm-overview-modal";
import { ShowTraefikFileSystemModal } from "../show-traefik-file-system-modal";
import type { ServerListItem } from "./use-show-servers";

interface ServerCardAdvancedMenuProps {
	server: ServerListItem;
	isCloud: boolean;
}

export const ServerCardAdvancedMenu = ({
	server,
	isCloud,
}: ServerCardAdvancedMenuProps) => {
	const t = useTranslations("settingsServers");

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" className="h-8 w-8 p-0">
					<span className="sr-only">{t("moreOptions")}</span>
					<MoreHorizontal className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuLabel>{t("advancedMenu")}</DropdownMenuLabel>
				<ShowTraefikFileSystemModal serverId={server.serverId} />
				<ShowDockerContainersModal serverId={server.serverId} />
				{isCloud && (
					<ShowMonitoringModal
						url={`http://${server.ipAddress}:${server?.metricsConfig?.server?.port}/metrics`}
						token={server?.metricsConfig?.server?.token}
					/>
				)}
				<ShowSwarmOverviewModal serverId={server.serverId} />
				<ShowNodesModal serverId={server.serverId} />
				<ShowSchedulesModal serverId={server.serverId} />
			</DropdownMenuContent>
		</DropdownMenu>
	);
};
