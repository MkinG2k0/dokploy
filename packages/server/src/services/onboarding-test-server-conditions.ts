import { isNotNull, sql } from "drizzle-orm";

import { ONBOARDING_TEST_SERVER_NAME } from "../constants";
import { server } from "../db/schema";

/**
 * Условие «не тестовый онбординг-сервер»: без параметра enum `test` (старые БД без значения в типе).
 */
export const excludeOnboardingTestServer = () =>
	sql`NOT (${server.name} = ${ONBOARDING_TEST_SERVER_NAME} OR ${server.provisionSource}::text = 'test')`;

/** Показать в списке: есть SSH или это тестовый онбординг-сервер. */
export const includeSshOrOnboardingTestServer = () =>
	sql`(${isNotNull(server.sshKeyId)} OR ${server.name} = ${ONBOARDING_TEST_SERVER_NAME} OR ${server.provisionSource}::text = 'test')`;
