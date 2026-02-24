"use client";

import { useLegalContent } from "@/lib/hooks/useLegalContent";
import { Skeleton } from "@/components/ui/skeleton";

// Fallback content
const fallbackContent = {
  title: "Privacy Policy",
  lastUpdated: "January 1, 2024",
  content: `
## Introduction

Welcome to The Model Cloud. We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our services.

## Information We Collect

### Personal Information
We collect personal information that you voluntarily provide to us when you register on the platform, express an interest in obtaining information about us or our products and services, or otherwise contact us.

The personal information we collect may include:
- Name and contact information (email address, phone number)
- Profile information (photos, bio, portfolio)
- Payment and billing information
- Communication preferences

### Automatically Collected Information
When you visit our website, we automatically collect certain information about your device, including:
- IP address
- Browser type
- Operating system
- Access times
- Pages viewed

## How We Use Your Information

We use the information we collect to:
- Create and manage your account
- Process transactions and send related information
- Send promotional communications (with your consent)
- Improve our website and services
- Respond to inquiries and offer support
- Ensure platform security and prevent fraud

## Sharing Your Information

We may share your information in the following situations:
- **With Service Providers:** We may share your information with third-party vendors who perform services on our behalf
- **For Business Transfers:** In connection with any merger, sale of company assets, or acquisition
- **With Your Consent:** We may disclose your information for any other purpose with your consent

## Data Security

We implement appropriate technical and organizational security measures to protect your personal information. However, no electronic transmission or storage is 100% secure.

## Your Rights

Depending on your location, you may have rights including:
- Access to your personal data
- Correction of inaccurate data
- Deletion of your data
- Data portability
- Objection to processing

## Contact Us

If you have questions about this Privacy Policy, please contact us at:
- Email: privacy@themodel.cloud
- Address: [Company Address]
  `,
};

export default function PrivacyContent() {
  const { content, loading } = useLegalContent("legal-privacy");

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
