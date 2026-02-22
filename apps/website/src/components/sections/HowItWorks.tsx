"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { DynamicIcon } from "@/components/ui/DynamicIcon";
import { useSiteContent } from "@/lib/hooks/useSiteContent";
import type { HomeHowItWorks } from "@/types/siteContent";

const fallbackHowItWorks = {
  sectionTitle: "How It Works",
  sectionSubtitle:
    "Getting started is easy. Follow these simple steps to begin your journey with The Model Cloud.",
  items: [
    {
      icon: "UserPlus",
      step: "01",
      title: "Create Your Profile",
      description:
        "Sign up and build your professional profile. Models showcase their portfolio, clients outline their needs.",
    },
    {
      icon: "Search",
      step: "02",
      title: "Discover & Connect",
      description:
        "Browse through talent or opportunities. Use filters to find the perfect match for your project.",
    },
    {
      icon: "CalendarCheck",
      step: "03",
      title: "Book & Manage",
      description:
        "Send booking requests, negotiate terms, and manage your schedule all in one place.",
    },
    {
      icon: "Star",
      step: "04",
      title: "Collaborate & Grow",
      description:
        "Complete bookings, leave reviews, and build lasting professional relationships.",
    },
  ],
};

export function HowItWorks() {
  const { content, loading } = useSiteContent<HomeHowItWorks>("home-howItWorks");
  const howItWorks = content ?? fallbackHowItWorks;

  if (loading) {
    return (
      <section className="py-20">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Skeleton className="h-10 w-48 mx-auto mb-4" />
            <Skeleton className="h-6 w-full mx-auto" />
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="text-center">
                <Skeleton className="w-24 h-24 rounded-full mx-auto mb-4" />
                <Skeleton className="h-6 w-2/3 mx-auto mb-2" />
                <Skeleton className="h-16 w-full" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20">
      <div className="container">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {howItWorks.sectionTitle}
          </h2>
          <p className="text-lg text-muted-foreground">
            {howItWorks.sectionSubtitle}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {howItWorks.items.map((step, index) => (
            <div key={step.step} className="relative">
              {/* Connector line */}
              {index < howItWorks.items.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-[60%] w-full h-0.5 bg-gradient-to-r from-primary/50 to-primary/0" />
              )}

              <div className="text-center">
                <div className="relative inline-flex">
                  <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <DynamicIcon name={step.icon} className="h-10 w-10 text-primary" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                    {step.step}
                  </span>
                </div>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
