import { ServerIcon } from "lucide-react";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ShowServersHeaderProps {
	title: string;
	description: string;
	resetOnboardingLabel?: string;
	isCloud?: boolean;
	onResetOnboarding?: () => void;
}

export const ShowServersHeader = ({
	title,
	description,
	resetOnboardingLabel,
	isCloud,
	onResetOnboarding,
}: ShowServersHeaderProps) => {
	return (
		<CardHeader className="">
			<CardTitle className="text-xl flex flex-row gap-2">
				<ServerIcon className="size-6 text-muted-foreground self-center" />
				{title}
			</CardTitle>
			<CardDescription>{description}</CardDescription>

			{isCloud && resetOnboardingLabel && onResetOnboarding && (
				<span
					className="bg-gradient-to-r cursor-pointer from-blue-600 via-green-500 to-indigo-400 inline-block text-transparent bg-clip-text text-sm"
					onClick={onResetOnboarding}
				>
					{resetOnboardingLabel}
				</span>
			)}
		</CardHeader>
	);
};
