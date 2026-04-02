/** Persisted across refresh: step index only (draft lives in memory for the session). */
export const ONBOARDING_STEP_STORAGE_KEY = "deploybox-onboarding-step-v2";

const LEGACY_ONBOARDING_STORAGE_KEY = "deploybox-onboarding-state-v1";

export const loadOnboardingStep = (): number | null => {
	if (typeof window === "undefined") {
		return null;
	}
	try {
		const raw = window.localStorage.getItem(ONBOARDING_STEP_STORAGE_KEY);
		if (raw) {
			const parsed = JSON.parse(raw) as { step?: unknown };
			if (
				typeof parsed.step === "number" &&
				parsed.step >= 1 &&
				parsed.step <= 4
			) {
				return parsed.step;
			}
		}
		const legacyRaw = window.localStorage.getItem(
			LEGACY_ONBOARDING_STORAGE_KEY,
		);
		if (legacyRaw) {
			const legacy = JSON.parse(legacyRaw) as { step?: unknown };
			if (
				typeof legacy.step === "number" &&
				legacy.step >= 1 &&
				legacy.step <= 4
			) {
				saveOnboardingStep(legacy.step);
				return legacy.step;
			}
		}
		return null;
	} catch {
		return null;
	}
};

export const saveOnboardingStep = (step: number) => {
	if (typeof window === "undefined") {
		return;
	}
	window.localStorage.setItem(
		ONBOARDING_STEP_STORAGE_KEY,
		JSON.stringify({ step }),
	);
};

export const clearOnboardingStep = () => {
	if (typeof window === "undefined") {
		return;
	}
	window.localStorage.removeItem(ONBOARDING_STEP_STORAGE_KEY);
	window.localStorage.removeItem(LEGACY_ONBOARDING_STORAGE_KEY);
};

export const slugifyForDomain = (name: string): string => {
	const s = name
		.toLowerCase()
		.trim()
		.replace(/\s+/g, "-")
		.replace(/[^a-z0-9.-]/g, "");
	return s.length > 0 ? s.slice(0, 48) : "app";
};
