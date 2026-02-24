"use client";

import { useFAQContent } from "@/lib/hooks/useFAQContent";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FAIcon } from "@/components/ui/FAIcon";
import type { FAQCategory } from "@/types/siteContent";

// Fallback content
const fallbackPage = {
  heroTitle: "Frequently Asked Questions",
  heroSubtitle: "Find answers to common questions about The Model Cloud",
  categories: [
    {
      title: "General",
      icon: "question-circle",
      items: [
        {
          question: "What is The Model Cloud?",
          answer:
            "The Model Cloud is a modern platform for model booking and talent management. We connect models with clients and agencies, making the booking process seamless and efficient.",
        },
        {
          question: "How do I get started?",
          answer:
            "Simply create an account by clicking 'Get Started' on our homepage. Models can sign up for free, while clients can choose from our flexible pricing plans.",
        },
      ],
    },
    {
      title: "For Models",
      icon: "camera",
      items: [
        {
          question: "Is it free to join as a model?",
          answer:
            "Yes! Model accounts are completely free. You can create your profile, upload your portfolio, and start receiving booking requests at no cost.",
        },
        {
          question: "How do I get verified?",
          answer:
            "After creating your profile, you can apply for verification. Our team will review your profile and portfolio to ensure authenticity.",
        },
      ],
    },
    {
      title: "For Clients",
      icon: "briefcase",
      items: [
        {
          question: "What are the different pricing plans?",
          answer:
            "We offer Starter (free), Professional, and Agency plans. Each plan includes different features to suit your needs. Visit our pricing page for full details.",
        },
        {
          question: "Can I cancel my subscription?",
          answer:
            "Yes, you can cancel your subscription at any time from your account settings. You'll continue to have access until the end of your billing period.",
        },
      ],
    },
    {
      title: "Payments & Billing",
      icon: "credit-card",
      items: [
        {
          question: "What payment methods do you accept?",
          answer:
            "We accept all major credit cards (Visa, MasterCard, American Express) through our secure payment processor, Stripe.",
        },
        {
          question: "How does billing work?",
          answer:
            "Subscriptions are billed monthly. You can view your invoices and payment history in your account settings.",
        },
      ],
    },
  ] as FAQCategory[],
};

const fallbackCTA = {
  title: "Still have questions?",
  subtitle:
    "Can't find the answer you're looking for? Please reach out to our friendly team.",
  buttonText: "Contact Us",
  buttonLink: "/contact",
};

function FAQCategorySection({ category }: { category: FAQCategory }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        {category.icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <FAIcon name={category.icon} className="h-5 w-5 text-primary" />
          </div>
        )}
        <h2 className="text-2xl font-bold">{category.title}</h2>
      </div>
      <div className="space-y-4">
        {category.items.map((item, index) => (
          <Card key={index}>
            <CardHeader className="pb-2">
              <h3 className="font-semibold text-lg">{item.question}</h3>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{item.answer}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function FAQContent() {
  const { content, loading } = useFAQContent();

  const heroTitle = content.page?.heroTitle ?? fallbackPage.heroTitle;
  const heroSubtitle = content.page?.heroSubtitle ?? fallbackPage.heroSubtitle;
  const categories = content.page?.categories ?? fallbackPage.categories;
  const cta = content.cta ?? fallbackCTA;

  if (loading) {
    return (
      <>
        <section className="py-20 bg-gradient-to-br from-primary/5 via-background to-accent/20">
          <div className="container">
            <div className="text-center max-w-3xl mx-auto">
              <Skeleton className="h-12 w-3/4 mx-auto mb-4" />
              <Skeleton className="h-6 w-full mx-auto" />
            </div>
          </div>
        </section>
        <section className="py-16">
          <div className="container max-w-4xl">
            <Skeleton className="h-64 mb-8" />
            <Skeleton className="h-64 mb-8" />
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-primary/5 via-background to-accent/20">
        <div className="container">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{heroTitle}</h1>
            <p className="text-xl text-muted-foreground">{heroSubtitle}</p>
          </div>
        </div>
      </section>

      {/* FAQ Categories */}
      <section className="py-16">
        <div className="container max-w-4xl">
          {categories.map((category, index) => (
            <FAQCategorySection key={index} category={category} />
          ))}
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-4">{cta.title}</h2>
            <p className="text-muted-foreground mb-6">{cta.subtitle}</p>
            <a
              href={cta.buttonLink}
              className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
            >
              {cta.buttonText}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
