export const BRANDING = {
  agencyName: "Passyn Travels",
  contactName: "Aniket Arora",
  email: "info@passyn.org",
  phone: "+91 78883 75077",
  logoPath: "/branding/logo.svg",
  defaultCurrency: "INR",
  currencySymbol: "₹",
  dateFormat: "dd MMM yyyy",
  locale: "en-IN",
  timezone: "Asia/Kolkata",
} as const;

export type Branding = typeof BRANDING;
