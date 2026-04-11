import type { OnboardingDraft } from "./onboarding-draft-types";

export const ONBOARDING_WIZARD_STEPS = {
	SERVER: 1,
	REPO: 2,
	SETTINGS: 3,
	DEPLOY: 4,
} as const;

export const ONBOARDING_WIZARD_MAX_STEP = ONBOARDING_WIZARD_STEPS.DEPLOY;

export const defaultOnboardingDraft = (): OnboardingDraft => ({
	provider: "github",
	autoDeploy: true,
	buildKind: "nixpacks",
});
