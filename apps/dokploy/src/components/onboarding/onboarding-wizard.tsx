import { useRouter } from "next/router";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/utils/api";
import type { OnboardingDraft } from "./onboarding-draft-types";
import {
	clearOnboardingStoredState,
	loadOnboardingStoredState,
	saveOnboardingStoredState,
} from "./onboarding-storage";
import { OnboardingWizardShell } from "./onboarding-wizard-shell";
import { OnboardingStepDeploy } from "./onboarding-step-deploy";
import { OnboardingStepRepository } from "./onboarding-step-repository";
import { OnboardingStepServer } from "./onboarding-step-server";
import { OnboardingStepSettings } from "./onboarding-step-settings";

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

	const step3Skipped = Boolean(draft.skippedRepo);

	const persistStep = useCallback(
		(nextStep: number) => {
			saveOnboardingStoredState({ step: nextStep, draft: draftRef.current });
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
		const local = loadOnboardingStoredState();
		const serverStep = status.step ?? 1;
		const localStep = local?.step ?? 1;
		const initialStep = Math.min(4, Math.max(1, serverStep, localStep));
		setStep(initialStep);
		setMaxReachable(initialStep);
		const fromLocal = local?.draft
			? { ...defaultDraft(), ...local.draft }
			: defaultDraft();
		const bootstrapId = status.bootstrapProjectId;
		const nextDraft =
			bootstrapId && !fromLocal.projectId
				? { ...fromLocal, projectId: bootstrapId }
				: fromLocal;
		setDraft(nextDraft);
		draftRef.current = nextDraft;
		setHydrated(true);
	}, [hydrated, isSuccess, router, status]);

	useEffect(() => {
		if (!hydrated) return;
		saveOnboardingStoredState({ step, draft });
	}, [draft, hydrated, step]);

	const goStep = useCallback(
		(s: number) => {
			setStep(s);
			setMaxReachable((m) => Math.max(m, s));
			persistStep(s);
		},
		[persistStep],
	);

	const handleStepClick = useCallback(
		(s: number) => {
			if (s > maxReachable) return;
			if (s === 3 && step3Skipped) return;
			goStep(s);
		},
		[goStep, maxReachable, step3Skipped],
	);

	const finishAndExit = useCallback(async () => {
		await completeOnboarding.mutateAsync();
		clearOnboardingStoredState();
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
			goStep(step3Skipped ? 4 : 3);
			return;
		}
		if (step === 3) {
			goStep(4);
			return;
		}
		if (step === 4) {
			void finishAndExit();
		}
	}, [finishAndExit, goStep, step, step3Skipped]);

	const handleBack = useCallback(() => {
		if (step <= 1) return;
		if (step === 4 && step3Skipped) {
			goStep(2);
			return;
		}
		goStep(step - 1);
	}, [goStep, step, step3Skipped]);

	const handleSkip = useCallback(() => {
		if (step !== 1) return;
		mergeDraft({ skippedRepo: true });
		goStep(2);
	}, [goStep, mergeDraft, step]);

	const showSkip = step === 1;
	const canGoBack = step > 1;
	const canGoNext =
		step === 1
			? canRepoNext
			: step === 2
				? canServerNext
				: step === 3
					? canSettingsNext
					: true;

	if (!hydrated) {
		return null;
	}

	return (
		<OnboardingWizardShell
			currentStep={step}
			step3Skipped={step3Skipped}
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
				<OnboardingStepRepository draft={draft} onChange={mergeDraft} />
			) : null}
			{step === 2 ? (
				<OnboardingStepServer draft={draft} onChange={mergeDraft} />
			) : null}
			{step === 3 && !step3Skipped ? (
				<OnboardingStepSettings draft={draft} onChange={mergeDraft} />
			) : null}
			{step === 4 ? (
				<OnboardingStepDeploy draft={draft} onDraftCommitted={mergeDraft} />
			) : null}
		</OnboardingWizardShell>
	);
};
