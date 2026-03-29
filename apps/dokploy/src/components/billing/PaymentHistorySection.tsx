import { format } from "date-fns";
import { enUS } from "date-fns/locale/en-US";
import { ru as ruDateLocale } from "date-fns/locale/ru";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

import { paymentStatusBadgeVariant } from "@/components/billing/billing-display";
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { formatRubCurrencyFromKopek } from "@/lib/format-kopek";
import { cn } from "@/lib/utils";
import { api } from "@/utils/api";

const historyCardHeaderClassName = cn(
	"flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0",
);

export const PaymentHistorySection = () => {
	const locale = useLocale();
	const t = useTranslations("billing");
	const tCommon = useTranslations("common");
	const dateLocale = locale === "ru" ? ruDateLocale : enUS;
	const utils = api.useUtils();
	const [dialogOpen, setDialogOpen] = useState(false);

	const { data: payments, isPending: isPaymentsLoading } =
		api.billing.getPayments.useQuery();
	const { mutateAsync: clearPaymentHistory, isPending: isClearing } =
		api.billing.clearPaymentHistory.useMutation();

	const paymentStatusLabel = (raw: string): string => {
		switch (raw) {
			case "pending":
				return t("paymentStatus.pending");
			case "succeeded":
				return t("paymentStatus.succeeded");
			case "failed":
				return t("paymentStatus.failed");
			case "canceled":
				return t("paymentStatus.canceled");
			default:
				return raw;
		}
	};

	const handleOpenClearDialog = (): void => {
		setDialogOpen(true);
	};

	const handleConfirmClear = async (): Promise<void> => {
		try {
			await clearPaymentHistory();
			await utils.billing.getPayments.invalidate();
			toast.success(t("clearPaymentHistorySuccess"));
			setDialogOpen(false);
		} catch {
			toast.error(t("clearPaymentHistoryError"));
		}
	};

	const handleClickConfirm = (): void => {
		void handleConfirmClear();
	};

	const hasPayments = Boolean(payments && payments.length > 0);

	return (
		<Card className="bg-background">
			<AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{t("clearPaymentHistoryDialogTitle")}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{t("clearPaymentHistoryDialogDescription")}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel type="button">
							{tCommon("cancel")}
						</AlertDialogCancel>
						<Button
							type="button"
							variant="destructive"
							disabled={isClearing}
							isLoading={isClearing}
							onClick={handleClickConfirm}
						>
							{t("clearPaymentHistoryConfirm")}
						</Button>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<CardHeader className={historyCardHeaderClassName}>
				<CardTitle>{t("historyTitle")}</CardTitle>
				{hasPayments ? (
					<Button
						type="button"
						variant="outline"
						className="shrink-0 self-start sm:self-auto"
						onClick={handleOpenClearDialog}
					>
						{t("clearPaymentHistory")}
					</Button>
				) : null}
			</CardHeader>
			<CardContent>
				{isPaymentsLoading ? (
					<div className="text-sm text-muted-foreground">
						{t("loadingPayments")}
					</div>
				) : payments && payments.length > 0 ? (
					<div className="rounded-md border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>{t("tableDate")}</TableHead>
									<TableHead>{t("tableAmount")}</TableHead>
									<TableHead>{t("tableStatus")}</TableHead>
									<TableHead>{t("tableOrderId")}</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{payments.map((p) => (
									<TableRow key={p.id}>
										<TableCell>
											{format(new Date(p.createdAt), "PP", {
												locale: dateLocale,
											})}
										</TableCell>
										<TableCell>
											{formatRubCurrencyFromKopek(p.amount, locale)}
										</TableCell>
										<TableCell>
											<Badge variant={paymentStatusBadgeVariant(p.status)}>
												{paymentStatusLabel(p.status)}
											</Badge>
										</TableCell>
										<TableCell className="font-mono text-xs">
											{p.orderId}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				) : (
					<div className="text-sm text-muted-foreground">
						{t("noPayments")}
					</div>
				)}
			</CardContent>
		</Card>
	);
};
