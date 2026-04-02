import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
	OnboardingBuildKind,
	OnboardingDraft,
} from "./onboarding-draft-types";
import { slugifyForDomain } from "./onboarding-storage";

const DOMAIN_SUFFIX =
	(typeof process !== "undefined" &&
		process.env.NEXT_PUBLIC_DEPLOYBOX_DEFAULT_DOMAIN_SUFFIX?.trim()) ||
	"deploybox.ru";

interface OnboardingStepSettingsProps {
	draft: OnboardingDraft;
	onChange: (patch: Partial<OnboardingDraft>) => void;
}

export const OnboardingStepSettings = ({
	draft,
	onChange,
}: OnboardingStepSettingsProps) => {
	const t = useTranslations("onboardingWizard");

	const defaultProjectName = useMemo(() => {
		if (draft.repositoryName) {
			return draft.repositoryName.replace(/\.git$/i, "");
		}
		return "";
	}, [draft.repositoryName]);

	const projectName = draft.projectName ?? defaultProjectName;
	const slug = slugifyForDomain(projectName || "app");
	const domainValue =
		draft.domainHost && draft.domainHost.length > 0
			? draft.domainHost
			: `${slug}.${DOMAIN_SUFFIX}`;

	return (
		<div className="space-y-6">
			<div>
				<h2 className="font-mono text-base font-semibold">
					{t("settingsTitle")}
				</h2>
			</div>

			<div className="space-y-2">
				<Label htmlFor="ob-project">{t("projectName")}</Label>
				<Input
					id="ob-project"
					value={projectName}
					onChange={(e) => {
						const name = e.target.value;
						const nextSlug = slugifyForDomain(name || "app");
						onChange({
							projectName: name,
							domainHost: `${nextSlug}.${DOMAIN_SUFFIX}`,
						});
					}}
				/>
			</div>

			<div className="space-y-2">
				<Label htmlFor="ob-domain">{t("domain")}</Label>
				<Input
					id="ob-domain"
					value={domainValue}
					onChange={(e) => onChange({ domainHost: e.target.value })}
				/>
			</div>

			<div className="space-y-2">
				<Label htmlFor="ob-env">{t("env")}</Label>
				<Textarea
					id="ob-env"
					rows={6}
					className="font-mono text-sm"
					placeholder="KEY=value"
					value={draft.envFile ?? ""}
					onChange={(e) => onChange({ envFile: e.target.value })}
				/>
			</div>

			<div className="space-y-2">
				<Label>{t("buildType")}</Label>
				<Select
					value={draft.buildKind ?? "nixpacks"}
					onValueChange={(v) =>
						onChange({ buildKind: v as OnboardingBuildKind })
					}
				>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="nixpacks">{t("buildNixpacks")}</SelectItem>
						<SelectItem value="dockerfile">{t("buildDockerfile")}</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{draft.buildKind === "dockerfile" ? (
				<div className="space-y-2">
					<Label htmlFor="ob-df">{t("dockerfilePath")}</Label>
					<Input
						id="ob-df"
						value={draft.dockerfilePath ?? "Dockerfile"}
						onChange={(e) => onChange({ dockerfilePath: e.target.value })}
					/>
				</div>
			) : null}

			<p className="text-muted-foreground text-xs">{t("composeSoon")}</p>
		</div>
	);
};
