import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/AuthContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import CookieConsentBanner from "@/components/CookieConsent";
import "./globals.css";

const GTM_ID = "GTM-KFR9R2G";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "The Model Cloud | Modern Model Booking Platform",
    template: "%s | The Model Cloud",
  },
  description:
    "The modern platform for model booking and talent management. Connect with top models and streamline your booking process.",
  keywords: [
    "model booking",
    "talent management",
    "fashion",
    "models",
    "booking platform",
  ],
  authors: [{ name: "The Model Cloud" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://themodel.cloud",
    siteName: "The Model Cloud",
    title: "The Model Cloud | Modern Model Booking Platform",
    description:
      "The modern platform for model booking and talent management. Connect with top models and streamline your booking process.",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Model Cloud | Modern Model Booking Platform",
    description:
      "The modern platform for model booking and talent management.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* Google Tag Manager */}
      <Script
        id="gtm-script"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${GTM_ID}');
          `,
        }}
      />
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <SubscriptionProvider>
              {children}
              <Toaster position="top-right" />
              <CookieConsentBanner />
            </SubscriptionProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
