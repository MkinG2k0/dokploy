import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const emptyGitProviderPanelClass = cn(
	"flex flex-col items-center gap-3 min-h-[25vh] justify-center",
);

interface GitSourceTabPanelProps {
	applicationId: string;
	hasProviders: boolean;
	emptyIcon: ReactNode;
	configureRichKey: "github" | "gitlab" | "bitbucket" | "gitea";
	Form: React.ComponentType<{ applicationId: string }>;
}

const GitProvidersSettingsLink = (chunks: ReactNode) => (
	<Link href="/dashboard/settings/git-providers" className="text-foreground">
		{chunks}
	</Link>
);

export const GitSourceTabPanel = ({
	applicationId,
	hasProviders,
	emptyIcon,
	configureRichKey,
	Form,
}: GitSourceTabPanelProps) => {
	const t = useTranslations("applicationGeneralProvider");

	if (hasProviders) {
		return <Form applicationId={applicationId} />;
	}

	const link = GitProvidersSettingsLink;
	let configureRich: ReactNode;
	switch (configureRichKey) {
		case "github":
			configureRich = t.rich("configureRich.github", { link });
			break;
		case "gitlab":
			configureRich = t.rich("configureRich.gitlab", { link });
			break;
		case "bitbucket":
			configureRich = t.rich("configureRich.bitbucket", { link });
			break;
		case "gitea":
			configureRich = t.rich("configureRich.gitea", { link });
			break;
	}

	return (
		<div className={emptyGitProviderPanelClass}>
			{emptyIcon}
			<span className="text-base text-muted-foreground">{configureRich}</span>
		</div>
	);
};
