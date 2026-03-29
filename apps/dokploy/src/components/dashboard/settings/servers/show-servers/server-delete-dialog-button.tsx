import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { AlertBlock } from "@/components/shared/alert-block";
import { DialogAction } from "@/components/shared/dialog-action";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const deleteButtonClass = (canDelete: boolean) =>
	cn(
		"h-9 w-9",
		canDelete
			? "text-destructive hover:text-destructive hover:bg-destructive/10"
			: "text-muted-foreground hover:bg-muted",
	);

interface ServerDeleteDialogButtonProps {
	canDelete: boolean;
	serverId: string;
	serverName: string;
	onRemoveServer: (serverId: string, serverName: string) => Promise<void>;
}

export const ServerDeleteDialogButton = ({
	canDelete,
	serverId,
	serverName,
	onRemoveServer,
}: ServerDeleteDialogButtonProps) => {
	const t = useTranslations("settingsServers");

	const handleClick = async () => {
		await onRemoveServer(serverId, serverName);
	};

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<div>
					<DialogAction
						disabled={!canDelete}
						title={canDelete ? t("deleteServerTitle") : t("serverHasServices")}
						description={
							canDelete ? (
								t("deleteServerDesc")
							) : (
								<div className="flex flex-col gap-2">
									{t("cannotDeleteServer")}
									<AlertBlock type="warning">
										{t("activeServicesWarning")}
									</AlertBlock>
								</div>
							)
						}
						onClick={handleClick}
					>
						<Button
							variant="ghost"
							size="icon"
							className={deleteButtonClass(canDelete)}
						>
							<Trash2 className="h-4 w-4" />
						</Button>
					</DialogAction>
				</div>
			</TooltipTrigger>
			<TooltipContent>
				<p>{canDelete ? t("deleteServerTooltip") : t("cannotDeleteTooltip")}</p>
			</TooltipContent>
		</Tooltip>
	);
};
