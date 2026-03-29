import { KeyIcon } from "lucide-react";
import Link from "next/link";

interface ShowServersNoSshStateProps {
	message: string;
	linkLabel: string;
}

export const ShowServersNoSshState = ({
	message,
	linkLabel,
}: ShowServersNoSshStateProps) => {
	return (
		<div className="flex flex-col items-center gap-3 min-h-[25vh] justify-center">
			<KeyIcon className="size-8" />
			<span className="text-base text-muted-foreground">
				{message}{" "}
				<Link href="/dashboard/settings/ssh-keys" className="text-primary">
					{linkLabel}
				</Link>
			</span>
		</div>
	);
};
