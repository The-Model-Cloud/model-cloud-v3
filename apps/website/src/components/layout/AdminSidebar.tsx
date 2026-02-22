"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  DollarSign,
  MessageSquare,
  ArrowLeft,
} from "lucide-react";

const sidebarLinks = [
  {
    href: "/cms",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/cms/pages/about-us",
    label: "About Us",
    icon: FileText,
  },
  {
    href: "/cms/pages/why-us",
    label: "Why Us",
    icon: FileText,
  },
  {
    href: "/cms/pricing",
    label: "Pricing Tiers",
    icon: DollarSign,
  },
  {
    href: "/cms/contacts",
    label: "Contact Submissions",
    icon: MessageSquare,
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 min-h-screen border-r bg-muted/30">
      <div className="p-6">
        <Link
          href="/"
          className="flex items-center text-sm text-muted-foreground hover:text-primary mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Site
        </Link>

        <h2 className="text-lg font-semibold mb-6">CMS Dashboard</h2>

        <nav className="space-y-2">
          {sidebarLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <link.icon className="h-4 w-4 mr-3" />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
