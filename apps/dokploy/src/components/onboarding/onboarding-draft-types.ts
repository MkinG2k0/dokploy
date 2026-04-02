export type OnboardingGitProvider = "github" | "gitlab" | "bitbucket";

export type OnboardingBuildKind = "nixpacks" | "dockerfile";

export interface OnboardingDraft {
	skippedRepo?: boolean;
	provider?: OnboardingGitProvider;
	/** githubId | gitlabId | bitbucketId */
	providerIntegrationId?: string;
	/** GitHub: repo name; GitLab: name; Bitbucket: name */
	repositoryName?: string;
	repositorySlug?: string;
	owner?: string;
	branch?: string;
	gitlabProjectId?: number;
	gitlabPathNamespace?: string;
	autoDeploy?: boolean;
	serverId?: string;
	projectName?: string;
	domainHost?: string;
	envFile?: string;
	buildKind?: OnboardingBuildKind;
	dockerfilePath?: string;
	projectId?: string;
	environmentId?: string;
	applicationId?: string;
}

export interface OnboardingStoredState {
	step: number;
	draft: OnboardingDraft;
}
