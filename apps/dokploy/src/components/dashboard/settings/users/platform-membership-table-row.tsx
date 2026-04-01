import { format } from "date-fns";
import { useTranslations } from "next-intl";
import { PlatformUserSubscriptionCell } from "@/components/dashboard/settings/users/platform-user-subscription-cell";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { RouterOutputs } from "@/utils/api";

const ID_PREVIEW_PREFIX = 8;
const ID_PREVIEW_SUFFIX = 4;

const tableCellMuted = "text-sm text-muted-foreground";

const truncateId = (id: string) =>
  id.length <= ID_PREVIEW_PREFIX + ID_PREVIEW_SUFFIX + 1
    ? id
    : `${id.slice(0, ID_PREVIEW_PREFIX)}…${id.slice(-ID_PREVIEW_SUFFIX)}`;

const displayUserName = (firstName: string, lastName: string) => {
  const full = `${firstName} ${lastName}`.trim();
  return full.length > 0 ? full : "—";
};

export type PlatformMembershipRow = RouterOutputs["user"]["allUsers"][number];

interface PlatformMembershipTableRowProps {
  member: PlatformMembershipRow;
  currentUserId?: string;
}

export const PlatformMembershipTableRow = ({
  member,
  currentUserId,
}: PlatformMembershipTableRowProps) => {
  const t = useTranslations("settingsUsers");
  const { user, organization } = member;
  const isYou = user.id === currentUserId;

  return (
    <TableRow>
      <TableCell className="min-w-48 align-top">
        <div className="flex flex-col gap-0.5">
          <span className="font-medium">
            {displayUserName(user.firstName, user.lastName)}
            {isYou && (
              <span className="text-muted-foreground font-normal">
                {" "}
                {t("youLabel")}
              </span>
            )}
          </span>
          <span className={tableCellMuted}>{user.email}</span>
        </div>
      </TableCell>
      <TableCell className="align-top">
        <code className="text-xs break-all" title={user.id}>
          {truncateId(user.id)}
        </code>
      </TableCell>
      <TableCell className="align-top">
        <code className="text-xs break-all" title={member.organizationId}>
          {truncateId(member.organizationId)}
        </code>
      </TableCell>

      <PlatformUserSubscriptionCell subscription={user.subscription} />
      <TableCell className="min-w-52 align-top">
        <div className="flex flex-wrap gap-1">
          <Badge variant={user.emailVerified ? "secondary" : "outline"}>
            {user.emailVerified ? t("emailVerifiedYes") : t("emailVerifiedNo")}
          </Badge>
          <Badge variant="outline">
            {user.twoFactorEnabled ? t("twoFaEnabled") : t("twoFaDisabled")}
          </Badge>
          {user.banned ? (
            <Badge variant="destructive" title={user.banReason ?? undefined}>
              {t("bannedYes")}
            </Badge>
          ) : null}
          {user.isValidEnterpriseLicense ? (
            <Badge variant="outline">{t("enterpriseYes")}</Badge>
          ) : null}
          {user.enablePaidFeatures ? (
            <Badge variant="outline">{t("paidYes")}</Badge>
          ) : null}
          {!user.isRegistered ? (
            <Badge variant="outline">{t("registrationIncomplete")}</Badge>
          ) : null}
        </div>
      </TableCell>

      <TableCell className={cn("align-top whitespace-nowrap", tableCellMuted)}>
        {user.createdAt
          ? format(new Date(user.createdAt), "PPp")
          : format(new Date(user.createdAt2), "PPp")}
      </TableCell>
    </TableRow>
  );
};
