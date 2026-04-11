import type { NextRouter } from "next/router";
import {
	type Dispatch,
	type MutableRefObject,
	type SetStateAction,
	useEffect,
} from "react";
import type { RouterOutputs } from "@/utils/api";
import type { OnboardingDraft } from "./onboarding-draft-types";
import { loadOnboardingStep } from "./onboarding-storage";
import {
	defaultOnboardingDraft,
	ONBOARDING_WIZARD_MAX_STEP,
} from "./onboarding-wizard-constants";

type OnboardingStatus = RouterOutputs["onboarding"]["getStatus"];

export const useOnboardingWizardHydrate = (
	router: NextRouter,
	isSuccess: boolean,
	status: OnboardingStatus | undefined,
	hydrated: boolean,
	setHydrated: Dispatch<SetStateAction<boolean>>,
	setStep: Dispatch<SetStateAction<number>>,
	setMaxReachable: Dispatch<SetStateAction<number>>,
	setDraft: Dispatch<SetStateAction<OnboardingDraft>>,
	draftRef: MutableRefObject<OnboardingDraft>,
) => {
	useEffect(() => {
		if (!isSuccess || !status || hydrated) return;
		if (status.completed) {
			void router.replace("/dashboard/projects");
			return;
		}
		const localStep = loadOnboardingStep();
		const serverStep = status.step ?? 1;
		const initialStep = Math.min(
			ONBOARDING_WIZARD_MAX_STEP,
			Math.max(1, serverStep, localStep),
		);
		setStep(initialStep);
		setMaxReachable(initialStep);
		const nextDraft = defaultOnboardingDraft();
		setDraft(nextDraft);
		draftRef.current = nextDraft;
		setHydrated(true);
	}, [
		draftRef,
		hydrated,
		isSuccess,
		router,
		setDraft,
		setHydrated,
		setMaxReachable,
		setStep,
		status,
	]);
};
