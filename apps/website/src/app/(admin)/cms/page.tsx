"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, DollarSign, MessageSquare, Settings, LayoutTemplate } from "lucide-react";

const dashboardItems = [
  {
    title: "Site Content",
    description: "Edit text, images, and content across all pages",
    href: "/cms/content",
    icon: LayoutTemplate,
  },
  {
    title: "About Us Page",
    description: "Edit the about us page content",
    href: "/cms/pages/about-us",
    icon: FileText,
  },
  {
    title: "Why Us Page",
    description: "Edit the why us page content",
    href: "/cms/pages/why-us",
    icon: FileText,
  },
  {
    title: "Pricing Tiers",
    description: "Manage pricing plans and features",
    href: "/cms/pricing",
    icon: DollarSign,
  },
  {
    title: "Contact Submissions",
    description: "View and manage contact form submissions",
    href: "/cms/contacts",
    icon: MessageSquare,
  },
];

export default function CMSDashboardPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">CMS Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Manage your website content from here
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {dashboardItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="hover:border-primary transition-colors cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <item.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Quick Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              • Use Site Content to edit text, images, and content across all pages
            </li>
            <li>
              • Use the page editor to update rich content on About Us and Why Us pages
            </li>
            <li>
              • Manage pricing tiers to update what&apos;s shown on the pricing page
            </li>
            <li>
              • Check contact submissions regularly to respond to user inquiries
            </li>
            <li>
              • Use &quot;Seed Default Content&quot; in Site Content to populate initial data
            </li>
            <li>
              • Changes are saved to Firestore and reflected immediately on the site
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
