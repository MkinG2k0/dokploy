import type { OnboardingDraft } from "./onboarding-draft-types";
import { ONBOARDING_WIZARD_STEPS as S } from "./onboarding-wizard-constants";

export const isRepoStepSatisfied = (draft: OnboardingDraft): boolean => {
	if (draft.skippedRepo) return true;
	return Boolean(
		draft.provider &&
			draft.providerIntegrationId &&
			draft.owner &&
			draft.repositoryName &&
			draft.branch,
	);
};

export const computeWizardCanGoNext = (
	step: number,
	draft: OnboardingDraft,
): boolean => {
	if (step === S.SERVER) return Boolean(draft.serverId);
	if (step === S.REPO) return isRepoStepSatisfied(draft);
	if (step === S.SETTINGS) {
		return Boolean((draft.projectName ?? draft.repositoryName)?.trim());
	}
	return true;
};
