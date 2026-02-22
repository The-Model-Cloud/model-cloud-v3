"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/lib/hooks/useAuth";
import { seedAllContent } from "@/lib/firebase/seedContent";
import {
  Home,
  Info,
  HelpCircle,
  Phone,
  DollarSign,
  Loader2,
  Database,
  ArrowLeft,
} from "lucide-react";

const contentSections = [
  {
    category: "Homepage",
    icon: Home,
    sections: [
      { id: "home-hero", label: "Hero Section", description: "Main headline, badge, and CTAs" },
      { id: "home-features", label: "Features", description: "Feature cards with icons" },
      { id: "home-howItWorks", label: "How It Works", description: "Step-by-step guide" },
      { id: "home-testimonials", label: "Testimonials", description: "Customer quotes and ratings" },
      { id: "home-cta", label: "Call to Action", description: "Bottom CTA section" },
    ],
  },
  {
    category: "About Us",
    icon: Info,
    sections: [
      { id: "aboutUs-hero", label: "Hero Section", description: "Page title and subtitle" },
      { id: "aboutUs-story", label: "Our Story", description: "Company story content" },
      { id: "aboutUs-values", label: "Our Values", description: "Core values with icons" },
      { id: "aboutUs-stats", label: "Statistics", description: "Key metrics and numbers" },
      { id: "aboutUs-team", label: "Team Members", description: "Team bios and photos" },
    ],
  },
  {
    category: "Why Us",
    icon: HelpCircle,
    sections: [
      { id: "whyUs-hero", label: "Hero Section", description: "Page title and subtitle" },
      { id: "whyUs-benefits", label: "Benefits", description: "Key benefits with icons" },
      { id: "whyUs-comparisons", label: "Comparisons", description: "Feature comparison table" },
      { id: "whyUs-testimonials", label: "Testimonials", description: "Customer testimonials" },
    ],
  },
  {
    category: "Contact",
    icon: Phone,
    sections: [
      { id: "contact-info", label: "Contact Information", description: "Email, phone, address, hours" },
    ],
  },
  {
    category: "Pricing",
    icon: DollarSign,
    sections: [
      { id: "pricing-hero", label: "Hero Section", description: "Page title and subtitle" },
      { id: "pricing-modelFeatures", label: "Model Features", description: "Features for models section" },
      { id: "pricing-faqs", label: "FAQs", description: "Frequently asked questions" },
    ],
  },
];

export default function ContentDashboardPage() {
  const router = useRouter();
  const { firebaseUser } = useAuth();
  const [seeding, setSeeding] = useState(false);

  async function handleSeed() {
    if (!firebaseUser) {
      toast.error("You must be logged in to seed content");
      return;
    }

    setSeeding(true);
    try {
      await seedAllContent(firebaseUser.uid);
      toast.success("Content seeded successfully!");
    } catch (error) {
      console.error("Error seeding content:", error);
      toast.error("Failed to seed content");
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/cms")}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Site Content</h1>
            <p className="text-muted-foreground mt-1">
              Edit text, images, and content across all pages
            </p>
          </div>
        </div>
        <Button onClick={handleSeed} disabled={seeding} variant="outline">
          {seeding ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Database className="h-4 w-4 mr-2" />
          )}
          Seed Default Content
        </Button>
      </div>

      <div className="space-y-8">
        {contentSections.map((category) => (
          <div key={category.category}>
            <div className="flex items-center gap-2 mb-4">
              <category.icon className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">{category.category}</h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {category.sections.map((section) => (
                <Link key={section.id} href={`/cms/content/${section.id}`}>
                  <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{section.label}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {section.description}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
