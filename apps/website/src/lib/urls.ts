/**
 * Platform URL utilities
 *
 * DEV Environment:
 * - Platform: https://v4.themodel.cloud/
 * - Website: https://sandbox.themodel.cloud/
 *
 * LIVE Environment (when ready):
 * - Platform: https://app.themodel.cloud/
 * - Website: https://www.themodel.cloud/
 */

export const PLATFORM_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://v4.themodel.cloud";

export const platformUrl = (path: string) => {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${PLATFORM_URL}${cleanPath}`;
};

// Common platform URLs
export const PLATFORM_URLS = {
  signIn: platformUrl("/sign-in"),
  signUp: platformUrl("/sign-up"),
  signUpModel: platformUrl("/sign-up?type=model"),
  signUpClient: "/client/sign-up", // Client sign-up is on the website
  dashboard: platformUrl("/dashboard"),
  onboarding: platformUrl("/onboarding"),
} as const;
