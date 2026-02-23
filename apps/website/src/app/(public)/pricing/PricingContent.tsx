"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PricingCard } from "@/components/pricing/PricingCard";
import { Check, HelpCircle, Users, Camera, Star } from "lucide-react";
import { usePricingTiers } from "@/lib/hooks/usePricingTiers";
import { usePricingContent } from "@/lib/hooks/usePricingContent";
import { PLATFORM_URLS } from "@/lib/urls";

// Fallback data
const fallbackModelFeatures = [
  "Complete profile with unlimited photos",
  "Portfolio showcase",
  "Receive booking requests",
  "Direct messaging with clients",
  "Analytics & insights",
  "Verified badge eligibility",
  "Community access",
  "Mobile app access",
];

const fallbackFaqs = [
  {
    question: "Is it really free for models?",
    answer:
      "Yes! Model accounts are completely free. We believe in empowering talent to showcase their work without barriers. You get full access to all model features at no cost.",
  },
  {
    question: "Can I change my client plan later?",
    answer:
      "Yes, you can upgrade or downgrade your plan at any time. Changes take effect at the start of your next billing cycle.",
  },
  {
    question: "Is there a free trial for paid plans?",
    answer:
      "Yes! All paid client plans come with a 14-day free trial. No credit card required to start.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept all major credit cards (Visa, MasterCard, American Express) as well as PayPal.",
  },
  {
    question: "Can I cancel my subscription?",
    answer:
      "Yes, you can cancel your subscription at any time from your account settings. You'll continue to have access until the end of your billing period.",
  },
];

// Fallback pricing tiers when Firestore is empty
const fallbackTiers: import("@/types/pricing").PricingTier[] = [
  {
    id: "starter",
    name: "Starter",
    description: "Perfect for individuals just getting started",
    price: 0,
    billingPeriod: "monthly",
    features: [
      "Browse model profiles",
      "Save up to 10 favorites",
      "Basic search filters",
      "Email support",
    ],
    highlighted: false,
    order: 1,
    published: true,
    hide: false,
  },
  {
    id: "professional",
    name: "Professional",
    description: "For growing businesses with regular booking needs",
    price: 49,
    billingPeriod: "monthly",
    features: [
      "Everything in Starter",
      "Unlimited favorites",
      "Advanced search & filters",
      "Direct messaging",
      "Up to 5 team members",
      "Priority support",
    ],
    highlighted: true,
    order: 2,
    published: true,
    hide: false,
  },
  {
    id: "agency",
    name: "Agency",
    description: "For agencies managing multiple clients and campaigns",
    price: 149,
    billingPeriod: "monthly",
    features: [
      "Everything in Professional",
      "Unlimited team members",
      "Client workspaces",
      "Booking analytics",
      "API access",
      "Dedicated account manager",
    ],
    highlighted: false,
    order: 3,
    published: true,
    hide: false,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "Custom solutions for large organizations",
    price: 0,
    billingPeriod: "monthly",
    features: [
      "Everything in Agency",
      "Custom integrations",
      "SLA guarantee",
      "On-premise options",
      "Custom branding",
      "Dedicated support team",
    ],
    highlighted: false,
    order: 4,
    published: true,
    hide: false,
  },
];

export default function PricingContent() {
  const { tiers: firestoreTiers, loading: tiersLoading } = usePricingTiers();
  const { content, loading: contentLoading } = usePricingContent();

  const loading = tiersLoading || contentLoading;

  // Use fallback tiers if Firestore returns empty
  const tiers = firestoreTiers.length > 0 ? firestoreTiers : fallbackTiers;

  const hero = content.hero ?? {
    title: "Simple, Transparent Pricing",
    subtitle:
      "Free for models. Flexible plans for clients looking to discover and book talent.",
  };

  const modelFeatures = content.modelFeatures?.items ?? fallbackModelFeatures;
  const faqs = content.faqs?.items ?? fallbackFaqs;

  if (loading) {
    return (
      <>
        <section className="py-20 bg-gradient-to-br from-primary/5 via-background to-accent/20">
          <div className="container">
            <div className="text-center max-w-3xl mx-auto">
              <Skeleton className="h-12 w-3/4 mx-auto mb-6" />
              <Skeleton className="h-6 w-full mx-auto mb-8" />
              <div className="flex justify-center gap-4">
                <Skeleton className="h-12 w-32" />
                <Skeleton className="h-12 w-32" />
              </div>
            </div>
          </div>
        </section>
        <section className="py-20">
          <div className="container">
            <div className="max-w-4xl mx-auto">
              <Skeleton className="h-96 w-full rounded-lg" />
            </div>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      {/* Hero */}
      <section className="py-20 bg-gradient-to-br from-primary/5 via-background to-accent/20">
        <div className="container">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">{hero.title}</h1>
            <p className="text-xl text-muted-foreground mb-8">{hero.subtitle}</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button variant="outline" size="lg" asChild>
                <a href="#models">I&apos;m a Model</a>
              </Button>
              <Button size="lg" asChild>
                <a href="#clients">I&apos;m a Client</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Models Section */}
      <section id="models" className="py-20 scroll-mt-20">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
                <Camera className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-3xl font-bold mb-4">For Models</h2>
              <p className="text-xl text-muted-foreground">
                Your talent deserves to be seen. Join for free.
              </p>
            </div>

            <Card className="border-primary/50 shadow-lg">
              <CardHeader className="text-center pb-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                  <span className="text-sm font-medium text-muted-foreground">
                    Always Free
                  </span>
                </div>
                <h3 className="text-2xl font-bold">Model Account</h3>
                <p className="text-muted-foreground">
                  Everything you need to showcase your talent and get booked
                </p>
                <div className="mt-4">
                  <span className="text-5xl font-bold">£0</span>
                  <span className="text-muted-foreground">/forever</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-4">
                  {modelFeatures.map((feature) => (
                    <div key={feature} className="flex items-start">
                      <Check className="h-5 w-5 text-primary shrink-0 mr-3 mt-0.5" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="pt-4">
                <Button className="w-full" size="lg" asChild>
                  <a href={PLATFORM_URLS.signUpModel}>Create Your Free Profile</a>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </section>

      {/* Clients Section */}
      <section id="clients" className="py-20 bg-muted/30 scroll-mt-20">
        <div className="container">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-3xl font-bold mb-4">For Clients</h2>
            <p className="text-xl text-muted-foreground">
              Find and book the perfect talent for your projects
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {tiers
              .filter((tier) => !tier.hide)
              .map((tier) => (
                <PricingCard key={tier.id} tier={tier} allTiers={tiers} />
              ))}
          </div>
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="py-20">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-4">
            Compare Client Plans
          </h2>
          <p className="text-center text-muted-foreground mb-12">
            Choose the plan that fits your hiring needs
          </p>
          <div className="max-w-4xl mx-auto overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-4 px-4">Feature</th>
                  <th className="text-center py-4 px-4">Starter</th>
                  <th className="text-center py-4 px-4 bg-primary/5">
                    Professional
                  </th>
                  <th className="text-center py-4 px-4">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-4 px-4">Saved Favorites</td>
                  <td className="text-center py-4 px-4">10</td>
                  <td className="text-center py-4 px-4 bg-primary/5">
                    Unlimited
                  </td>
                  <td className="text-center py-4 px-4">Unlimited</td>
                </tr>
                <tr className="border-b">
                  <td className="py-4 px-4">Team Members</td>
                  <td className="text-center py-4 px-4">1</td>
                  <td className="text-center py-4 px-4 bg-primary/5">5</td>
                  <td className="text-center py-4 px-4">Unlimited</td>
                </tr>
                <tr className="border-b">
                  <td className="py-4 px-4">Advanced Search</td>
                  <td className="text-center py-4 px-4">-</td>
                  <td className="text-center py-4 px-4 bg-primary/5">
                    <Check className="h-5 w-5 text-primary mx-auto" />
                  </td>
                  <td className="text-center py-4 px-4">
                    <Check className="h-5 w-5 text-primary mx-auto" />
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-4 px-4">Direct Messaging</td>
                  <td className="text-center py-4 px-4">-</td>
                  <td className="text-center py-4 px-4 bg-primary/5">
                    <Check className="h-5 w-5 text-primary mx-auto" />
                  </td>
                  <td className="text-center py-4 px-4">
                    <Check className="h-5 w-5 text-primary mx-auto" />
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-4 px-4">Booking Analytics</td>
                  <td className="text-center py-4 px-4">-</td>
                  <td className="text-center py-4 px-4 bg-primary/5">
                    <Check className="h-5 w-5 text-primary mx-auto" />
                  </td>
                  <td className="text-center py-4 px-4">
                    <Check className="h-5 w-5 text-primary mx-auto" />
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-4 px-4">API Access</td>
                  <td className="text-center py-4 px-4">-</td>
                  <td className="text-center py-4 px-4 bg-primary/5">-</td>
                  <td className="text-center py-4 px-4">
                    <Check className="h-5 w-5 text-primary mx-auto" />
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-4 px-4">Custom Branding</td>
                  <td className="text-center py-4 px-4">-</td>
                  <td className="text-center py-4 px-4 bg-primary/5">-</td>
                  <td className="text-center py-4 px-4">
                    <Check className="h-5 w-5 text-primary mx-auto" />
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-4 px-4">Dedicated Account Manager</td>
                  <td className="text-center py-4 px-4">-</td>
                  <td className="text-center py-4 px-4 bg-primary/5">-</td>
                  <td className="text-center py-4 px-4">
                    <Check className="h-5 w-5 text-primary mx-auto" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 bg-muted/30 scroll-mt-20">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-muted-foreground">
              Have more questions?{" "}
              <Link href="/contact" className="text-primary hover:underline">
                Contact us
              </Link>
            </p>
          </div>
          <div className="max-w-3xl mx-auto space-y-6">
            {faqs.map((faq) => (
              <div key={faq.question} className="border rounded-lg p-6 bg-background">
                <h3 className="font-semibold flex items-center mb-2">
                  <HelpCircle className="h-5 w-5 text-primary mr-2" />
                  {faq.question}
                </h3>
                <p className="text-muted-foreground ml-7">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-muted-foreground mb-8">
              Join thousands of professionals already using The Model Cloud.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button variant="outline" size="lg" asChild>
                <a href={PLATFORM_URLS.signUpModel}>Join as a Model</a>
              </Button>
              <Button size="lg" asChild>
                <a href={PLATFORM_URLS.signUpClient}>Sign Up as a Client</a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
