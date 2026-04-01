import type { PlatformMembershipRow } from "./platform-membership-table-row";

const SUBSCRIPTION_STATUS_ACTIVE = "active";

export interface PlatformUsersStats {
  totalMemberships: number;
  uniqueUsers: number;
  uniqueOrganizations: number;
  usersWithActiveSubscription: number;
  usersWithTwoFactor: number;
  usersBanned: number;
}

export const computePlatformUsersStats = (
  rows: PlatformMembershipRow[],
): PlatformUsersStats => {
  const userIds = new Set<string>();
  const orgIds = new Set<string>();
  const activeSubUsers = new Set<string>();
  const twoFaUsers = new Set<string>();
  const bannedUsers = new Set<string>();

  for (const m of rows) {
    userIds.add(m.userId);
    orgIds.add(m.organizationId);
    if (m.user.subscription?.status === SUBSCRIPTION_STATUS_ACTIVE) {
      activeSubUsers.add(m.userId);
    }
    if (m.user.twoFactorEnabled) {
      twoFaUsers.add(m.userId);
    }
    if (m.user.banned) {
      bannedUsers.add(m.userId);
    }
  }

  return {
    totalMemberships: rows.length,
    uniqueUsers: userIds.size,
    uniqueOrganizations: orgIds.size,
    usersWithActiveSubscription: activeSubUsers.size,
    usersWithTwoFactor: twoFaUsers.size,
    usersBanned: bannedUsers.size,
  };
};
