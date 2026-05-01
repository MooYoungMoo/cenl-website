import type { PortalNavigationSection } from "@/lib/site-data";

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
}: {
  sections: PortalNavigationSection[];
  role: string | null | undefined;
  isProjectAdmin: boolean;
}) {
  const canUsePaymentTools = canManagePaymentsGlobally(role) || isProjectAdmin;
  const canUseWebsiteTools = canManageWebsiteContent(role);
  const canUseSystemTools = canUseAdminTools(role, isProjectAdmin);

  return sections
    .map((section) => {
      if (section.title === "Payment & Budget") {
        return {
          ...section,
          links: section.links.filter(
            (link) =>
              link.href === "/portal/purchase-request" || canUsePaymentTools,
          ),
        };
      }

      if (section.title === "Website Management") {
        return canUseWebsiteTools ? section : { ...section, links: [] };
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
