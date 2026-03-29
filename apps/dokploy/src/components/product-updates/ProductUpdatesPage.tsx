"use client";

import { FlaskConical } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ChangelogEntry {
	date: string;
	title: string;
	description: string;
}

const isChangelogArray = (value: unknown): value is ChangelogEntry[] =>
	Array.isArray(value) &&
	value.every(
		(row) =>
			row !== null &&
			typeof row === "object" &&
			typeof (row as ChangelogEntry).date === "string" &&
			typeof (row as ChangelogEntry).title === "string" &&
			typeof (row as ChangelogEntry).description === "string",
	);

export const ProductUpdatesPage = () => {
	const t = useTranslations("productUpdates");
	const rawChangelog = t.raw("changelog");
	const changelog = isChangelogArray(rawChangelog) ? rawChangelog : [];

	return (
		<div className="flex flex-col gap-6">
			<Alert>
				<FlaskConical className="size-4" />
				<AlertTitle>{t("betaTitle")}</AlertTitle>
				<AlertDescription>{t("betaDescription")}</AlertDescription>
			</Alert>

			<Card className="bg-background">
				<CardHeader>
					<CardTitle>{t("changesTitle")}</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-col gap-6">
					{changelog.map((entry, index) => (
						<section
							key={`${entry.date}-${index}`}
							className={cn(index > 0 && "border-t border-border pt-6")}
						>
							<p className="text-xs font-medium text-muted-foreground">
								{entry.date}
							</p>
							<h3 className="mt-1 text-base font-semibold">{entry.title}</h3>
							<p className="mt-2 text-sm text-muted-foreground">
								{entry.description}
							</p>
						</section>
					))}
				</CardContent>
			</Card>

			<p className="text-sm text-muted-foreground">
				{t("releasesHint")}{" "}
				<Link
					href={t("releasesUrl")}
					target="_blank"
					rel="noopener noreferrer"
					className="text-primary underline underline-offset-4 hover:no-underline"
				>
					{t("releasesLinkLabel")}
				</Link>
			</p>
		</div>
	);
};
