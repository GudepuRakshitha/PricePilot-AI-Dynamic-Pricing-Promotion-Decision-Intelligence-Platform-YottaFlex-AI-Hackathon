import type { Role } from "../types";

export const DEMO_ACCOUNTS: Array<{
  email: string;
  password: string;
  role: Role;
  label: string;
}> = [
  {
    email: "admin@pricepilot.ai",
    password: "Admin@12345",
    role: "ADMIN",
    label: "Administrator",
  },
  {
    email: "manager@pricepilot.ai",
    password: "Manager@12345",
    role: "PRICING_MANAGER",
    label: "Pricing Manager",
  },
  {
    email: "analyst@pricepilot.ai",
    password: "Analyst@12345",
    role: "ANALYST",
    label: "Analyst",
  },
];

export const DEMAND_LEVELS = ["HIGH", "MEDIUM", "LOW", "STABLE"] as const;

export const ISSUE_TYPES = [
  "PRICE_BELOW_FLOOR",
  "PROMOTION_STACK_VIOLATION",
  "STALE_COMPETITOR_OBSERVATION",
  "INCORRECT_MARGIN_CALCULATION",
  "MISSING_PRICE_CHANGE_REASON",
  "OTHER",
] as const;

export const CHART_COLORS = [
  "#2549e8",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
];

export function statusBadgeClass(status: string): string {
  switch (status) {
    case "APPROVED":
    case "ACTIVE":
    case "RESOLVED":
      return "badge-green";
    case "BLOCKED":
    case "EXPIRED":
    case "CRITICAL":
      return "badge-red";
    case "FLAGGED":
    case "PENDING":
    case "SCHEDULED":
    case "ACKNOWLEDGED":
    case "HIGH":
      return "badge-amber";
    case "OPEN":
    case "MEDIUM":
      return "badge-blue";
    default:
      return "badge-slate";
  }
}

export function canWrite(role: Role | undefined): boolean {
  return role === "ADMIN" || role === "PRICING_MANAGER";
}

export function isAdmin(role: Role | undefined): boolean {
  return role === "ADMIN";
}
