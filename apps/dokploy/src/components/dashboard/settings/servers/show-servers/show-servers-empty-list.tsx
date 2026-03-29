import { ServerIcon } from "lucide-react";
import { HandleServers } from "../handle-servers";

interface ShowServersEmptyListProps {
	emptyLabel: string;
	canCreate: boolean;
}

export const ShowServersEmptyList = ({
	emptyLabel,
	canCreate,
}: ShowServersEmptyListProps) => {
	return (
		<div className="flex flex-col items-center gap-3  min-h-[25vh] justify-center">
			<ServerIcon className="size-8 self-center text-muted-foreground" />
			<span className="text-base text-muted-foreground">{emptyLabel}</span>
			{canCreate && <HandleServers />}
		</div>
	);
};
