// Menu items
import { inferRouterOutputs } from "@trpc/server";
// Consists of unfiltered home, settings, and help items
// The items are filtered based on the user's role and permissions
// The `isEnabled` function is called to determine if the item should be displayed
import {
  BarChart2,
  Bell,
  BlocksIcon,
  BookOpen,
  BotIcon,
  Boxes,
  ClipboardList,
  Clock,
  CreditCard,
  Database,
  FlaskConical,
  FolderOpen,
  Forward,
  GalleryVerticalEnd,
  GitBranch,
  Globe,
  Key,
  KeyRound,
  LogIn,
  LucideIcon,
  MessageCircle,
  Package,
  Palette,
  PieChart,
  Rocket,
  Server,
  ShieldCheck,
  Tags,
  Users,
} from "lucide-react";
import { getBillingRefundTelegramHref } from "../../lib/billing-refund-telegram";
import { AppRouter } from "../../server/api/root";
import { isSuperAdmin } from "../../server/api/utils/audit";
// The types of the queries we are going to use
export type AuthQueryOutput = NonNullable<
  inferRouterOutputs<AppRouter>["user"]["get"]
>;
export type PermissionsOutput =
  inferRouterOutputs<AppRouter>["user"]["getPermissions"];

export type EnabledOpts = {
  auth?: AuthQueryOutput;
  permissions?: PermissionsOutput;
  isCloud: boolean;
};
export type EnabledRule = boolean | ((opts: EnabledOpts) => boolean);

export type SingleNavItem = {
  isSingle?: true;
  title: string;
  url: string;
  icon?: LucideIcon;
  isEnabled?: EnabledRule;
};

// NavItem type
// Consists of a single item or a group of items
// If `isSingle` is true or undefined, the item is a single item
// If `isSingle` is false, the item is a group of items
export type NavItem =
  | SingleNavItem
  | {
      isSingle: false;
      title: string;
      icon: LucideIcon;
      items: SingleNavItem[];
      isEnabled?: EnabledRule;
    };

// Help menu: external links or in-app routes (e.g. product updates)
export type HelpMenuItem =
  | {
      behavior: "external";
      name: string;
      url: string;
      icon: LucideIcon;
      isEnabled?: EnabledRule;
    }
  | {
      behavior: "internal";
      name: string;
      url: string;
      icon: LucideIcon;
      isEnabled?: EnabledRule;
    };

const isRoleAdmin: EnabledRule = ({ auth }) => auth?.role === "admin";
const isRoleSuperAdmin: EnabledRule = ({ auth }) => Boolean(auth?.isSuperAdmin);
// Menu type
// Consists of home, settings, and help items
export type Menu = {
  home: NavItem[];
  settings: NavItem[];
  help: HelpMenuItem[];
};
export const MENU: Menu = {
  home: [
    {
      isSingle: true,
      title: "dashboard.projects",
      url: "/dashboard/projects",
      icon: FolderOpen,
    },
    {
      isSingle: true,
      title: "dashboard.deployments",
      url: "/dashboard/deployments",
      icon: Rocket,
      isEnabled: ({ permissions }) => !!permissions?.deployment.read,
    },
    {
      isSingle: true,
      title: "dashboard.monitoring",
      url: "/dashboard/monitoring",
      icon: BarChart2,
      // Only enabled in non-cloud environments and if user has monitoring.read
      isEnabled: isRoleSuperAdmin,
    },
    {
      isSingle: true,
      title: "dashboard.schedules",
      url: "/dashboard/schedules",
      icon: Clock,
      isEnabled: isRoleSuperAdmin,
    },
    {
      isSingle: true,
      title: "dashboard.traefikFileSystem",
      url: "/dashboard/traefik",
      icon: GalleryVerticalEnd,
      isEnabled: isRoleSuperAdmin,
    },
    {
      isSingle: true,
      title: "dashboard.docker",
      url: "/dashboard/docker",
      icon: BlocksIcon,
      isEnabled: isRoleSuperAdmin,
    },
    {
      isSingle: true,
      title: "dashboard.requests",
      url: "/dashboard/requests",
      icon: Forward,
      isEnabled: isRoleSuperAdmin,
    },
  ],

  settings: [
    {
      isSingle: true,
      title: "dashboard.settings.remoteServers",
      url: "/dashboard/settings/servers",
      icon: Server,
      isEnabled: ({ permissions }) => !!permissions?.server.read,
    },
    {
      isSingle: true,
      title: "dashboard.swarm",
      url: "/dashboard/swarm",
      icon: PieChart,
      isEnabled: ({ auth }) => auth?.role === "admin" || auth?.role === "owner",
    },
    {
      isSingle: true,
      title: "dashboard.settings.git",
      url: "/dashboard/settings/git-providers",
      icon: GitBranch,
      // Only enabled for users with access to Git providers
      isEnabled: ({ permissions }) => !!permissions?.gitProviders.read,
    },
    {
      isSingle: true,
      title: "dashboard.settings.sshKeys",
      icon: Key,
      url: "/dashboard/settings/ssh-keys",
      // Only enabled for users with access to SSH keys
      isEnabled: ({ permissions }) => !!permissions?.sshKeys.read,
    },
    {
      isSingle: true,
      title: "dashboard.settings.webServer",
      url: "/dashboard/settings/server",
      icon: Globe,
      // Only enabled for admins in non-cloud environments
      isEnabled: ({ permissions, isCloud }) =>
        !!(permissions?.organization.update && !isCloud),
    },
    {
      isSingle: true,
      title: "dashboard.settings.notifications",
      url: "/dashboard/settings/notifications",
      icon: Bell,
      // Only enabled for users with access to notifications
      isEnabled: ({ permissions }) => !!permissions?.notification.read,
    },
    {
      isSingle: true,
      title: "dashboard.settings.billing",
      url: "/dashboard/settings/billing",
      icon: CreditCard,
      // Only enabled for owners in cloud environments
      isEnabled: ({ auth, isCloud }) =>
        !!(auth?.role === "owner" && isCloud && !auth.isSuperAdmin),
    },
    {
      isSingle: true,
      title: "dashboard.settings.users",
      icon: Users,
      url: "/dashboard/settings/users",
      isEnabled: ({ auth }) => auth?.role === "admin" || auth?.role === "owner",
    },
    {
      isSingle: true,
      title: "dashboard.settings.auditLogs",
      icon: ClipboardList,
      url: "/dashboard/settings/audit-logs",
      isEnabled: isRoleSuperAdmin,
    },
    {
      isSingle: true,
      title: "dashboard.settings.ai",
      icon: BotIcon,
      url: "/dashboard/settings/ai",
      isEnabled: isRoleSuperAdmin,
    },
    {
      isSingle: true,
      title: "dashboard.settings.tags",
      url: "/dashboard/settings/tags",
      icon: Tags,
      isEnabled: isRoleSuperAdmin,
    },
    {
      isSingle: true,
      title: "dashboard.settings.registry",
      url: "/dashboard/settings/registry",
      icon: Package,
      isEnabled: isRoleSuperAdmin,
    },
    {
      isSingle: true,
      title: "dashboard.settings.destinations",
      url: "/dashboard/settings/destinations",
      icon: Database,
      isEnabled: isRoleSuperAdmin,
    },
    {
      isSingle: true,
      title: "dashboard.settings.certificates",
      url: "/dashboard/settings/certificates",
      icon: ShieldCheck,
      isEnabled: isRoleSuperAdmin,
    },
    {
      isSingle: true,
      title: "dashboard.settings.cluster",
      url: "/dashboard/settings/cluster",
      icon: Boxes,
      isEnabled: isRoleSuperAdmin,
    },
    {
      isSingle: true,
      title: "dashboard.settings.license",
      url: "/dashboard/settings/license",
      icon: KeyRound,
      isEnabled: false,
    },
    {
      isSingle: true,
      title: "dashboard.settings.sso",
      url: "/dashboard/settings/sso",
      icon: LogIn,
      isEnabled: false,
    },
    {
      isSingle: true,
      title: "dashboard.settings.whitelabeling",
      url: "/dashboard/settings/whitelabeling",
      icon: Palette,
      isEnabled: false,
    },
  ],

  help: [
    {
      behavior: "external",
      name: "help.documentation",
      url: "https://docs.dokploy.com",
      icon: BookOpen,
    },
    {
      behavior: "external",
      name: "help.support",
      url: "mailto:support@deploy-box.ru",
      icon: MessageCircle,
    },
    {
      behavior: "internal",
      name: "help.whatsNew",
      url: "/dashboard/settings/product-updates",
      icon: FlaskConical,
      isEnabled: isRoleSuperAdmin,
    },
  ],
} satisfies Menu;

/**
 * Creates a menu based on the current user's role and permissions
 * @returns a menu object with the home, settings, and help items
 */
export function createMenuForAuthUser(opts: {
  auth?: AuthQueryOutput;
  permissions?: PermissionsOutput;
  isCloud: boolean;
  whitelabeling?: {
    docsUrl?: string | null;
    supportUrl?: string | null;
  } | null;
}): Menu {
  console.log(opts);
  const filterEnabled = <
    T extends {
      isEnabled?: EnabledRule;
    },
  >(
    items: readonly T[],
  ): T[] =>
    items.filter((item) => {
      return typeof item.isEnabled === "function"
        ? item.isEnabled({
            auth: opts.auth,
            permissions: opts.permissions,
            isCloud: opts.isCloud,
          })
        : (item.isEnabled ?? true);
    }) as T[];

  // Apply whitelabeling URL overrides to help items; поддержка — Telegram из env приоритетнее дефолта
  const helpItems = filterEnabled(MENU.help).map((item) => {
    if (item.behavior !== "external") {
      return item;
    }
    if (opts.whitelabeling?.docsUrl && item.name === "help.documentation") {
      return { ...item, url: opts.whitelabeling.docsUrl };
    }
    if (item.name === "help.support") {
      if (opts.whitelabeling?.supportUrl) {
        return { ...item, url: opts.whitelabeling.supportUrl };
      }
      const telegramHref = getBillingRefundTelegramHref();
      if (telegramHref) {
        return { ...item, url: telegramHref };
      }
      return item;
    }
    return item;
  });

  return {
    home: filterEnabled(MENU.home),
    settings: filterEnabled(MENU.settings),
    help: helpItems,
  };
}
