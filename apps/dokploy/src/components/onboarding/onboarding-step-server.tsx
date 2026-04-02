import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { toast } from "sonner";
import { HandleServers } from "@/components/dashboard/settings/servers/handle-servers";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { api } from "@/utils/api";
import { OnboardingAezaPlanCards } from "./onboarding-aeza-plan-cards";
import type { OnboardingDraft } from "./onboarding-draft-types";
import { OnboardingTestServerCard } from "./onboarding-test-server-card";
import { useAezaOnboardingProvision } from "./use-aeza-onboarding-provision";

const TEST_SERVER_NAME = "Тестовый сервер";

interface OnboardingStepServerProps {
	draft: OnboardingDraft;
	onChange: (patch: Partial<OnboardingDraft>) => void;
	onServerReady?: () => void;
}

export const OnboardingStepServer = ({
	draft,
	onChange,
	onServerReady,
}: OnboardingStepServerProps) => {
	const t = useTranslations("onboardingWizard");
	const utils = api.useUtils();
	const { data: ctx } = api.onboarding.getContext.useQuery();
	const { data: servers = [] } = api.server.withSSHKey.useQuery();

	const createTestServer = api.onboarding.createTestServer.useMutation({
		onSuccess: (data) => {
			void utils.server.withSSHKey.invalidate();
			onChange({
				serverId: data.serverId,
				testServerMode: true,
			});
			onServerReady?.();
		},
		onError: (err) => {
			const msg =
				typeof err.message === "string" && err.message.length > 0
					? err.message
					: t("testServerErrorToast");
			toast.error(msg);
		},
	});

	const handleTestServerContinue = useCallback(() => {
		createTestServer.mutate();
	}, [createTestServer]);

	const isTestServerRow = useCallback(
		(s: (typeof servers)[number]) =>
			s.provisionSource === "test" || s.name === TEST_SERVER_NAME,
		[],
	);

	const handleAezaProvisioned = useCallback(
		(serverId: string) => {
			onChange({ serverId, testServerMode: false });
			onServerReady?.();
		},
		[onChange, onServerReady],
	);

	const { startWithTariff, isAezaBusy } = useAezaOnboardingProvision(
		handleAezaProvisioned,
	);

	const handleServerSelect = useCallback(
		(value: string) => {
			const row = servers.find((s) => s.serverId === value);
			const isTest = row ? isTestServerRow(row) : false;
			onChange({
				serverId: value,
				testServerMode: isTest,
			});
			if (isTest) {
				onServerReady?.();
			}
		},
		[servers, onChange, onServerReady, isTestServerRow],
	);

	const handleVpsCreated = useCallback(
		(serverId: string) => {
			onChange({ serverId, testServerMode: false });
			onServerReady?.();
		},
		[onChange, onServerReady],
	);

	return (
		<div className="space-y-6">
			<div>
				<h2 className="font-mono text-base font-semibold">
					{t("welcomeServerTitle")}
				</h2>
				<p className="text-muted-foreground mt-1 text-sm">
					{t("freeServerHint")}
				</p>
			</div>

			<OnboardingTestServerCard
				isBusy={createTestServer.isPending}
				onContinue={handleTestServerContinue}
			/>

			<div className="space-y-2">
				<Label>{t("stepServer")}</Label>
				<Select value={draft.serverId ?? ""} onValueChange={handleServerSelect}>
					<SelectTrigger>
						<SelectValue placeholder="…" />
					</SelectTrigger>
					<SelectContent>
						{servers.map((s) => (
							<SelectItem key={s.serverId} value={s.serverId}>
								{s.name}
								{isTestServerRow(s) ? ` — ${t("testServerOptionSuffix")}` : ""}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="space-y-2">
				<p className="text-muted-foreground text-sm">
					{t("ownVpsEmbeddedHint")}
				</p>
				<HandleServers
					variant="embedded"
					embeddedTriggerLabel={t("ownVps")}
					onCreated={handleVpsCreated}
				/>
			</div>

			{ctx?.isCloud ? (
				<OnboardingAezaPlanCards
					isBusy={isAezaBusy}
					onSelectPlan={startWithTariff}
				/>
			) : null}
		</div>
	);
};
