import { format as fmt } from "date-fns";
import { BRANDING } from "./branding";

const inrFormatter = new Intl.NumberFormat(BRANDING.locale, {
  style: "currency",
  currency: BRANDING.defaultCurrency,
  maximumFractionDigits: 0,
});

export function formatINR(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(amount)) return "—";
  return inrFormatter.format(amount);
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return fmt(d, BRANDING.dateFormat);
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return fmt(d, `${BRANDING.dateFormat}, HH:mm`);
}
