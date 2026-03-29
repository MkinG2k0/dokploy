import { Lock } from "lucide-react";
import Link from "next/link";
import { SERVER_PLAN_OVERLAY_CLASSNAME } from "./show-servers-constants";

interface ServerPlanLockedOverlayProps {
	ctaLabel: string;
	hintLabel: string;
}

export const ServerPlanLockedOverlay = ({
	ctaLabel,
	hintLabel,
}: ServerPlanLockedOverlayProps) => {
	return (
		<div className={SERVER_PLAN_OVERLAY_CLASSNAME} aria-hidden>
			<Lock className="size-8 text-muted-foreground" aria-hidden />
			<Link
				href="/dashboard/settings/billing"
				className="text-sm font-medium text-primary hover:underline"
			>
				{ctaLabel}
			</Link>
			<p className="max-w-xs text-xs text-muted-foreground">{hintLabel}</p>
		</div>
	);
};
