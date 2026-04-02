import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AezaWizardTariff } from "./use-aeza-onboarding-provision";

const AEZA_PLANS: {
	id: AezaWizardTariff;
	name: string;
	price: string;
	popular?: boolean;
}[] = [
	{ id: "msks-1", name: "MSKs-1", price: "540₽" },
	{ id: "msks-2", name: "MSKs-2", price: "1090₽", popular: true },
	{ id: "msks-3", name: "MSKs-3", price: "2160₽" },
];

interface AezaPlanCardProps {
	plan: (typeof AEZA_PLANS)[number];
	isBusy: boolean;
	onSelectPlan: (planId: AezaWizardTariff) => void;
}

const AezaPlanCard = ({ plan, isBusy, onSelectPlan }: AezaPlanCardProps) => {
	const t = useTranslations("onboardingWizard");
	const handleClick = useCallback(() => {
		onSelectPlan(plan.id);
	}, [onSelectPlan, plan.id]);

	return (
		<Card
			className={cn(
				"relative",
				plan.popular && "border-primary ring-1 ring-primary/30",
			)}
		>
			{plan.popular ? (
				<Badge className="absolute right-3 top-3" variant="secondary">
					{t("aezaPopular")}
				</Badge>
			) : null}
			<CardHeader>
				<CardTitle className="font-mono text-base">{plan.name}</CardTitle>
				<CardDescription>{plan.price}</CardDescription>
			</CardHeader>
			<CardContent>
				<p className="text-muted-foreground text-xs">Aeza VPS</p>
			</CardContent>
			<CardFooter>
				<Button
					type="button"
					variant="secondary"
					className="w-full"
					disabled={isBusy}
					onClick={handleClick}
				>
					{t("aezaOrderStart")}
				</Button>
			</CardFooter>
		</Card>
	);
};

interface OnboardingAezaPlanCardsProps {
	isBusy: boolean;
	onSelectPlan: (planId: AezaWizardTariff) => void;
}

export const OnboardingAezaPlanCards = ({
	isBusy,
	onSelectPlan,
}: OnboardingAezaPlanCardsProps) => {
	const t = useTranslations("onboardingWizard");

	return (
		<div className="space-y-3">
			{isBusy ? (
				<p className="text-muted-foreground text-center text-sm">
					{t("aezaProvisioning")}
				</p>
			) : null}
			<div className="grid gap-4 sm:grid-cols-3">
				{AEZA_PLANS.map((plan) => (
					<AezaPlanCard
						key={plan.id}
						plan={plan}
						isBusy={isBusy}
						onSelectPlan={onSelectPlan}
					/>
				))}
			</div>
		</div>
	);
};
