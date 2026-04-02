import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const STEP_IDS = [1, 2, 3, 4] as const;

interface OnboardingWizardShellProps {
	currentStep: number;
	/** Репозиторий пропущен — шаг «Настройка» не показывается; в сайдбаре отмечен как пропуск. */
	settingsSidebarSkipped: boolean;
	/** Баннер тестового сервера на всю ширину контента. */
	testMode?: boolean;
	onStepClick: (step: number) => void;
	maxReachableStep: number;
	children: ReactNode;
	onBack: () => void;
	onNext: () => void;
	onSkip: () => void;
	showSkip: boolean;
	canGoBack: boolean;
	canGoNext: boolean;
	nextLabel?: string;
}

export const OnboardingWizardShell = ({
	currentStep,
	settingsSidebarSkipped,
	testMode = false,
	onStepClick,
	maxReachableStep,
	children,
	onBack,
	onNext,
	onSkip,
	showSkip,
	canGoBack,
	canGoNext,
	nextLabel,
}: OnboardingWizardShellProps) => {
	const t = useTranslations("onboardingWizard");
	const progressValue =
		((STEP_IDS.indexOf(currentStep as (typeof STEP_IDS)[number]) + 1) / 4) *
		100;

	return (
		<div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 md:flex-row md:gap-10">
			<aside className="w-full shrink-0 md:w-56">
				<div className="mb-4 md:hidden">
					<Progress value={progressValue} className="h-2" />
				</div>
				<nav className="flex flex-col gap-1" aria-label="Onboarding steps">
					{STEP_IDS.map((id) => {
						const done = id < currentStep;
						const active = id === currentStep;
						const skippedNavLabel = id === 3 && settingsSidebarSkipped;
						const clickable =
							id <= maxReachableStep && !(id === 3 && settingsSidebarSkipped);
						return (
							<button
								key={id}
								type="button"
								disabled={!clickable}
								onClick={() => clickable && onStepClick(id)}
								className={cn(
									"flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
									active && "bg-accent text-accent-foreground",
									!active && clickable && "hover:bg-muted",
									!clickable && "cursor-not-allowed opacity-50",
								)}
							>
								<span
									className={cn(
										"flex size-6 shrink-0 items-center justify-center rounded-full border text-xs",
										done && "border-primary bg-primary/15 text-primary",
										active && !done && "border-primary",
									)}
								>
									{done ? <Check className="size-3.5 text-primary" /> : id}
								</span>
								<span className="truncate">
									{id === 1 && t("stepServer")}
									{id === 2 && t("stepRepo")}
									{id === 3 &&
										(skippedNavLabel ? `— ${t("skip")}` : t("stepSettings"))}
									{id === 4 && t("stepDeploy")}
								</span>
							</button>
						);
					})}
				</nav>
			</aside>
			<div className="min-w-0 flex-1 space-y-6">
				<div className="hidden md:block">
					<Progress value={progressValue} className="h-2" />
				</div>
				{testMode ? (
					<output
						className="bg-muted text-muted-foreground block rounded-md border px-4 py-3 text-center text-sm"
						aria-live="polite"
					>
						{t("testModeBanner")}
					</output>
				) : null}
				<Card>
					<CardContent className="space-y-6 pt-6">{children}</CardContent>
				</Card>
				<div className="flex flex-wrap items-center justify-end gap-2">
					<Button
						type="button"
						variant="outline"
						onClick={onBack}
						disabled={!canGoBack}
					>
						{t("back")}
					</Button>
					{showSkip ? (
						<Button type="button" variant="ghost" onClick={onSkip}>
							{t("skip")}
						</Button>
					) : null}
					<Button type="button" onClick={onNext} disabled={!canGoNext}>
						{nextLabel ?? t("next")}
					</Button>
				</div>
			</div>
		</div>
	);
};
