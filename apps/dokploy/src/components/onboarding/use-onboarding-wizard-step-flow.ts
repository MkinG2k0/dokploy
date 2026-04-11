import { useCallback, useMemo } from "react";
import type { OnboardingDraft } from "./onboarding-draft-types";
import { ONBOARDING_WIZARD_STEPS as S } from "./onboarding-wizard-constants";
import { computeWizardCanGoNext } from "./onboarding-wizard-step-guards";

type StepFlowParams = {
	step: number;
	maxReachable: number;
	draft: OnboardingDraft;
	bypassSettings: boolean;
	goStep: (next: number) => void;
	mergeDraft: (patch: Partial<OnboardingDraft>) => void;
	finishAndExit: () => Promise<void>;
};

export const useOnboardingWizardStepFlow = ({
	step,
	maxReachable,
	draft,
	bypassSettings,
	goStep,
	mergeDraft,
	finishAndExit,
}: StepFlowParams) => {
	const goToStep2FromServer = useCallback(() => goStep(S.REPO), [goStep]);
	const handleStepClick = useCallback(
		(s: number) => {
			if (s > maxReachable) return;
			if (s === S.SETTINGS && bypassSettings) return;
			goStep(s);
		},
		[goStep, maxReachable, bypassSettings],
	);
	const handleNext = useCallback(() => {
		switch (step) {
			case S.SERVER:
				goStep(S.REPO);
				break;
			case S.REPO:
				goStep(bypassSettings ? S.DEPLOY : S.SETTINGS);
				break;
			case S.SETTINGS:
				goStep(S.DEPLOY);
				break;
			case S.DEPLOY:
				void finishAndExit();
		}
	}, [bypassSettings, finishAndExit, goStep, step]);
	const handleBack = useCallback(() => {
		if (step <= S.SERVER) return;
		if (step === S.DEPLOY && bypassSettings) goStep(S.REPO);
		else goStep(step - 1);
	}, [bypassSettings, goStep, step]);
	const handleSkip = useCallback(() => {
		if (step === S.REPO) {
			mergeDraft({ skippedRepo: true });
			goStep(S.DEPLOY);
		} else if (step === S.SETTINGS && !bypassSettings) {
			mergeDraft({ skippedSettings: true });
			goStep(S.DEPLOY);
		}
	}, [bypassSettings, goStep, mergeDraft, step]);
	const canGoNext = useMemo(
		() => computeWizardCanGoNext(step, draft),
		[draft, step],
	);
	return {
		goToStep2FromServer,
		handleStepClick,
		handleNext,
		handleBack,
		handleSkip,
		showSkip: step === S.REPO || step === S.SETTINGS,
		canGoBack: step > S.SERVER,
		canGoNext,
	};
};
