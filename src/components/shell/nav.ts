import { FileText, LayoutDashboard, Package, Settings, Users, type LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

export const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/items", label: "Items", icon: Package },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

/** Editor routes have their own sticky action bar; hide the mobile nav there. */
export function isEditorPath(pathname: string) {
  return pathname === "/invoices/new" || /^\/invoices\/[^/]+\/edit$/.test(pathname);
}
