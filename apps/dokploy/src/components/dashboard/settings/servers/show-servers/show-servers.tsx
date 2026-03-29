import { useRouter } from "next/router";
import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { HandleServers } from "../handle-servers";
import { ServerCard } from "./server-card";
import { ShowServersEmptyList } from "./show-servers-empty-list";
import { ShowServersHeader } from "./show-servers-header";
import { ShowServersLoading } from "./show-servers-loading";
import { ShowServersNoSshState } from "./show-servers-no-ssh-state";
import { useShowServers } from "./use-show-servers";

export const ShowServers = () => {
	const t = useTranslations("settingsServers");
	const router = useRouter();
	const { servers, isPending, sshKeys, isCloud, permissions, removeServer } =
		useShowServers();

	const handleResetOnboarding = useCallback(() => {
		void router.push("/dashboard/settings/servers");
	}, [router]);

	return (
		<div className="w-full">
			<Card className="h-full  p-2.5 rounded-xl  max-w-5xl mx-auto">
				<div className="rounded-xl bg-background shadow-md ">
					<ShowServersHeader
						title={t("title")}
						description={t("description")}
						resetOnboardingLabel={t("resetOnboarding")}
						isCloud={Boolean(isCloud)}
						onResetOnboarding={handleResetOnboarding}
					/>
					<CardContent className="space-y-2 py-8 border-t">
						{isPending ? (
							<ShowServersLoading label={t("loading")} />
						) : (
							<>
								{sshKeys?.length === 0 && servers?.length === 0 ? (
									<ShowServersNoSshState
										message={t("noSshKeysState")}
										linkLabel={t("addSshKeyLink")}
									/>
								) : (
									<>
										{servers?.length === 0 ? (
											<ShowServersEmptyList
												emptyLabel={t("emptyState")}
												canCreate={Boolean(permissions?.server.create)}
											/>
										) : (
											<div className="flex flex-col gap-4 min-h-[25vh]">
												<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
													{servers?.map((server) => (
														<ServerCard
															key={server.serverId}
															server={server}
															isCloud={Boolean(isCloud)}
															canDeletePermission={Boolean(
																permissions?.server.delete,
															)}
															onRemoveServer={removeServer}
														/>
													))}
												</div>

												{permissions?.server.create && (
													<div className="flex flex-row gap-2 flex-wrap w-full justify-end mt-4">
														{servers && servers.length > 0 && (
															<div>
																<HandleServers />
															</div>
														)}
													</div>
												)}
											</div>
										)}
									</>
								)}
							</>
						)}
					</CardContent>
				</div>
			</Card>
		</div>
	);
};
