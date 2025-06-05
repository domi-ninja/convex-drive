import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getConvexSiteUrl() {
  const convexUrl = import.meta.env.VITE_CONVEX_URL;
  if (!convexUrl) {
    throw new Error(
      "VITE_CONVEX_URL environment variable is not set. " +
      "Please ensure this environment variable is configured in your deployment. " +
      "It should be set to your Convex deployment URL (e.g., 'https://your-deployment.convex.cloud')"
    );
  }

  // Convert from convex.cloud to convex.site
  return convexUrl.replace("convex.cloud", "convex.site");
}