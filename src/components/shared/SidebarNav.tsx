"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  MessageSquare,
  Users,
  BarChart2,
  Settings,
} from "lucide-react";

const navItems = [
  {
    href: "/dashboard/inbox",
    label: "Inbox",
    icon: MessageSquare,
  },
  {
    href: "/dashboard/leads",
    label: "Leads",
    icon: Users,
  },
  {
    href: "/dashboard/analytics",
    label: "Analytics",
    icon: BarChart2,
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    icon: Settings,
  },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <ul className="space-y-1">
      {navItems.map((item) => {
        const isActive = pathname.startsWith(item.href);
        const Icon = item.icon;

        return (
          <li key={item.href}>
            <Link
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-green-50 text-green-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 flex-shrink-0",
                  isActive ? "text-green-600" : "text-gray-400"
                )}
              />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
