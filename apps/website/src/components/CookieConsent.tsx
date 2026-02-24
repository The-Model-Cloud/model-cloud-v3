"use client";

import { useEffect, useState } from "react";
import "vanilla-cookieconsent/dist/cookieconsent.css";
import * as CookieConsent from "vanilla-cookieconsent";
import { getSiteContent } from "@/lib/firebase/firestore";
import type { CookieConsentConfig, SiteContentId } from "@/types/siteContent";

// Default configuration values
const defaultConfig = {
  consentTitle: "We use cookies",
  consentDescription:
    "We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic. By clicking \"Accept All\", you consent to our use of cookies.",
  acceptAllButtonText: "Accept All",
  rejectAllButtonText: "Reject All",
  managePreferencesButtonText: "Manage Preferences",
  preferencesTitle: "Cookie Preferences",
  preferencesDescription:
    "We use cookies to ensure the basic functionalities of the website and to enhance your online experience. You can choose to opt in or out of each category whenever you want.",
  savePreferencesButtonText: "Save Preferences",
  essentialTitle: "Essential Cookies",
  essentialDescription:
    "These cookies are essential for the proper functioning of the website. They enable core functionality such as security, network management, and accessibility. You cannot disable these cookies.",
  analyticsTitle: "Analytics Cookies",
  analyticsDescription:
    "These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously. This helps us improve our website.",
  marketingTitle: "Marketing Cookies",
  marketingDescription:
    "These cookies are used to track visitors across websites. The intention is to display ads that are relevant and engaging for the individual user.",
};

export default function CookieConsentBanner() {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    async function initCookieConsent() {
      // Fetch CMS config
      let config = defaultConfig;
      try {
        const cmsConfig = await getSiteContent<CookieConsentConfig>("cookie-consent" as SiteContentId);
        if (cmsConfig) {
          config = {
            consentTitle: cmsConfig.consentTitle || defaultConfig.consentTitle,
            consentDescription: cmsConfig.consentDescription || defaultConfig.consentDescription,
            acceptAllButtonText: cmsConfig.acceptAllButtonText || defaultConfig.acceptAllButtonText,
            rejectAllButtonText: cmsConfig.rejectAllButtonText || defaultConfig.rejectAllButtonText,
            managePreferencesButtonText: cmsConfig.managePreferencesButtonText || defaultConfig.managePreferencesButtonText,
            preferencesTitle: cmsConfig.preferencesTitle || defaultConfig.preferencesTitle,
            preferencesDescription: cmsConfig.preferencesDescription || defaultConfig.preferencesDescription,
            savePreferencesButtonText: cmsConfig.savePreferencesButtonText || defaultConfig.savePreferencesButtonText,
            essentialTitle: cmsConfig.essentialTitle || defaultConfig.essentialTitle,
            essentialDescription: cmsConfig.essentialDescription || defaultConfig.essentialDescription,
            analyticsTitle: cmsConfig.analyticsTitle || defaultConfig.analyticsTitle,
            analyticsDescription: cmsConfig.analyticsDescription || defaultConfig.analyticsDescription,
            marketingTitle: cmsConfig.marketingTitle || defaultConfig.marketingTitle,
            marketingDescription: cmsConfig.marketingDescription || defaultConfig.marketingDescription,
          };
        }
      } catch (error) {
        console.error("Failed to fetch cookie consent config:", error);
      }

      CookieConsent.run({
        // Cookie settings
        cookie: {
          name: "cc_cookie",
          expiresAfterDays: 365,
        },

        // UI settings
        guiOptions: {
          consentModal: {
            layout: "box inline",
            position: "bottom right",
          },
          preferencesModal: {
            layout: "box",
          },
        },

        // Cookie categories
        categories: {
          necessary: {
            enabled: true,
            readOnly: true,
          },
          analytics: {
            autoClear: {
              cookies: [
                { name: /^_ga/ },
                { name: "_gid" },
              ],
            },
          },
          marketing: {
            autoClear: {
              cookies: [
                { name: /^_fb/ },
              ],
            },
          },
        },

        // Language configuration
        language: {
          default: "en",
          translations: {
            en: {
              consentModal: {
                title: config.consentTitle,
                description: config.consentDescription,
                acceptAllBtn: config.acceptAllButtonText,
                acceptNecessaryBtn: config.rejectAllButtonText,
                showPreferencesBtn: config.managePreferencesButtonText,
                footer: `
                  <a href="/privacy">Privacy Policy</a>
                  <a href="/cookies">Cookies Policy</a>
                `,
              },
              preferencesModal: {
                title: config.preferencesTitle,
                acceptAllBtn: config.acceptAllButtonText,
                acceptNecessaryBtn: config.rejectAllButtonText,
                savePreferencesBtn: config.savePreferencesButtonText,
                closeIconLabel: "Close",
                sections: [
                  {
                    title: "Cookie Usage",
                    description: config.preferencesDescription,
                  },
                  {
                    title: config.essentialTitle,
                    description: config.essentialDescription,
                    linkedCategory: "necessary",
                  },
                  {
                    title: config.analyticsTitle,
                    description: config.analyticsDescription,
                    linkedCategory: "analytics",
                    cookieTable: {
                      headers: {
                        name: "Name",
                        domain: "Domain",
                        description: "Description",
                        expiration: "Expiration",
                      },
                      body: [
                        {
                          name: "_ga",
                          domain: "themodel.cloud",
                          description: "Google Analytics - Used to distinguish users",
                          expiration: "2 years",
                        },
                        {
                          name: "_gid",
                          domain: "themodel.cloud",
                          description: "Google Analytics - Used to distinguish users",
                          expiration: "24 hours",
                        },
                      ],
                    },
                  },
                  {
                    title: config.marketingTitle,
                    description: config.marketingDescription,
                    linkedCategory: "marketing",
                  },
                  {
                    title: "More Information",
                    description:
                      'For any questions regarding our cookie policy, please <a href="/contact">contact us</a>.',
                  },
                ],
              },
            },
          },
        },
      });

      setInitialized(true);
    }

    if (!initialized) {
      initCookieConsent();
    }
  }, [initialized]);

  return null;
}

// Helper function to check if a category is accepted
export function isCategoryAccepted(category: string): boolean {
  return CookieConsent.acceptedCategory(category);
}

// Helper function to show preferences modal
export function showPreferencesModal(): void {
  CookieConsent.showPreferences();
}

// Helper function to show consent modal
export function showConsentModal(): void {
  CookieConsent.show();
}
