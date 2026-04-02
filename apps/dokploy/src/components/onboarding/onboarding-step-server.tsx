import Link from "next/link";
import { useTranslations } from "next-intl";
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
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { api } from "@/utils/api";
import { cn } from "@/lib/utils";
import type { OnboardingDraft } from "./onboarding-draft-types";

const AEZA_PLANS: {
	id: string;
	name: string;
	price: string;
	popular?: boolean;
}[] = [
	{ id: "msks-1", name: "MSKs-1", price: "540₽" },
	{ id: "msks-2", name: "MSKs-2", price: "1090₽", popular: true },
	{ id: "msks-3", name: "MSKs-3", price: "2160₽" },
];

interface OnboardingStepServerProps {
	draft: OnboardingDraft;
	onChange: (patch: Partial<OnboardingDraft>) => void;
}

export const OnboardingStepServer = ({
	draft,
	onChange,
}: OnboardingStepServerProps) => {
	const t = useTranslations("onboardingWizard");
	const { data: ctx } = api.onboarding.getContext.useQuery();
	const { data: servers = [] } = api.server.withSSHKey.useQuery();

	const aezaBase =
		typeof process !== "undefined" &&
		process.env.NEXT_PUBLIC_AEZA_ORDER_BASE_URL?.trim()
			? process.env.NEXT_PUBLIC_AEZA_ORDER_BASE_URL.trim()
			: "";

	return (
		<div className="space-y-6">
			<div>
				<h2 className="font-mono text-base font-semibold">{t("serverTitle")}</h2>
				<p className="text-muted-foreground mt-1 text-sm">
					{t("freeServerHint")}
				</p>
			</div>

			<div className="space-y-2">
				<Label>{t("stepServer")}</Label>
				<Select
					value={draft.serverId ?? ""}
					onValueChange={(v) => onChange({ serverId: v })}
				>
					<SelectTrigger>
						<SelectValue placeholder="…" />
					</SelectTrigger>
					<SelectContent>
						{servers.map((s) => (
							<SelectItem key={s.serverId} value={s.serverId}>
								{s.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="flex flex-col gap-2 sm:flex-row">
				<Button variant="outline" asChild>
					<Link href="/dashboard/settings/servers" target="_blank" rel="noreferrer">
						{t("ownVps")}
					</Link>
				</Button>
				<span className="text-muted-foreground self-center text-xs">
					{t("ownVpsHint")}
				</span>
			</div>

			{ctx?.isCloud && ctx.hasPaidSubscription ? (
				<div className="grid gap-4 sm:grid-cols-3">
					{AEZA_PLANS.map((plan) => (
						<Card
							key={plan.id}
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
								<CardTitle className="font-mono text-base">
									{plan.name}
								</CardTitle>
								<CardDescription>{plan.price}</CardDescription>
							</CardHeader>
							<CardContent>
								<p className="text-muted-foreground text-xs">Aeza VPS</p>
							</CardContent>
							<CardFooter>
								<Button variant="secondary" className="w-full" asChild>
									<Link
										href={aezaBase || "#"}
										target="_blank"
										rel="noreferrer"
									>
										{t("aezaOrder")}
									</Link>
								</Button>
							</CardFooter>
						</Card>
					))}
				</div>
			) : ctx?.isCloud ? (
				<div className="rounded-lg border border-dashed p-4 text-center">
					<p className="text-muted-foreground mb-3 text-sm">
						{t("proRequiredAeza")}
					</p>
					<Button asChild>
						<Link href="/dashboard/settings/billing">{t("goPro")}</Link>
					</Button>
				</div>
			) : null}
		</div>
	);
};
