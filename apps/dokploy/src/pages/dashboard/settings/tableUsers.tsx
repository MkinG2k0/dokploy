import { Loader2, Shield } from "lucide-react";
import { useTranslations } from "next-intl";
import { PlatformMembershipTableRow } from "@/components/dashboard/settings/users/platform-membership-table-row";
import { PlatformUsersStatsSummary } from "@/components/dashboard/settings/users/platform-users-stats-summary";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/utils/api";

const tableWrapClass = "w-full overflow-x-auto rounded-md border border-border";

export const TableUsers = () => {
  const t = useTranslations("settingsUsers");
  const { data, isPending } = api.user.allUsers.useQuery();
  const { data: session } = api.user.session.useQuery();

  return (
    <div className="flex w-full flex-col gap-4">
      <Card className="mx-auto h-full w-full max-w-full bg-sidebar p-2.5 rounded-xl">
        <div className="rounded-xl bg-background shadow-md">
          <CardHeader>
            <CardTitle className="flex flex-row gap-2 text-xl">
              <Shield className="size-6 self-center text-muted-foreground" />
              {t("platformTableTitle")}
            </CardTitle>
            <CardDescription>{t("platformTableDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 border-t py-6">
            {isPending ? (
              <div className="flex min-h-[25vh] flex-row items-center justify-center gap-2 text-sm text-muted-foreground">
                <span>{t("loading")}</span>
                <Loader2 className="size-4 animate-spin" />
              </div>
            ) : !data || data.length === 0 ? (
              <div className="flex min-h-[25vh] flex-col items-center justify-center gap-3">
                <Shield className="size-8 text-muted-foreground" />
                <span className="text-base text-muted-foreground">
                  {t("platformEmpty")}
                </span>
              </div>
            ) : (
              <>
                <PlatformUsersStatsSummary data={data} />
                <div className={tableWrapClass}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("colUser")}</TableHead>
                        <TableHead>{t("colUserId")}</TableHead>
                        <TableHead>{t("colOrgId")}</TableHead>
                        <TableHead>{t("colSubscription")}</TableHead>
                        <TableHead>{t("colSecurity")}</TableHead>
                        <TableHead>{t("colAccountCreated")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.map((member) => (
                        <PlatformMembershipTableRow
                          key={member.id}
                          member={member}
                          currentUserId={session?.user?.id}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </div>
      </Card>
    </div>
  );
};
