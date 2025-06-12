import {
  LayoutDashboard,
  Globe,
  UsersRound,
  Send,
  Settings,
  BellRing,
  type LucideIcon,
} from 'lucide-react';

export interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
  disabled?: boolean;
}

export const NAV_LINKS: NavLink[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/domains", label: "Domains", icon: Globe },
  { href: "/subscribers", label: "Subscribers", icon: UsersRound },
  { href: "/campaigns", label: "Campaigns", icon: Send },
  { href: "/campaigns/new", label: "New Campaign", icon: BellRing },
  // { href: "/settings", label: "Settings", icon: Settings, disabled: true }, // Example for later
];
