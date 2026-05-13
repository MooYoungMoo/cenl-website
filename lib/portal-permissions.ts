import type { PortalNavigationSection } from "@/lib/site-data";

export const websiteManagementSections = [
  { section: "site_settings", label: "Site Settings", href: "/portal/site-settings" },
  { section: "home", label: "Home", href: "/portal/home" },
  { section: "research", label: "Research", href: "/portal/research" },
  { section: "members", label: "Members", href: "/portal/members" },
  { section: "pi", label: "PI Profile", href: "/portal/pi" },
  { section: "publications", label: "Publications", href: "/portal/publications" },
  { section: "patents", label: "Patents", href: "/portal/patents" },
  { section: "news", label: "News", href: "/portal/news" },
  { section: "contact", label: "Contact", href: "/portal/contact" },
] as const;

export type WebsiteManagementSection =
  (typeof websiteManagementSections)[number]["section"];

type WebsitePermissionRow = {
  section?: string | null;
  is_enabled?: boolean | null;
};

export const portalRoleOptions = [
  { value: "student", label: "student" },
  { value: "professor", label: "professor" },
  { value: "admin", label: "admin" },
  { value: "lab_manager", label: "Lab Manager" },
];

export function normalizePortalRole(role: string | null | undefined) {
  return role?.trim().toLowerCase() ?? null;
}

export function canManageWebsiteContent(role: string | null | undefined) {
  const normalizedRole = normalizePortalRole(role);

  return (
    normalizedRole === "professor" ||
    normalizedRole === "admin" ||
    normalizedRole === "lab_manager"
  );
}

export function getEnabledWebsiteSectionsFromRows(
  rows: WebsitePermissionRow[] | null | undefined,
) {
  return (rows ?? [])
    .filter((row) => row.is_enabled !== false)
    .map((row) => row.section)
    .filter((section): section is WebsiteManagementSection =>
      websiteManagementSections.some((item) => item.section === section),
    );
}

export function canManageWebsiteSection({
  role,
  enabledSections,
  section,
}: {
  role: string | null | undefined;
  enabledSections: string[];
  section: WebsiteManagementSection;
}) {
  return (
    canManageWebsiteContent(role) ||
    enabledSections.includes(section)
  );
}

function getWebsiteSectionForHref(href: string) {
  return websiteManagementSections.find((section) => section.href === href)
    ?.section;
}

export function canManagePaymentsGlobally(role: string | null | undefined) {
  const normalizedRole = normalizePortalRole(role);

  return normalizedRole === "professor" || normalizedRole === "admin";
}

export function canUseAdminTools(
  role: string | null | undefined,
  isProjectAdmin: boolean,
) {
  return canManagePaymentsGlobally(role) || isProjectAdmin;
}

export function filterPortalNavigationSections({
  sections,
  role,
  isProjectAdmin,
  enabledWebsiteSections = [],
}: {
  sections: PortalNavigationSection[];
  role: string | null | undefined;
  isProjectAdmin: boolean;
  enabledWebsiteSections?: string[];
}) {
  const canUsePaymentTools = canManagePaymentsGlobally(role) || isProjectAdmin;
  const canUseWebsiteTools = canManageWebsiteContent(role);
  const canUseSystemTools = canManagePaymentsGlobally(role);

  return sections
    .map((section) => {
      if (section.title === "Payment & Budget") {
        return {
          ...section,
          links: section.links.map((link) =>
            link.href === "/portal/purchase-request" || canUsePaymentTools
              ? link
              : { ...link, locked: true },
          ),
        };
      }

      if (section.title === "Website Management") {
        return {
          ...section,
          links: section.links.map((link) => {
            const websiteSection = getWebsiteSectionForHref(link.href);
            const canUseSection =
              canUseWebsiteTools ||
              Boolean(
                websiteSection &&
                  enabledWebsiteSections.includes(websiteSection),
              );

            return canUseSection ? link : { ...link, locked: true };
          }),
        };
      }

      if (section.title === "System Admin") {
        return {
          ...section,
          links: section.links.filter((link) =>
            link.href === "/portal/activity-log"
              ? canUsePaymentTools
              : canUseSystemTools,
          ),
        };
      }

      return section;
    })
    .filter((section) => section.links.length > 0);
}
