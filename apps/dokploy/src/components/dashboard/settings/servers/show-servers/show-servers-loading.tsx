import { Loader2 } from "lucide-react";

interface ShowServersLoadingProps {
	label: string;
}

export const ShowServersLoading = ({ label }: ShowServersLoadingProps) => {
	return (
		<div className="flex flex-row gap-2 items-center justify-center text-sm text-muted-foreground min-h-[25vh]">
			<span>{label}</span>
			<Loader2 className="animate-spin size-4" />
		</div>
	);
};
