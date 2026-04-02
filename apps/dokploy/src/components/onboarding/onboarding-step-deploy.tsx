import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { api } from "@/utils/api";
import { OnboardingDeployLog } from "./onboarding-deploy-log";
import type { OnboardingDraft } from "./onboarding-draft-types";
import { OnboardingNextActions } from "./onboarding-next-actions";
import { slugifyForDomain } from "./onboarding-storage";

type DeployPhase =
	| "idle"
	| "running"
	| "streaming"
	| "done"
	| "error"
	| "skipped";

interface OnboardingStepDeployProps {
	draft: OnboardingDraft;
	onDraftCommitted: (patch: Partial<OnboardingDraft>) => void;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const OnboardingStepDeploy = ({
	draft,
	onDraftCommitted,
}: OnboardingStepDeployProps) => {
	const t = useTranslations("onboardingWizard");
	const utils = api.useUtils();
	const [phase, setPhase] = useState<DeployPhase>("idle");
	const [progress, setProgress] = useState(0);
	const [logPath, setLogPath] = useState<string | null>(null);

	const createProject = api.project.create.useMutation();
	const createApplication = api.application.create.useMutation();
	const saveGithub = api.application.saveGithubProvider.useMutation();
	const saveGitlab = api.application.saveGitlabProvider.useMutation();
	const saveBitbucket = api.application.saveBitbucketProvider.useMutation();
	const saveBuildType = api.application.saveBuildType.useMutation();
	const saveEnv = api.application.saveEnvironment.useMutation();
	const updateApp = api.application.update.useMutation();
	const createDomain = api.domain.create.useMutation();
	const deployApp = api.application.deploy.useMutation();

	const runPipeline = useCallback(async () => {
		if (draft.skippedRepo) {
			setPhase("skipped");
			return;
		}
		if (!draft.serverId) {
			toast.error(t("stepServer"));
			return;
		}
		if (
			!draft.provider ||
			!draft.providerIntegrationId ||
			!draft.repositoryName ||
			!draft.owner ||
			!draft.branch
		) {
			toast.error(t("repoTitle"));
			return;
		}

		const projectLabel = draft.projectName?.trim() || draft.repositoryName;
		const appSlug = slugifyForDomain(projectLabel);

		setPhase("running");
		setProgress(10);

		try {
			const proj = await createProject.mutateAsync({
				name: projectLabel,
				description: "",
				env: "",
			});
			const environmentId = proj.environment.environmentId;
			onDraftCommitted({ projectId: proj.project.projectId, environmentId });

			setProgress(25);
			const app = await createApplication.mutateAsync({
				name: projectLabel,
				appName: appSlug,
				description: undefined,
				environmentId,
				serverId: draft.serverId,
			});
			const applicationId = app.applicationId;
			onDraftCommitted({ applicationId });

			setProgress(40);
			if (draft.provider === "github") {
				await saveGithub.mutateAsync({
					applicationId,
					githubId: draft.providerIntegrationId,
					owner: draft.owner,
					repository: draft.repositoryName,
					branch: draft.branch,
					buildPath: "/",
					triggerType: "push",
					watchPaths: [],
					enableSubmodules: false,
				});
			} else if (draft.provider === "gitlab") {
				if (draft.gitlabProjectId == null || !draft.gitlabPathNamespace) {
					throw new Error("GitLab project");
				}
				await saveGitlab.mutateAsync({
					applicationId,
					gitlabId: draft.providerIntegrationId,
					gitlabOwner: draft.owner,
					gitlabRepository: draft.repositoryName,
					gitlabBranch: draft.branch,
					gitlabBuildPath: "/",
					gitlabProjectId: draft.gitlabProjectId,
					gitlabPathNamespace: draft.gitlabPathNamespace,
					watchPaths: [],
					enableSubmodules: false,
				});
			} else {
				const slug = draft.repositorySlug ?? draft.repositoryName;
				await saveBitbucket.mutateAsync({
					applicationId,
					bitbucketId: draft.providerIntegrationId,
					bitbucketOwner: draft.owner,
					bitbucketRepository: draft.repositoryName,
					bitbucketRepositorySlug: slug,
					bitbucketBranch: draft.branch,
					bitbucketBuildPath: "/",
					watchPaths: [],
					enableSubmodules: false,
				});
			}

			setProgress(55);
			const buildType =
				draft.buildKind === "dockerfile" ? "dockerfile" : "nixpacks";
			await saveBuildType.mutateAsync({
				applicationId,
				buildType,
				dockerfile: draft.dockerfilePath ?? "Dockerfile",
				dockerContextPath: null,
				dockerBuildStage: null,
				herokuVersion: null,
				railpackVersion: null,
				publishDirectory: null,
				isStaticSpa: null,
			});

			if (draft.envFile?.trim()) {
				await saveEnv.mutateAsync({
					applicationId,
					env: draft.envFile,
					buildArgs: null,
					buildSecrets: null,
					createEnvFile: true,
				});
			}

			await updateApp.mutateAsync({
				applicationId,
				autoDeploy: draft.autoDeploy ?? true,
			});

			const host =
				draft.domainHost?.trim() ||
				`${appSlug}.${process.env.NEXT_PUBLIC_DEPLOYBOX_DEFAULT_DOMAIN_SUFFIX ?? "deploybox.ru"}`;

			await createDomain.mutateAsync({
				host,
				path: "/",
				port: 3000,
				https: true,
				applicationId,
				certificateType: "letsencrypt",
				domainType: "application",
				customCertResolver: "",
			});

			setProgress(70);
			await deployApp.mutateAsync({ applicationId });

			setProgress(80);
			let foundPath: string | null = null;
			for (let i = 0; i < 60; i++) {
				const rows = await utils.deployment.all.fetch({ applicationId });
				const latest = rows?.[0];
				if (latest?.logPath) {
					foundPath = latest.logPath;
					break;
				}
				await sleep(1000);
			}

			if (foundPath) {
				setLogPath(foundPath);
				setPhase("streaming");
				setProgress(95);
			} else {
				setPhase("done");
				setProgress(100);
			}
		} catch (e) {
			setPhase("error");
			toast.error(e instanceof Error ? e.message : "Deploy failed");
		}
	}, [
		createApplication,
		createDomain,
		createProject,
		deployApp,
		draft,
		onDraftCommitted,
		saveBitbucket,
		saveBuildType,
		saveEnv,
		saveGithub,
		saveGitlab,
		t,
		updateApp,
		utils.deployment.all,
	]);

	const handleStreamDone = () => {
		setPhase("done");
		setProgress(100);
	};

	if (draft.skippedRepo || phase === "skipped") {
		return (
			<div className="space-y-4">
				<h2 className="font-mono text-base font-semibold">
					{t("deployTitle")}
				</h2>
				<p className="text-muted-foreground text-sm">{t("deploySkipped")}</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div>
				<h2 className="font-mono text-base font-semibold">
					{t("deployTitle")}
				</h2>
				<p className="text-muted-foreground mt-1 text-sm">{t("deploying")}</p>
			</div>

			<Progress value={progress} className="h-2" />

			{phase === "idle" || phase === "error" ? (
				<Button type="button" onClick={() => void runPipeline()}>
					{t("deployCta")}
				</Button>
			) : null}

			{(phase === "streaming" || phase === "running") && logPath ? (
				<OnboardingDeployLog logPath={logPath} serverId={draft.serverId} open />
			) : null}

			{phase === "streaming" && logPath ? (
				<Button type="button" variant="secondary" onClick={handleStreamDone}>
					{t("complete")}
				</Button>
			) : null}

			{phase === "done" ? (
				<OnboardingNextActions
					projectId={draft.projectId}
					environmentId={draft.environmentId}
				/>
			) : null}
		</div>
	);
};
