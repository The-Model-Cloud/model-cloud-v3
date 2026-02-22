"use client";

import * as LucideIcons from "lucide-react";
import { LucideProps } from "lucide-react";

interface DynamicIconProps extends LucideProps {
  name: string;
}

export function DynamicIcon({ name, ...props }: DynamicIconProps) {
  const IconComponent = (
    LucideIcons as unknown as Record<string, React.ComponentType<LucideProps>>
  )[name];

  if (!IconComponent) {
    // Fallback to HelpCircle if the icon name doesn't match
    return <LucideIcons.HelpCircle {...props} />;
  }

  return <IconComponent {...props} />;
}

// List of commonly used icons for the icon picker
export const commonIcons = [
  "Target",
  "Heart",
  "Globe",
  "Award",
  "Shield",
  "Zap",
  "TrendingUp",
  "Clock",
  "HeartHandshake",
  "Calendar",
  "Users",
  "BarChart3",
  "UserPlus",
  "Search",
  "CalendarCheck",
  "Star",
  "Mail",
  "Phone",
  "MapPin",
  "Check",
  "CheckCircle",
  "Camera",
  "HelpCircle",
  "ArrowRight",
  "Play",
];

export function isValidIconName(name: string): boolean {
  return name in LucideIcons;
}
