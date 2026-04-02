export type OnboardingGitProvider = "github" | "gitlab" | "bitbucket";

export type OnboardingBuildKind = "nixpacks" | "dockerfile";

export interface OnboardingDraft {
	/** Пропуск шага репозитория — настройка и репо не заполняются, сразу к деплою после сервера. */
	skippedRepo?: boolean;
	/** Пользователь нажал «Пропустить» на шаге настройки (при заполненном репо). */
	skippedSettings?: boolean;
	/** Тестовый сервер из списка — деплой только mock (шаг 4). */
	testServerMode?: boolean;
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
