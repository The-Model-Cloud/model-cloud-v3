"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DynamicIcon } from "@/components/ui/DynamicIcon";
import { Skeleton } from "@/components/ui/skeleton";
import { useWhyUsContent } from "@/lib/hooks/useWhyUsContent";
import { PLATFORM_URLS } from "@/lib/urls";
import { cloudinaryAvatar } from "@/lib/cloudinary";
import { CheckCircle, Star, Award } from "lucide-react";

// Fallback data
const fallbackBenefits = [
  {
    icon: "Zap",
    title: "Lightning Fast Bookings",
    description:
      "Our streamlined process means you can go from discovery to confirmed booking in minutes, not days.",
  },
  {
    icon: "Shield",
    title: "Secure & Protected",
    description:
      "Bank-level security for your data and transactions. Your privacy and safety are our top priority.",
  },
  {
    icon: "TrendingUp",
    title: "Grow Your Business",
    description:
      "Powerful analytics and insights help you understand your performance and make data-driven decisions.",
  },
  {
    icon: "Clock",
    title: "Save Valuable Time",
    description:
      "Automate tedious tasks like scheduling, invoicing, and follow-ups so you can focus on what matters.",
  },
  {
    icon: "HeartHandshake",
    title: "Quality Connections",
    description:
      "Our verification system ensures you're connecting with legitimate, professional partners.",
  },
  {
    icon: "Award",
    title: "Industry Recognition",
    description:
      "Trusted by leading agencies and brands worldwide. Join a platform with a proven track record.",
  },
];

const fallbackComparisons = [
  {
    feature: "Booking Time",
    traditional: "Days to weeks",
    modelCloud: "Minutes to hours",
  },
  {
    feature: "Commission Fees",
    traditional: "20-40%",
    modelCloud: "Transparent flat rates",
  },
  {
    feature: "Payment Processing",
    traditional: "30-90 days",
    modelCloud: "Within 48 hours",
  },
  {
    feature: "Portfolio Management",
    traditional: "Scattered files",
    modelCloud: "Centralized & organized",
  },
  {
    feature: "Global Reach",
    traditional: "Limited networks",
    modelCloud: "50+ countries",
  },
  {
    feature: "Support",
    traditional: "Business hours only",
    modelCloud: "24/7 available",
  },
];

const fallbackTestimonials: { quote: string; author: string; role: string; imageUrl?: string }[] = [
  {
    quote:
      "Switching to The Model Cloud was the best decision for my agency. We've increased our booking efficiency by 70%.",
    author: "David Kim",
    role: "Agency Owner",
  },
  {
    quote:
      "As an independent model, this platform gave me access to opportunities I never could have found on my own.",
    author: "Lisa Martinez",
    role: "Fashion Model",
  },
];

export default function WhyUsContent() {
  const { content, loading } = useWhyUsContent();

  const hero = content.hero ?? {
    title: "Why Choose The Model Cloud?",
    subtitle:
      "We're not just another booking platform. We're your partner in building a successful career in the modeling industry.",
  };

  const benefits = content.benefits?.items ?? fallbackBenefits;

  const comparisonSection = content.comparisons ?? {
    title: "The Model Cloud vs Traditional Methods",
    subtitle: "See how we compare to traditional booking methods",
    items: fallbackComparisons,
  };
  const comparisons = comparisonSection.items ?? fallbackComparisons;

  const forModelsSection = content.forModels ?? {
    title: "For Models",
    features: [
      { title: "Professional Portfolio", description: "Showcase your work with a stunning, professional portfolio that gets noticed." },
      { title: "Direct Client Access", description: "Connect directly with brands and agencies without middlemen." },
      { title: "Career Management", description: "Tools to manage your schedule, track earnings, and grow your career." },
    ],
    ctaTitle: "Join 10,000+ Models",
    ctaSubtitle: "Building successful careers on The Model Cloud",
    ctaButtonText: "Start Your Journey",
    ctaButtonLink: PLATFORM_URLS.signUp,
  };

  const forClientsSection = content.forClients ?? {
    title: "For Clients",
    features: [
      { title: "Verified Talent Pool", description: "Access pre-vetted, professional models ready for your projects." },
      { title: "Streamlined Booking", description: "Book talent in minutes with our intuitive booking system." },
      { title: "Budget Management", description: "Transparent pricing and powerful budget tracking tools." },
    ],
    ctaTitle: "Trusted by 5,000+ Clients",
    ctaSubtitle: "From startups to Fortune 500 brands",
    ctaButtonText: "Find Talent Today",
    ctaButtonLink: PLATFORM_URLS.signUp,
  };

  const testimonials = content.testimonials?.items ?? fallbackTestimonials;

  const ctaSection = content.cta ?? {
    title: "Ready to Experience the Difference?",
    subtitle: "Join thousands of professionals who've already made the switch.",
    buttonText: "Get Started Free",
    buttonLink: PLATFORM_URLS.signUp,
  };

  if (loading) {
    return (
      <>
        <section className="py-20 bg-gradient-to-br from-primary/5 via-background to-accent/20">
          <div className="container">
            <div className="text-center max-w-3xl mx-auto">
              <Skeleton className="h-12 w-3/4 mx-auto mb-6" />
              <Skeleton className="h-6 w-full mx-auto" />
            </div>
          </div>
        </section>
        <section className="py-20">
          <div className="container">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="border-none shadow-none">
                  <CardContent className="pt-6">
                    <Skeleton className="w-12 h-12 rounded-lg mb-4" />
                    <Skeleton className="h-6 w-2/3 mb-2" />
                    <Skeleton className="h-16 w-full" />
                  </CardContent>
                </Card>
              ))}
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
            <p className="text-xl text-muted-foreground">{hero.subtitle}</p>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20">
        <div className="container">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit) => (
              <Card key={benefit.title} className="border-none shadow-none">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <DynamicIcon name={benefit.icon} className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{benefit.title}</h3>
                  <p className="text-muted-foreground">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">{comparisonSection.title}</h2>
            <p className="text-muted-foreground">{comparisonSection.subtitle}</p>
          </div>
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="font-semibold">Feature</div>
              <div className="font-semibold text-center text-muted-foreground">
                Traditional
              </div>
              <div className="font-semibold text-center text-primary">
                The Model Cloud
              </div>
            </div>
            {comparisons.map((item) => (
              <div
                key={item.feature}
                className="grid grid-cols-3 gap-4 py-4 border-t"
              >
                <div className="font-medium">{item.feature}</div>
                <div className="text-center text-muted-foreground">
                  {item.traditional}
                </div>
                <div className="text-center text-primary flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {item.modelCloud}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Models */}
      <section className="py-20">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">{forModelsSection.title}</h2>
              <ul className="space-y-4">
                {forModelsSection.features.map((feature) => (
                  <li key={feature.title} className="flex items-start">
                    <CheckCircle className="h-6 w-6 text-primary shrink-0 mr-3" />
                    <div>
                      <span className="font-medium">{feature.title}</span>
                      <p className="text-muted-foreground">{feature.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-gradient-to-br from-primary/20 to-purple-400/20 rounded-2xl p-8 text-center">
              <Star className="h-16 w-16 text-primary mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-2">{forModelsSection.ctaTitle}</h3>
              <p className="text-muted-foreground mb-6">{forModelsSection.ctaSubtitle}</p>
              <Button asChild>
                <a href={forModelsSection.ctaButtonLink}>{forModelsSection.ctaButtonText}</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* For Clients */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1 bg-gradient-to-br from-primary/20 to-purple-400/20 rounded-2xl p-8 text-center">
              <Award className="h-16 w-16 text-primary mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-2">{forClientsSection.ctaTitle}</h3>
              <p className="text-muted-foreground mb-6">{forClientsSection.ctaSubtitle}</p>
              <Button asChild>
                <a href={forClientsSection.ctaButtonLink}>{forClientsSection.ctaButtonText}</a>
              </Button>
            </div>
            <div className="order-1 md:order-2">
              <h2 className="text-3xl font-bold mb-6">{forClientsSection.title}</h2>
              <ul className="space-y-4">
                {forClientsSection.features.map((feature) => (
                  <li key={feature.title} className="flex items-start">
                    <CheckCircle className="h-6 w-6 text-primary shrink-0 mr-3" />
                    <div>
                      <span className="font-medium">{feature.title}</span>
                      <p className="text-muted-foreground">{feature.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-12">
            What Our Users Say
          </h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {testimonials.map((testimonial) => {
              const avatarUrl = cloudinaryAvatar(testimonial.imageUrl, 80);
              return (
                <Card key={testimonial.author} className="bg-muted/30">
                  <CardContent className="pt-6">
                    <div className="flex mb-4">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star
                          key={i}
                          className="h-5 w-5 text-yellow-500 fill-yellow-500"
                        />
                      ))}
                    </div>
                    <blockquote className="text-lg mb-4">
                      &ldquo;{testimonial.quote}&rdquo;
                    </blockquote>
                    <div className="flex items-center">
                      {avatarUrl ? (
                        <div className="w-10 h-10 rounded-full mr-3 overflow-hidden">
                          <Image
                            src={avatarUrl}
                            alt={testimonial.author}
                            width={40}
                            height={40}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : null}
                      <div>
                        <p className="font-semibold">{testimonial.author}</p>
                        <p className="text-sm text-muted-foreground">
                          {testimonial.role}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-primary to-purple-600">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-4">{ctaSection.title}</h2>
            <p className="text-white/80 mb-8">{ctaSection.subtitle}</p>
            <Button
              size="lg"
              variant="secondary"
              className="bg-white text-primary hover:bg-white/90"
              asChild
            >
              <a href={ctaSection.buttonLink}>{ctaSection.buttonText}</a>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
