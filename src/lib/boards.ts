import type { IconName } from "@/lib/figma-icons";

/** Shared registry of workspace boards (used by Workspace home tabs). */
export const BOARD_META: {
  key: string;
  name: string;
  icon: IconName;
  href: string;
  /** backing table for created / last-modified stats (null = no data yet) */
  table: string | null;
}[] = [
  { key: "contacts", name: "Contacts", icon: "rowContacts", href: "/crm/contacts", table: "crm_contacts" },
  { key: "activities", name: "Activities", icon: "rowActivities", href: "/crm/activities", table: "crm_activity_items" },
  { key: "dashboard", name: "Sales Dashboard", icon: "rowDashboard", href: "/crm/dashboard", table: null },
  { key: "projects", name: "Client Projects", icon: "rowProjects", href: "/crm/projects", table: "crm_projects" },
  { key: "leads", name: "Leads", icon: "rowLeads", href: "/crm/leads", table: "crm_leads" },
  { key: "deals", name: "Deals", icon: "rowDeals", href: "/crm/deals", table: "crm_deals" },
  { key: "accounts", name: "Accounts", icon: "rowAccounts", href: "/crm/accounts", table: "crm_accounts" },
  { key: "products", name: "Products & Services", icon: "rowProducts", href: "/crm/products", table: "crm_products" },
  { key: "developments", name: "Developments", icon: "rowProjects", href: "/crm/developments", table: "crm_developments" },
  { key: "units", name: "Units", icon: "rowAccounts", href: "/crm/units", table: "crm_units" },
  { key: "viewings", name: "Viewings", icon: "rowActivities", href: "/crm/viewings", table: "crm_viewings" },
];
