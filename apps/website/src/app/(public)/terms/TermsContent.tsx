"use client";

import { useLegalContent } from "@/lib/hooks/useLegalContent";
import { Skeleton } from "@/components/ui/skeleton";

// Fallback content
const fallbackContent = {
  title: "Terms of Service",
  lastUpdated: "January 1, 2024",
  content: `
## Agreement to Terms

By accessing or using The Model Cloud platform, you agree to be bound by these Terms of Service. If you disagree with any part of these terms, you may not access the service.

## Description of Service

The Model Cloud provides a platform connecting models with clients and agencies for booking and talent management purposes. Our services include:
- Profile creation and management
- Portfolio hosting
- Booking facilitation
- Messaging and communication tools
- Payment processing

## User Accounts

### Account Creation
To use certain features of our service, you must create an account. You agree to:
- Provide accurate and complete information
- Maintain the security of your account credentials
- Promptly update any changes to your information
- Accept responsibility for all activities under your account

### Account Termination
We reserve the right to suspend or terminate accounts that:
- Violate these terms
- Engage in fraudulent or illegal activities
- Misrepresent their identity or credentials
- Harass other users

## User Content

### Your Content
You retain ownership of content you upload to The Model Cloud. By posting content, you grant us a license to use, display, and distribute your content in connection with our services.

### Content Guidelines
You agree not to post content that:
- Infringes on intellectual property rights
- Contains illegal or harmful material
- Misrepresents your identity or qualifications
- Violates privacy rights of others

## Payments and Fees

### Client Subscriptions
Clients may subscribe to paid plans with features and pricing as described on our pricing page. Subscriptions are billed monthly unless otherwise specified.

### Refund Policy
Subscription fees are non-refundable except as required by law or at our sole discretion.

## Intellectual Property

The Model Cloud name, logo, and all related marks are our trademarks. You may not use these without our written permission.

## Limitation of Liability

To the maximum extent permitted by law, The Model Cloud shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of our services.

## Indemnification

You agree to indemnify and hold harmless The Model Cloud and its affiliates from any claims, damages, or expenses arising from your use of the service or violation of these terms.

## Changes to Terms

We may modify these terms at any time. We will notify users of significant changes via email or platform notification. Continued use of the service after changes constitutes acceptance of the new terms.

## Governing Law

These terms shall be governed by and construed in accordance with the laws of the United Kingdom, without regard to its conflict of law provisions.

## Contact Information

For questions about these Terms of Service, please contact us at:
- Email: legal@themodel.cloud
- Address: [Company Address]
  `,
};

export default function TermsContent() {
  const { content, loading } = useLegalContent("legal-terms");

  const title = content?.title ?? fallbackContent.title;
  const lastUpdated = content?.lastUpdated ?? fallbackContent.lastUpdated;
  const pageContent = content?.content ?? fallbackContent.content;

  if (loading) {
    return (
      <>
        <section className="py-20 bg-gradient-to-br from-primary/5 via-background to-accent/20">
          <div className="container">
            <div className="text-center max-w-3xl mx-auto">
              <Skeleton className="h-12 w-1/2 mx-auto mb-4" />
              <Skeleton className="h-6 w-1/4 mx-auto" />
            </div>
          </div>
        </section>
        <section className="py-16">
          <div className="container max-w-4xl">
            <Skeleton className="h-96" />
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
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{title}</h1>
            <p className="text-muted-foreground">Last updated: {lastUpdated}</p>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-16">
        <div className="container max-w-4xl">
          <div
            className="prose prose-lg dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: formatContent(pageContent) }}
          />
        </div>
      </section>
    </>
  );
}

// Simple markdown-like formatting
function formatContent(content: string): string {
  return content
    .replace(/^## (.+)$/gm, '<h2 class="text-2xl font-bold mt-8 mb-4">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 class="text-xl font-semibold mt-6 mb-3">$1</h3>')
    .replace(/^\- (.+)$/gm, '<li class="ml-4">$1</li>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n\n/g, '</p><p class="mb-4">')
    .replace(/^(?!<)(.+)$/gm, '<p class="mb-4">$1</p>')
    .replace(/<p class="mb-4"><\/p>/g, '');
}
