import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** "Kasun Perera" → "KP" — shared by AvatarInitials / TeamLogo monogram fallback. */
export function initials(name: string, max = 2): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, max)
    .join("")
    .toUpperCase();
}
