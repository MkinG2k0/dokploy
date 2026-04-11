import { useOnboardingWizardBootstrap } from "./use-onboarding-wizard-bootstrap";
import { useOnboardingWizardStepFlow } from "./use-onboarding-wizard-step-flow";

export const useOnboardingWizard = () => {
	const boot = useOnboardingWizardBootstrap();
	const flow = useOnboardingWizardStepFlow({
		step: boot.step,
		maxReachable: boot.maxReachable,
		draft: boot.draft,
		bypassSettings: boot.bypassSettings,
		goStep: boot.goStep,
		mergeDraft: boot.mergeDraft,
		finishAndExit: boot.finishAndExit,
	});
	return {
		hydrated: boot.hydrated,
		step: boot.step,
		maxReachable: boot.maxReachable,
		draft: boot.draft,
		mergeDraft: boot.mergeDraft,
		settingsSidebarSkipped: boot.settingsSidebarSkipped,
		testMode: boot.testMode,
		bypassSettings: boot.bypassSettings,
		...flow,
	};
};
