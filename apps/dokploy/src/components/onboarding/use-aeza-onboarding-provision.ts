import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "@/utils/api";

export type AezaWizardTariff = "msks-1" | "msks-2" | "msks-3";

export const useAezaOnboardingProvision = (
	onProvisioned: (dokployServerId: string) => void,
) => {
	const onProvisionedRef = useRef(onProvisioned);
	onProvisionedRef.current = onProvisioned;
	const utils = api.useUtils();
	const [provisionId, setProvisionId] = useState<string | null>(null);

	const createMut = api.onboarding.createAezaServer.useMutation({
		onSuccess: (data) => setProvisionId(data.serverId),
		onError: (err) => toast.error(err.message),
	});

	const statusQuery = api.onboarding.getServerStatus.useQuery(
		{ serverId: provisionId ?? "_" },
		{
			enabled: Boolean(provisionId),
			refetchInterval: (q) => {
				const st = q.state.data?.status;
				if (st === "active" || st === "error") return false;
				return 5000;
			},
		},
	);

	useEffect(() => {
		const d = statusQuery.data;
		if (!d || !provisionId) return;
		if (d.status === "active" && d.dokployServerId) {
			void utils.server.withSSHKey.invalidate();
			onProvisionedRef.current(d.dokployServerId);
			setProvisionId(null);
			return;
		}
		if (d.status === "error") {
			toast.error(d.message ?? "Aeza");
			setProvisionId(null);
		}
	}, [statusQuery.data, provisionId, utils.server.withSSHKey]);

	const startWithTariff = useCallback(
		(tariff: AezaWizardTariff) => {
			createMut.mutate({ tariff });
		},
		[createMut],
	);

	return {
		startWithTariff,
		isAezaBusy: Boolean(provisionId) || createMut.isPending,
	};
};
