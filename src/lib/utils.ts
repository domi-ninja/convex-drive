import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getConvexSiteUrl() {
  return (import.meta.env.VITE_CONVEX_URL as string).replace("convex.cloud", "convex.site");
}