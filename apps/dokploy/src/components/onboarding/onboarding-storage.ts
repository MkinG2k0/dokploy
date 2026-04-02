import type { OnboardingDraft, OnboardingStoredState } from "./onboarding-draft-types";

export const ONBOARDING_STORAGE_KEY = "deploybox-onboarding-state-v1";

const defaultDraft = (): OnboardingDraft => ({});

export const loadOnboardingStoredState = (): OnboardingStoredState | null => {
	if (typeof window === "undefined") {
		return null;
	}
	try {
		const raw = window.localStorage.getItem(ONBOARDING_STORAGE_KEY);
		if (!raw) {
			return null;
		}
		const parsed = JSON.parse(raw) as OnboardingStoredState;
		if (
			typeof parsed.step !== "number" ||
			parsed.step < 1 ||
			parsed.step > 4
		) {
			return null;
		}
		return {
			step: parsed.step,
			draft: { ...defaultDraft(), ...parsed.draft },
		};
	} catch {
		return null;
	}
};

export const saveOnboardingStoredState = (state: OnboardingStoredState) => {
	if (typeof window === "undefined") {
		return;
	}
	window.localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(state));
};

export const clearOnboardingStoredState = () => {
	if (typeof window === "undefined") {
		return;
	}
	window.localStorage.removeItem(ONBOARDING_STORAGE_KEY);
};

export const slugifyForDomain = (name: string): string => {
	const s = name
		.toLowerCase()
		.trim()
		.replace(/\s+/g, "-")
		.replace(/[^a-z0-9.-]/g, "");
	return s.length > 0 ? s.slice(0, 48) : "app";
};
