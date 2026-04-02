import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

interface OnboardingTestServerCardProps {
	isBusy: boolean;
	onContinue: () => void;
}

export const OnboardingTestServerCard = ({
	isBusy,
	onContinue,
}: OnboardingTestServerCardProps) => {
	const t = useTranslations("onboardingWizard");

	return (
		<Card className="border-dashed">
			<CardHeader className="pb-2">
				<CardTitle className="font-mono text-base">
					{t("testServerCardTitle")}
				</CardTitle>
				<CardDescription>{t("testServerCardDesc")}</CardDescription>
			</CardHeader>
			<CardContent className="pb-2">
				<p className="text-muted-foreground text-sm">
					{t("testServerCardFootnote")}
				</p>
			</CardContent>
			<CardFooter>
				<Button
					type="button"
					variant="secondary"
					disabled={isBusy}
					onClick={onContinue}
				>
					{isBusy ? t("testServerCreating") : t("testServerCta")}
				</Button>
			</CardFooter>
		</Card>
	);
};
