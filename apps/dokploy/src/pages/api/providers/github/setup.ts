import { createGithub } from "@dokploy/server";
import { db } from "@dokploy/server/db";
import { eq } from "drizzle-orm";
import type { NextApiRequest, NextApiResponse } from "next";
import { Octokit } from "octokit";
import { github } from "@/server/db/schema";

const DEFAULT_RETURN_TO = "/dashboard/settings/git-providers";

type Query = {
	code: string;
	state: string;
	installation_id: string;
	setup_action: string;
	returnTo?: string;
};

const decodeReturnFromState = (
	action: string,
	rest: string[],
): string | undefined => {
	if (action === "gh_init" && rest.length > 2) {
		const encoded = rest.slice(2).join(":");
		try {
			return decodeURIComponent(encoded);
		} catch {
			return undefined;
		}
	}
	if (action === "gh_setup" && rest.length > 1) {
		const encoded = rest.slice(1).join(":");
		try {
			return decodeURIComponent(encoded);
		} catch {
			return undefined;
		}
	}
	return undefined;
};

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	const { code, state, installation_id, returnTo }: Query = req.query as Query;

	if (!code) {
		return res.status(400).json({ error: "Missing code parameter" });
	}
	const [action, ...rest] = state?.split(":") ?? [];
	// For gh_init: rest[0] = organizationId, rest[1] = userId, rest[2+] = encodeURIComponent(returnPath)
	// For gh_setup: rest[0] = githubProviderId, rest[1+] = encodeURIComponent(returnPath)

	const returnFromState =
		typeof action === "string"
			? decodeReturnFromState(action, rest)
			: undefined;
	const destination =
		(typeof returnTo === "string" && returnTo.length > 0
			? returnTo
			: returnFromState) || DEFAULT_RETURN_TO;

	if (action === "gh_init") {
		const organizationId = rest[0];
		const userId = rest[1] || (req.query.userId as string);

		if (!userId) {
			return res.status(400).json({ error: "Missing userId parameter" });
		}

		const octokit = new Octokit({});
		const { data } = await octokit.request(
			"POST /app-manifests/{code}/conversions",
			{
				code: code as string,
			},
		);

		await createGithub(
			{
				name: data.name,
				githubAppName: data.html_url,
				githubAppId: data.id,
				githubClientId: data.client_id,
				githubClientSecret: data.client_secret,
				githubWebhookSecret: data.webhook_secret,
				githubPrivateKey: data.pem,
			},
			organizationId as string,
			userId,
		);
	} else if (action === "gh_setup") {
		await db
			.update(github)
			.set({
				githubInstallationId: installation_id,
			})
			.where(eq(github.githubId, rest[0] as string))
			.returning();
	}

	res.redirect(307, destination);
}
