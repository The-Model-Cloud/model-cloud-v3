"use client";

import { FAIcon, commonFAIcons } from "./FAIcon";

interface DynamicIconProps {
  name: string;
  className?: string;
}

// Map Lucide icon names to Font Awesome equivalents for backwards compatibility
const lucideToFAMap: Record<string, string> = {
  // General icons
  Target: "bullseye",
  Heart: "heart",
  Globe: "globe",
  Award: "award",
  Shield: "shield",
  Zap: "bolt",
  TrendingUp: "chart-line",
  Clock: "clock",
  HeartHandshake: "handshake",
  Calendar: "calendar",
  Users: "users",
  BarChart3: "chart-bar",
  UserPlus: "user-plus",
  Search: "search",
  CalendarCheck: "calendar-check",
  Star: "star",
  Mail: "envelope",
  Phone: "phone",
  MapPin: "map-marker-alt",
  Check: "check",
  CheckCircle: "check-circle",
  Camera: "camera",
  HelpCircle: "question-circle",
  ArrowRight: "arrow-right",
  Play: "play",
  // Additional icons
  Lock: "lock",
  Unlock: "unlock",
  Settings: "cog",
  Home: "home",
  Building: "building",
  Briefcase: "briefcase",
  CreditCard: "credit-card",
  DollarSign: "dollar-sign",
  ThumbsUp: "thumbs-up",
  MessageCircle: "comment",
  Bell: "bell",
  Bookmark: "bookmark",
  Link: "link",
  ExternalLink: "external-link-alt",
  Edit: "edit",
  Trash: "trash",
  Plus: "plus",
  Minus: "minus",
  X: "times",
  Menu: "bars",
  ChevronDown: "chevron-down",
  ChevronUp: "chevron-up",
  ChevronLeft: "chevron-left",
  ChevronRight: "chevron-right",
  Eye: "eye",
  EyeOff: "eye-slash",
  Upload: "upload",
  Download: "download",
  Image: "image",
  File: "file",
  Folder: "folder",
  Send: "paper-plane",
  Share: "share-alt",
  Copy: "copy",
  Clipboard: "clipboard",
  Filter: "filter",
  Sort: "sort",
  Refresh: "sync",
  LayoutDashboard: "th-large",
  LogOut: "sign-out-alt",
  User: "user",
  Info: "info-circle",
  AlertCircle: "exclamation-circle",
  AlertTriangle: "exclamation-triangle",
  Loader2: "spinner",
};

export function DynamicIcon({ name, className, ...props }: DynamicIconProps) {
  // First check if it's a Lucide icon name that needs mapping
  const faIconName = lucideToFAMap[name] || name;

  return <FAIcon name={faIconName} className={className} {...props} />;
}

// List of commonly used icons for the icon picker (Font Awesome names)
export const commonIcons = commonFAIcons.map((icon) => icon.name);

export function isValidIconName(name: string): boolean {
  // Check if it's a known Lucide name or a valid FA name
  return name in lucideToFAMap || name.length > 0;
}
