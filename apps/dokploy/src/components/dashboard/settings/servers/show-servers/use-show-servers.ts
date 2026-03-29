import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { toast } from "sonner";
import { api, type RouterOutputs } from "@/utils/api";

export type ServerListItem = RouterOutputs["server"]["all"][number];

export const useShowServers = () => {
	const t = useTranslations("settingsServers");
	const { data, refetch, isPending } = api.server.all.useQuery();
	const { mutateAsync } = api.server.remove.useMutation();
	const { data: sshKeys } = api.sshKey.all.useQuery();
	const { data: isCloud } = api.settings.isCloud.useQuery();
	const { data: permissions } = api.user.getPermissions.useQuery();

	const removeServer = useCallback(
		async (serverId: string, serverName: string) => {
			try {
				await mutateAsync({ serverId });
				await refetch();
				toast.success(t("deletedSuccess", { name: serverName }));
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				toast.error(message);
			}
		},
		[mutateAsync, refetch, t],
	);

	return {
		servers: data,
		isPending,
		sshKeys,
		isCloud,
		permissions,
		removeServer,
	};
};
