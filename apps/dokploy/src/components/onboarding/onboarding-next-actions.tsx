import Link from "next/link";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { api } from "@/utils/api";

interface OnboardingNextActionsProps {
	projectId?: string;
	environmentId?: string;
}

export const OnboardingNextActions = ({
	projectId,
	environmentId,
}: OnboardingNextActionsProps) => {
	const t = useTranslations("onboardingWizard");
	const { data: sub } = api.billing.getSubscription.useQuery();
	const isPro =
		sub &&
		(sub.plan === "pro" || sub.plan === "agency") &&
		(sub.status === "active" || sub.status === "past_due");

	const envHref =
		projectId && environmentId
			? `/dashboard/project/${projectId}/environment/${environmentId}`
			: "/dashboard/projects";

	return (
		<div className="space-y-4">
			<h3 className="font-mono text-base font-semibold">{t("nextTitle")}</h3>
			<div className="grid gap-3 sm:grid-cols-2">
				<Card>
					<CardHeader className="pb-2">
						<div className="flex items-center justify-between gap-2">
							<CardTitle className="text-sm">{t("nextPostgres")}</CardTitle>
							<Badge variant="outline">{t("badgeFree")}</Badge>
						</div>
						<CardDescription>{t("nextPostgresDesc")}</CardDescription>
					</CardHeader>
					<CardContent>
						<Button variant="secondary" size="sm" asChild>
							<Link href={envHref}>{t("next")}</Link>
						</Button>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<div className="flex items-center justify-between gap-2">
							<CardTitle className="text-sm">{t("nextDomain")}</CardTitle>
							<Badge variant="outline">{t("badgeFree")}</Badge>
						</div>
						<CardDescription>{t("nextDomainDesc")}</CardDescription>
					</CardHeader>
					<CardContent>
						<Button variant="secondary" size="sm" asChild>
							<Link href="/dashboard/projects">{t("next")}</Link>
						</Button>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<div className="flex items-center justify-between gap-2">
							<CardTitle className="text-sm">{t("nextTelegram")}</CardTitle>
							<Badge>{t("badgePro")}</Badge>
						</div>
						<CardDescription>{t("nextTelegramDesc")}</CardDescription>
					</CardHeader>
					<CardContent>
						<Button variant="secondary" size="sm" asChild disabled={!isPro}>
							<Link href="/dashboard/settings/notifications">
								{t("next")}
							</Link>
						</Button>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<div className="flex items-center justify-between gap-2">
							<CardTitle className="text-sm">{t("nextBackups")}</CardTitle>
							<Badge>{t("badgePro")}</Badge>
						</div>
						<CardDescription>{t("nextBackupsDesc")}</CardDescription>
					</CardHeader>
					<CardContent>
						<Button variant="secondary" size="sm" asChild disabled={!isPro}>
							<Link href="/dashboard/settings/servers">{t("next")}</Link>
						</Button>
					</CardContent>
				</Card>
			</div>
		</div>
	);
};
