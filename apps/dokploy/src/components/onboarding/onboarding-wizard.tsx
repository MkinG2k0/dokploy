import { useRouter } from "next/router";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/utils/api";
import type { OnboardingDraft } from "./onboarding-draft-types";
import { OnboardingStepDeploy } from "./onboarding-step-deploy";
import { OnboardingStepRepository } from "./onboarding-step-repository";
import { OnboardingStepServer } from "./onboarding-step-server";
import { OnboardingStepSettings } from "./onboarding-step-settings";
import {
	clearOnboardingStep,
	loadOnboardingStep,
	saveOnboardingStep,
} from "./onboarding-storage";
import { OnboardingWizardShell } from "./onboarding-wizard-shell";

const defaultDraft = (): OnboardingDraft => ({
	provider: "github",
	autoDeploy: true,
	buildKind: "nixpacks",
});

export const OnboardingWizard = () => {
	const t = useTranslations("onboardingWizard");
	const router = useRouter();
	const { data: status, isSuccess } = api.onboarding.getStatus.useQuery();
	const saveProgress = api.onboarding.saveProgress.useMutation();
	const completeOnboarding = api.onboarding.complete.useMutation();

	const [step, setStep] = useState(1);
	const [maxReachable, setMaxReachable] = useState(1);
	const [draft, setDraft] = useState<OnboardingDraft>(defaultDraft);
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

	useEffect(() => {
		if (!isSuccess || !status || hydrated) return;
		if (status.completed) {
			void router.replace("/dashboard/projects");
			return;
		}
		const localStep = loadOnboardingStep() ?? 1;
		const serverStep = status.step ?? 1;
		const initialStep = Math.min(4, Math.max(1, serverStep, localStep));
		setStep(initialStep);
		setMaxReachable(initialStep);
		const nextDraft = defaultDraft();
		setDraft(nextDraft);
		draftRef.current = nextDraft;
		setHydrated(true);
	}, [hydrated, isSuccess, router, status]);

	const goStep = useCallback(
		(s: number) => {
			setStep(s);
			setMaxReachable((m) => Math.max(m, s));
			persistStep(s);
		},
		[persistStep],
	);

	const goToStep2FromServer = useCallback(() => {
		goStep(2);
	}, [goStep]);

	const handleStepClick = useCallback(
		(s: number) => {
			if (s > maxReachable) return;
			if (s === 3 && bypassSettings) return;
			goStep(s);
		},
		[goStep, maxReachable, bypassSettings],
	);

	const finishAndExit = useCallback(async () => {
		await completeOnboarding.mutateAsync();
		clearOnboardingStep();
		await router.replace("/dashboard/projects");
	}, [completeOnboarding, router]);

	const canRepoNext = useMemo(() => {
		if (draft.skippedRepo) return true;
		return Boolean(
			draft.provider &&
				draft.providerIntegrationId &&
				draft.owner &&
				draft.repositoryName &&
				draft.branch,
		);
	}, [draft]);

	const canServerNext = Boolean(draft.serverId);

	const canSettingsNext = Boolean(
		(draft.projectName ?? draft.repositoryName)?.trim(),
	);

	const handleNext = useCallback(() => {
		if (step === 1) {
			goStep(2);
			return;
		}
		if (step === 2) {
			goStep(bypassSettings ? 4 : 3);
			return;
		}
		if (step === 3) {
			goStep(4);
			return;
		}
		if (step === 4) {
			void finishAndExit();
		}
	}, [bypassSettings, finishAndExit, goStep, step]);

	const handleBack = useCallback(() => {
		if (step <= 1) return;
		if (step === 4 && bypassSettings) {
			goStep(2);
			return;
		}
		goStep(step - 1);
	}, [bypassSettings, goStep, step]);

	const handleSkip = useCallback(() => {
		if (step === 2) {
			mergeDraft({ skippedRepo: true });
			goStep(4);
			return;
		}
		if (step === 3 && !bypassSettings) {
			mergeDraft({ skippedSettings: true });
			goStep(4);
		}
	}, [bypassSettings, goStep, mergeDraft, step]);

	const showSkip = step === 2 || step === 3;
	const canGoBack = step > 1;
	const canGoNext =
		step === 1
			? canServerNext
			: step === 2
				? canRepoNext
				: step === 3
					? canSettingsNext
					: true;

	const testMode = Boolean(draft.testServerMode);

	if (!hydrated) {
		return null;
	}

	return (
		<OnboardingWizardShell
			currentStep={step}
			settingsSidebarSkipped={settingsSidebarSkipped}
			testMode={testMode}
			onStepClick={handleStepClick}
			maxReachableStep={maxReachable}
			onBack={handleBack}
			onNext={handleNext}
			onSkip={handleSkip}
			showSkip={showSkip}
			canGoBack={canGoBack}
			canGoNext={canGoNext}
			nextLabel={step === 4 ? t("goToDashboard") : undefined}
		>
			{step === 1 ? (
				<OnboardingStepServer
					draft={draft}
					onChange={mergeDraft}
					onServerReady={goToStep2FromServer}
				/>
			) : null}
			{step === 2 ? (
				<OnboardingStepRepository draft={draft} onChange={mergeDraft} />
			) : null}
			{step === 3 && !bypassSettings ? (
				<OnboardingStepSettings draft={draft} onChange={mergeDraft} />
			) : null}
			{step === 4 ? (
				<OnboardingStepDeploy draft={draft} onDraftCommitted={mergeDraft} />
			) : null}
		</OnboardingWizardShell>
	);
};
