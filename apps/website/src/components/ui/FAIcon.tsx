"use client";

import { FontAwesomeIcon, FontAwesomeIconProps } from "@fortawesome/react-fontawesome";
import { library, IconName, IconPrefix } from "@fortawesome/fontawesome-svg-core";
import { fas } from "@fortawesome/free-solid-svg-icons";
import { fab } from "@fortawesome/free-brands-svg-icons";

// Add all icons to the library
library.add(fas, fab);

interface FAIconProps extends Omit<FontAwesomeIconProps, "icon"> {
  name: string; // e.g., "calendar", "users", "fa-brands fa-instagram"
  className?: string;
}

export function FAIcon({ name, className, ...props }: FAIconProps) {
  // Parse the icon name - it could be:
  // 1. Just the icon name: "calendar" -> ["fas", "calendar"]
  // 2. Full format: "fa-solid fa-calendar" -> ["fas", "calendar"]
  // 3. Brand format: "fa-brands fa-instagram" -> ["fab", "instagram"]

  let prefix: IconPrefix = "fas"; // Default to solid
  let iconName: IconName = name as IconName;

  if (name.includes(" ")) {
    const parts = name.split(" ");
    const prefixPart = parts[0];
    const namePart = parts[1];

    // Map fa-solid, fa-brands, etc. to prefix
    if (prefixPart === "fa-solid" || prefixPart === "fas") {
      prefix = "fas";
    } else if (prefixPart === "fa-brands" || prefixPart === "fab") {
      prefix = "fab";
    } else if (prefixPart === "fa-regular" || prefixPart === "far") {
      prefix = "far";
    }

    // Remove fa- prefix from icon name if present
    iconName = (namePart.startsWith("fa-") ? namePart.slice(3) : namePart) as IconName;
  } else if (name.startsWith("fa-")) {
    // Handle "fa-calendar" format
    iconName = name.slice(3) as IconName;
  }

  return (
    <FontAwesomeIcon
      icon={[prefix, iconName]}
      className={className}
      {...props}
    />
  );
}

// List of commonly used Font Awesome icons for the icon picker
export const commonFAIcons = [
  // General
  { name: "calendar", label: "Calendar" },
  { name: "users", label: "Users" },
  { name: "chart-bar", label: "Chart Bar" },
  { name: "shield", label: "Shield" },
  { name: "bolt", label: "Bolt/Zap" },
  { name: "globe", label: "Globe" },
  { name: "star", label: "Star" },
  { name: "heart", label: "Heart" },
  { name: "check", label: "Check" },
  { name: "check-circle", label: "Check Circle" },
  { name: "clock", label: "Clock" },
  { name: "user-plus", label: "User Plus" },
  { name: "search", label: "Search" },
  { name: "calendar-check", label: "Calendar Check" },
  { name: "envelope", label: "Email" },
  { name: "phone", label: "Phone" },
  { name: "map-marker-alt", label: "Map Pin" },
  { name: "camera", label: "Camera" },
  { name: "question-circle", label: "Help Circle" },
  { name: "arrow-right", label: "Arrow Right" },
  { name: "play", label: "Play" },
  { name: "award", label: "Award" },
  { name: "handshake", label: "Handshake" },
  { name: "chart-line", label: "Trending Up" },
  { name: "bullseye", label: "Target" },
  { name: "lock", label: "Lock" },
  { name: "unlock", label: "Unlock" },
  { name: "cog", label: "Settings" },
  { name: "home", label: "Home" },
  { name: "building", label: "Building" },
  { name: "briefcase", label: "Briefcase" },
  { name: "credit-card", label: "Credit Card" },
  { name: "dollar-sign", label: "Dollar Sign" },
  { name: "pound-sign", label: "Pound Sign" },
  { name: "thumbs-up", label: "Thumbs Up" },
  { name: "comment", label: "Comment" },
  { name: "comments", label: "Comments" },
  { name: "bell", label: "Bell" },
  { name: "bookmark", label: "Bookmark" },
  { name: "link", label: "Link" },
  { name: "external-link-alt", label: "External Link" },
  // Social (brands)
  { name: "fa-brands fa-instagram", label: "Instagram" },
  { name: "fa-brands fa-linkedin", label: "LinkedIn" },
  { name: "fa-brands fa-twitter", label: "Twitter" },
  { name: "fa-brands fa-facebook", label: "Facebook" },
  { name: "fa-brands fa-youtube", label: "YouTube" },
  { name: "fa-brands fa-tiktok", label: "TikTok" },
  { name: "fa-brands fa-pinterest", label: "Pinterest" },
];

// Validate if an icon name exists
export function isValidFAIconName(name: string): boolean {
  // This is a simplified check - in production you might want to check against the actual library
  return name.length > 0;
}
