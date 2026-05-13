import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Safely converts various date-like values (Date, Firestore Timestamp, ISO string)
 * into a valid JavaScript Date object.
 */
export function toSafeDate(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  
  // Handle Firestore Timestamp
  if (typeof val.toDate === 'function') {
    return val.toDate();
  }
  if (typeof val.seconds === 'number') {
    return new Date(val.seconds * 1000);
  }
  
  // Handle strings or numbers
  const date = new Date(val);
  return isNaN(date.getTime()) ? null : date;
}
