"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { DynamicIcon } from "@/components/ui/DynamicIcon";
import { useSiteContent } from "@/lib/hooks/useSiteContent";
import type { HomeFeatures } from "@/types/siteContent";

const fallbackFeatures = {
  sectionTitle: "Everything You Need to Succeed",
  sectionSubtitle:
    "Powerful features designed to streamline your model booking workflow and help you grow your business.",
  items: [
    {
      icon: "Calendar",
      title: "Smart Scheduling",
      description:
        "Manage bookings, availability, and schedules with our intuitive calendar system. Never double-book again.",
    },
    {
      icon: "Users",
      title: "Talent Discovery",
      description:
        "Browse and filter through our curated pool of professional models. Find the perfect fit for every project.",
    },
    {
      icon: "BarChart3",
      title: "Analytics Dashboard",
      description:
        "Track performance, earnings, and booking trends with comprehensive analytics and reporting.",
    },
    {
      icon: "Shield",
      title: "Secure Payments",
      description:
        "Process payments securely with our integrated payment system. Transparent pricing, no hidden fees.",
    },
    {
      icon: "Zap",
      title: "Instant Notifications",
      description:
        "Stay updated with real-time notifications for bookings, messages, and important updates.",
    },
    {
      icon: "Globe",
      title: "Global Reach",
      description:
        "Connect with models and clients worldwide. Expand your network and grow your opportunities.",
    },
  ],
};

export function Features() {
  const { content, loading } = useSiteContent<HomeFeatures>("home-features");
  const features = content ?? fallbackFeatures;

  if (loading) {
    return (
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Skeleton className="h-10 w-3/4 mx-auto mb-4" />
            <Skeleton className="h-6 w-full mx-auto" />
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-background rounded-xl p-6 border">
                <Skeleton className="w-12 h-12 rounded-lg mb-4" />
                <Skeleton className="h-6 w-2/3 mb-2" />
                <Skeleton className="h-16 w-full" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-muted/30">
      <div className="container">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {features.sectionTitle}
          </h2>
          <p className="text-lg text-muted-foreground">
            {features.sectionSubtitle}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.items.map((feature) => (
            <div
              key={feature.title}
              className="group relative bg-background rounded-xl p-6 border hover:border-primary/50 transition-colors"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <DynamicIcon name={feature.icon} className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
