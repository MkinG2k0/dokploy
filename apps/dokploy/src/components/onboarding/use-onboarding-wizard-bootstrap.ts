import { useRouter } from "next/router";
import { useCallback, useRef, useState } from "react";
import { api } from "@/utils/api";
import type { OnboardingDraft } from "./onboarding-draft-types";
import { clearOnboardingStep, saveOnboardingStep } from "./onboarding-storage";
import { defaultOnboardingDraft } from "./onboarding-wizard-constants";
import { useOnboardingWizardHydrate } from "./use-onboarding-wizard-hydrate";

export const useOnboardingWizardBootstrap = () => {
	const router = useRouter();
	const { data: status, isSuccess } = api.onboarding.getStatus.useQuery();
	const saveProgress = api.onboarding.saveProgress.useMutation();
	const completeOnboarding = api.onboarding.complete.useMutation();
	const [step, setStep] = useState(1);
	const [maxReachable, setMaxReachable] = useState(1);
	const [draft, setDraft] = useState<OnboardingDraft>(defaultOnboardingDraft);
	const [hydrated, setHydrated] = useState(false);
	const draftRef = useRef(draft);
	draftRef.current = draft;
	const bypassSettings = Boolean(draft.skippedRepo);
	const settingsSidebarSkipped =
		Boolean(draft.skippedRepo) || Boolean(draft.skippedSettings);
	const persistStep = useCallback(
		(nextStep: number) => {
			saveOnboardingStep(nextStep);
			void saveProgress.mutate({ step: nextStep });
		},
		[saveProgress],
	);
	const mergeDraft = useCallback((patch: Partial<OnboardingDraft>) => {
		setDraft((d) => {
			const next = { ...d, ...patch };
			draftRef.current = next;
			return next;
		});
	}, []);
	useOnboardingWizardHydrate(
		router,
		isSuccess,
		status,
		hydrated,
		setHydrated,
		setStep,
		setMaxReachable,
		setDraft,
		draftRef,
	);
	const goStep = useCallback(
		(s: number) => {
			setStep(s);
			setMaxReachable((m) => Math.max(m, s));
			persistStep(s);
		},
		[persistStep],
	);
	const finishAndExit = useCallback(async () => {
		await completeOnboarding.mutateAsync();
		clearOnboardingStep();
		await router.replace("/dashboard/projects");
	}, [completeOnboarding, router]);
	return {
		hydrated,
		step,
		maxReachable,
		draft,
		mergeDraft,
		settingsSidebarSkipped,
		testMode: Boolean(draft.testServerMode),
		bypassSettings,
		goStep,
		finishAndExit,
	};
};
