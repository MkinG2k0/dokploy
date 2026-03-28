import { useEffect, useState } from "react";

import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	getBillingRefundTelegramHandle,
	getBillingRefundTelegramHref,
} from "@/lib/billing-refund-telegram";
import { cn } from "@/lib/utils";
import { api } from "@/utils/api";

type BillingType = "one_time" | "recurring";

interface ConsentRowProps {
  checkboxId: string;
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  label: string;
  description: string;
}

const ConsentRow = ({
  checkboxId,
  checked,
  onCheckedChange,
  label,
  description,
}: ConsentRowProps) => (
  <div className="flex items-start gap-3.5">
    <Checkbox
      id={checkboxId}
      className="mt-1 shrink-0"
      checked={checked}
      onCheckedChange={(v) => onCheckedChange(v === true)}
    />
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label
        htmlFor={checkboxId}
        className="cursor-pointer text-sm font-medium leading-snug text-foreground"
      >
        {label}
      </Label>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  </div>
);

export interface SubscriptionCheckoutModalProps {
  plan: "pro" | "agency";
  planDisplayName: string;
  priceMonthly: number;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export const SubscriptionCheckoutModal = ({
  plan,
  planDisplayName,
  priceMonthly,
  isOpen,
  onClose,
  className,
}: SubscriptionCheckoutModalProps) => {
  const t = useTranslations("billing.checkoutModal");
  const tBilling = useTranslations("billing");
  const [billingType, setBillingType] = useState<BillingType>("recurring");
  const [agreedToCharge, setAgreedToCharge] = useState(true);
  const [agreedToCancellation, setAgreedToCancellation] = useState(false);

  const { mutateAsync: createCheckout, isPending: isCheckoutPending } =
    api.billing.createCheckout.useMutation();

  useEffect(() => {
    if (!isOpen) {
      setBillingType("one_time");
      setAgreedToCharge(true);
      setAgreedToCancellation(false);
    }
  }, [isOpen]);

  const handleBillingTabChange = (value: string) => {
    const next = value === "recurring" ? "recurring" : "one_time";
    setBillingType(next);
    setAgreedToCharge(true);
    setAgreedToCancellation(false);
  };

  const canPay =
    agreedToCharge && (billingType === "one_time" || agreedToCancellation);

	const handlePay = async () => {
		if (!canPay) return;
		try {
			const { paymentUrl } = await createCheckout({
				plan,
				billingType,
			});
			if (paymentUrl) {
				window.location.href = paymentUrl;
			}
		} catch {
			toast.error(t("checkoutError"));
		}
	};

	const refundTelegramHref = getBillingRefundTelegramHref();
	const refundTelegramHandle = getBillingRefundTelegramHandle();

	return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn(
          "max-w-lg gap-0 overflow-hidden p-0 sm:max-w-lg h-full",
          className,
        )}
      >
        <div className="flex flex-col gap-6 px-6 pb-2 pt-6">
          <DialogHeader className="space-y-2 pb-0 text-left">
            <DialogTitle className="text-xl font-semibold leading-tight sm:text-2xl">
              {t("title", { plan: planDisplayName })}
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              {t("subtitle")}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1 rounded-lg border border-border bg-muted/40 px-4 py-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
            <span className="text-sm font-medium text-foreground">
              {planDisplayName}
            </span>
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
                {priceMonthly}₽
              </span>
              <span className="text-sm font-normal text-muted-foreground">
                {tBilling("perMonth")}
              </span>
            </div>
          </div>

          <Tabs
            value={billingType}
            onValueChange={handleBillingTabChange}
            className="w-full"
          >
            <TabsList className="grid h-11 w-full grid-cols-2 gap-1 rounded-lg bg-muted p-1 text-muted-foreground">
              <TabsTrigger
                className="rounded-md px-3 py-2 text-sm font-medium data-[state=active]:shadow-sm"
                value="one_time"
              >
                {t("tabOneTime")}
              </TabsTrigger>
              <TabsTrigger
                className="rounded-md px-3 py-2 text-sm font-medium data-[state=active]:shadow-sm"
                value="recurring"
              >
                {t("tabRecurring")}
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="one_time"
              className="mt-4 space-y-5 focus:outline-none"
            >
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t("oneTimeHint")}
              </p>
              <div className="flex flex-col gap-4">
                <ConsentRow
                  checkboxId="agree-charge-once"
                  checked={agreedToCharge}
                  onCheckedChange={setAgreedToCharge}
                  label={t("checkboxOneTimeLabel")}
                  description={t("checkboxOneTimeDescription", {
                    price: priceMonthly,
                    plan: planDisplayName,
                  })}
                />
              </div>
            </TabsContent>

            <TabsContent
              value="recurring"
              className="mt-4 space-y-5 focus:outline-none"
            >
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t("recurringHint")}
              </p>
              <div className="flex flex-col gap-4">
                <ConsentRow
                  checkboxId="agree-charge-recurring"
                  checked={agreedToCharge}
                  onCheckedChange={setAgreedToCharge}
                  label={t("checkboxRecurringChargeLabel")}
                  description={t("checkboxRecurringChargeDescription", {
                    price: priceMonthly,
                  })}
                />
                <ConsentRow
                  checkboxId="agree-cancel-howto"
                  checked={agreedToCancellation}
                  onCheckedChange={setAgreedToCancellation}
                  label={t("checkboxCancelHowtoLabel")}
                  description={t("checkboxCancelHowtoDescription")}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="mt-0 flex flex-col gap-4 border-0 p-0 sm:flex-col">
          <Button
            className="h-11 w-full text-base font-semibold sm:w-full"
            disabled={!canPay || isCheckoutPending}
            isLoading={isCheckoutPending}
            onClick={() => void handlePay()}
          >
            {t("pay")}
          </Button>
          <Separator className="bg-border/80" />
          <nav aria-label={t("legalNavLabel")} className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-x-1 gap-y-2 text-sm">
              <a
                href={t("termsUrl")}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-sm px-1 py-0.5 text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {t("terms")}
              </a>
              <span
                className="select-none text-muted-foreground/50"
                aria-hidden
              >
                ·
              </span>
              <a
                href={t("privacyUrl")}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-sm px-1 py-0.5 text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {t("privacy")}
              </a>
            </div>
            {refundTelegramHref ? (
              <a
                href={refundTelegramHref}
                target="_blank"
                rel="noopener noreferrer"
                className="w-fit rounded-sm px-1 py-0.5 text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {t("supportRefundTelegram", { handle: refundTelegramHandle })}
              </a>
            ) : (
              <a
                href="mailto:support@deploy-box.ru"
                className="w-fit rounded-sm px-1 py-0.5 text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {t("supportRefund")}
              </a>
            )}
          </nav>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
