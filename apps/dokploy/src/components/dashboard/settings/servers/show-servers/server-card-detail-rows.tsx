import { format } from "date-fns";
import { Clock, Key, Network, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { ServerListItem } from "./use-show-servers";

interface ServerCardDetailRowsProps {
	server: ServerListItem;
}

export const ServerCardDetailRows = ({ server }: ServerCardDetailRowsProps) => {
	const t = useTranslations("settingsServers");

	return (
		<>
			<div className="flex items-center gap-2 text-sm">
				<Network className="size-4 text-muted-foreground" />
				<span className="text-muted-foreground">{t("ipLabel")}</span>
				<Badge variant="outline">{server.ipAddress}</Badge>
				<span className="text-muted-foreground">{t("portLabel")}</span>
				<span className="font-medium">{server.port}</span>
			</div>
			<div className="flex items-center gap-2 text-sm">
				<User className="size-4 text-muted-foreground" />
				<span className="text-muted-foreground">{t("userLabel")}</span>
				<span className="font-medium">{server.username}</span>
			</div>
			<div className="flex items-center gap-2 text-sm">
				<Key className="size-4 text-muted-foreground" />
				<span className="text-muted-foreground">{t("sshKeyLabel")}</span>
				<span className="font-medium">
					{server.sshKeyId ? t("sshKeyYes") : t("sshKeyNo")}
				</span>
			</div>
			<div className="flex items-center gap-2 text-sm pt-2 border-t">
				<Clock className="size-4 text-muted-foreground" />
				<span className="text-xs text-muted-foreground">
					{t("createdLabel")} {format(new Date(server.createdAt), "PPp")}
				</span>
			</div>
		</>
	);
};
