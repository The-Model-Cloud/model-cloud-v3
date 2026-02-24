"use client";

import { useLegalContent } from "@/lib/hooks/useLegalContent";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { showPreferencesModal } from "@/components/CookieConsent";

// Fallback content
const fallbackContent = {
  title: "Cookies Policy",
  lastUpdated: "January 1, 2024",
  content: `
## What Are Cookies

Cookies are small text files that are placed on your computer or mobile device when you visit a website. They are widely used to make websites work more efficiently and to provide information to the owners of the site.

## How We Use Cookies

The Model Cloud uses cookies and similar technologies to:
- Keep you signed in to your account
- Remember your preferences and settings
- Understand how you use our platform
- Improve our services and user experience
- Provide personalized content and features

## Types of Cookies We Use

### Essential Cookies
These cookies are necessary for the website to function properly. They enable core functionality such as security, network management, and account access. You cannot opt out of these cookies.

### Performance Cookies
These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously. This helps us improve our website's performance.

### Functional Cookies
These cookies enable enhanced functionality and personalization, such as remembering your preferences and settings.

### Analytics Cookies
We use analytics cookies to understand how our visitors use the website. This helps us improve the way our website works, for example, by ensuring that users find what they are looking for easily.

## Third-Party Cookies

Some cookies are placed by third-party services that appear on our pages. We use the following third-party services:
- **Google Analytics** - For website analytics and performance monitoring
- **Stripe** - For secure payment processing
- **Firebase** - For authentication and data storage

## Managing Cookies

Most web browsers allow you to control cookies through their settings preferences. However, limiting cookies may impact your experience on our website.

### How to Control Cookies
- **Browser Settings**: You can set your browser to refuse cookies or delete certain cookies
- **Cookie Consent**: When you first visit our site, you can choose which types of cookies to accept
- **Opt-Out Links**: Many third-party services provide opt-out mechanisms

## Cookie Retention

Different cookies are retained for different periods:
- **Session Cookies**: Deleted when you close your browser
- **Persistent Cookies**: Remain on your device for a set period or until you delete them

## Updates to This Policy

We may update this Cookies Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last Updated" date.

## Contact Us

If you have questions about our use of cookies, please contact us at:
- Email: privacy@themodel.cloud
  `,
};

export default function CookiesContent() {
  const { content, loading } = useLegalContent("legal-cookies");

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
            <p className="text-muted-foreground mb-6">Last updated: {lastUpdated}</p>
            <Button onClick={showPreferencesModal} variant="outline">
              Manage Cookie Preferences
            </Button>
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
