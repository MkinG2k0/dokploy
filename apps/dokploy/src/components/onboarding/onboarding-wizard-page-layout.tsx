import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/shared/logo";
import { useWhitelabelingPublic } from "@/utils/hooks/use-whitelabeling";

interface OnboardingWizardPageLayoutProps {
	children: ReactNode;
}

export const OnboardingWizardPageLayout = ({
	children,
}: OnboardingWizardPageLayoutProps) => {
	const { config: whitelabeling } = useWhitelabelingPublic();
	const logoUrl =
		whitelabeling?.loginLogoUrl || whitelabeling?.logoUrl || undefined;

	return (
		<div className="bg-background min-h-svh">
			<header className="border-b">
				<div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4">
					<Link href="/" className="flex items-center gap-2 text-primary">
						<Logo className="size-8" logoUrl={logoUrl} />
						<span className="font-mono text-sm font-medium">
							{whitelabeling?.appName ?? "DeployBox"}
						</span>
					</Link>
				</div>
			</header>
			<main>{children}</main>
		</div>
	);
};
