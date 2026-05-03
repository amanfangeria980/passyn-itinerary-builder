import { z } from "zod";

export const ZFlight = z.object({
  type: z.enum(["outbound", "return", "internal"]),
  airline: z.string(),
  flightNumber: z.string().nullable().optional(),
  from: z.object({
    city: z.string(),
    airport: z.string(),
    datetime: z.string(),
  }),
  to: z.object({
    city: z.string(),
    airport: z.string(),
    datetime: z.string(),
  }),
  pnr: z.string().nullable().optional(),
  attachedImageId: z.string().nullable().optional(),
});

export const ZHotel = z.object({
  name: z.string(),
  city: z.string(),
  checkIn: z.string(),
  checkOut: z.string(),
  nights: z.number().int().nonnegative(),
  roomType: z.string().nullable().optional(),
  mealPlan: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  attachedImageId: z.string().nullable().optional(),
  fetchedImageUrl: z.string().nullable().optional(),
  fetchedImageSource: z
    .enum(["pexels", "unsplash", "manual-url"])
    .nullable()
    .optional(),
});

export const ZActivity = z.object({
  time: z.string().nullable().optional(),
  title: z.string(),
  description: z.string(),
  duration: z.string().nullable().optional(),
  attachedImageId: z.string().nullable().optional(),
  fetchedImageUrl: z.string().nullable().optional(),
  fetchedImageSource: z
    .enum(["pexels", "unsplash", "manual-url"])
    .nullable()
    .optional(),
});

export const ZDay = z.object({
  dayNumber: z.number().int().positive(),
  date: z.string(),
  title: z.string(),
  summary: z.string(),
  activities: z.array(ZActivity),
});

export const ZPricingBreakdown = z.object({
  label: z.string(),
  amount: z.number(),
});

export const ZPricing = z.object({
  total: z.number().nullable().optional(),
  perPerson: z.number().nullable().optional(),
  currency: z.string().default("INR"),
  breakdown: z.array(ZPricingBreakdown).optional(),
});

export const ZItinerary = z.object({
  client: z.object({
    name: z.string(),
    email: z.string().nullable().optional(),
    travellers: z.number().int().positive(),
  }),
  trip: z.object({
    destination: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    nights: z.number().int().nonnegative(),
  }),
  flights: z.array(ZFlight).default([]),
  hotels: z.array(ZHotel).default([]),
  days: z.array(ZDay).default([]),
  inclusions: z.array(z.string()).default([]),
  exclusions: z.array(z.string()).default([]),
  pricing: ZPricing.nullable().optional(),
  termsAndConditions: z.array(z.string()).default([]),
});

export type Itinerary = z.infer<typeof ZItinerary>;
export type Day = z.infer<typeof ZDay>;
export type Hotel = z.infer<typeof ZHotel>;
export type Activity = z.infer<typeof ZActivity>;
export type Flight = z.infer<typeof ZFlight>;
