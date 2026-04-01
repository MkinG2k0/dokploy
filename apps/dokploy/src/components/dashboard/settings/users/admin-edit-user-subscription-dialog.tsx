import { standardSchemaResolver as zodResolver } from "@hookform/resolvers/standard-schema";
import { format } from "date-fns";
import { useTranslations } from "next-intl";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { api } from "@/utils/api";
import type { RouterOutputs } from "@/utils/api";

type SubscriptionRow = NonNullable<
  RouterOutputs["user"]["allUsers"][number]["user"]["subscription"]
>;

const toDatetimeLocalValue = (d: Date) =>
  format(d, "yyyy-MM-dd'T'HH:mm");

interface AdminEditUserSubscriptionDialogProps {
  targetUserId: string;
  userEmail: string;
  subscription: SubscriptionRow | null | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type FormValues = {
  plan: "free" | "pro" | "agency";
  status: "active" | "inactive";
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  autoRenew: boolean;
};

export const AdminEditUserSubscriptionDialog = ({
  targetUserId,
  userEmail,
  subscription,
  open,
  onOpenChange,
}: AdminEditUserSubscriptionDialogProps) => {
  const t = useTranslations("settingsUsers");
  const utils = api.useUtils();

  const formSchema = useMemo(
    () =>
      z.object({
        plan: z.enum(["free", "pro", "agency"]),
        status: z.enum(["active", "inactive"]),
        currentPeriodEnd: z.string(),
        cancelAtPeriodEnd: z.boolean(),
        autoRenew: z.boolean(),
      }),
    [],
  );

  const isExisting = Boolean(subscription);

  const defaultValues = useMemo((): FormValues => {
    if (!subscription) {
      return {
        plan: "free",
        status: "inactive",
        currentPeriodEnd: "",
        cancelAtPeriodEnd: false,
        autoRenew: false,
      };
    }
    return {
      plan: subscription.plan,
      status:
        subscription.status === "inactive" ? "inactive" : "active",
      currentPeriodEnd: subscription.currentPeriodEnd
        ? toDatetimeLocalValue(new Date(subscription.currentPeriodEnd))
        : "",
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      autoRenew: subscription.autoRenew,
    };
  }, [subscription]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  useEffect(() => {
    if (open) {
      form.reset(defaultValues);
    }
  }, [open, defaultValues, form]);

  const mutation = api.billingAdmin.upsertUserSubscription.useMutation({
    onSuccess: async () => {
      toast.success(t("adminSubscriptionSuccess"));
      await utils.user.allUsers.invalidate();
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(err.message || t("adminSubscriptionError"));
    },
  });

  const handleSubmit = form.handleSubmit((values) => {
    const trimmedEnd = values.currentPeriodEnd.trim();
    let currentPeriodEnd: Date | null = null;
    if (trimmedEnd.length > 0) {
      const parsed = new Date(trimmedEnd);
      if (Number.isNaN(parsed.getTime())) {
        toast.error(t("adminSubscriptionInvalidDate"));
        return;
      }
      currentPeriodEnd = parsed;
    }
    mutation.mutate({
      targetUserId,
      plan: values.plan,
      status: values.status,
      currentPeriodEnd,
      cancelAtPeriodEnd: values.cancelAtPeriodEnd,
      autoRenew: values.autoRenew,
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("adminSubscriptionDialogTitle")}</DialogTitle>
          <DialogDescription>
            {t("adminSubscriptionDialogDescription", { email: userEmail })}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="plan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("adminSubscriptionPlanLabel")}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="free">free</SelectItem>
                      <SelectItem value="pro">pro</SelectItem>
                      <SelectItem value="agency">agency</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("adminSubscriptionStatusLabel")}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">
                        {t("subscriptionStatusActive")}
                      </SelectItem>
                      <SelectItem value="inactive">
                        {t("subscriptionStatusInactive")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="currentPeriodEnd"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("adminSubscriptionPeriodEndLabel")}
                  </FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormDescription>
                    {t("adminSubscriptionPeriodEndHint")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cancelAtPeriodEnd"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between gap-4 rounded-lg border border-border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      {t("adminSubscriptionCancelAtPeriodEndLabel")}
                    </FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            {isExisting ? (
              <FormField
                control={form.control}
                name="autoRenew"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between gap-4 rounded-lg border border-border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        {t("adminSubscriptionAutoRenewLabel")}
                      </FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                {t("adminSubscriptionAutoRenewNewHint")}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {t("adminSubscriptionCancel")}
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {t("adminSubscriptionSave")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
