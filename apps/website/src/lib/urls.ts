/**
 * Platform URL utilities
 *
 * - Platform: https://app.themodel.cloud/
 * - Website: https://themodel.cloud/
 */

export const PLATFORM_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://app.themodel.cloud";

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
  // The website and platform are on different origins, so a new user arrives signed out.
  // Sign-in sends them on to the profile page (the platform has no /onboarding route).
  completeProfile: platformUrl(`/sign-in?redirect=${encodeURIComponent("/edit-profile")}`),
} as const;
