import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  integer,
  jsonb,
  inet,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    password: text("password").notNull(), // bcrypt hash
    name: text("name").notNull(),
    role: text("role").notNull().default("agent"), // 'agent' | 'admin'
    isActive: boolean("is_active").notNull().default(true),
    failedAttempts: integer("failed_attempts").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    emailUnique: uniqueIndex("users_email_unique").on(t.email),
  }),
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    userAgent: text("user_agent"),
    ip: inet("ip"),
  },
  (t) => ({
    tokenHashUnique: uniqueIndex("sessions_token_hash_unique").on(t.tokenHash),
    userIdx: index("sessions_user_idx").on(t.userId),
  }),
);

export const itineraries = pgTable(
  "itineraries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdByAgentId: uuid("created_by_agent_id")
      .notNull()
      .references(() => users.id),
    lastEditedByAgentId: uuid("last_edited_by_agent_id")
      .notNull()
      .references(() => users.id),
    clientName: text("client_name").notNull(),
    clientEmail: text("client_email"),
    destination: text("destination"),
    startDate: text("start_date"), // ISO yyyy-mm-dd
    endDate: text("end_date"),
    travellers: integer("travellers").notNull().default(1),
    status: text("status").notNull().default("draft"), // 'draft' | 'parsed' | 'final'
    rawInput: text("raw_input"), // original pasted text from composer
    contentJson: jsonb("content_json"), // parsed Itinerary structure (Phase 2+)
    shareToken: text("share_token"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    shareTokenUnique: uniqueIndex("itineraries_share_token_unique").on(
      t.shareToken,
    ),
    updatedIdx: index("itineraries_updated_idx").on(t.updatedAt),
  }),
);

export const assets = pgTable(
  "assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    itineraryId: uuid("itinerary_id")
      .notNull()
      .references(() => itineraries.id, { onDelete: "cascade" }),
    r2Key: text("r2_key").notNull(),
    publicUrl: text("public_url").notNull(),
    thumbR2Key: text("thumb_r2_key"),
    thumbPublicUrl: text("thumb_public_url"),
    mime: text("mime").notNull(),
    bytes: integer("bytes").notNull(),
    width: integer("width"),
    height: integer("height"),
    agentTag: text("agent_tag"), // 'flight' | 'hotel' | 'activity' | 'other'
    agentCaption: text("agent_caption"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    itineraryIdx: index("assets_itinerary_idx").on(t.itineraryId),
  }),
);

export const imageCache = pgTable(
  "image_cache",
  {
    query: text("query").primaryKey(),
    source: text("source").notNull(), // 'pexels' | 'unsplash' | 'manual-url'
    url: text("url").notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    itineraryId: uuid("itinerary_id")
      .notNull()
      .references(() => itineraries.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => users.id),
    action: text("action").notNull(),
    diff: jsonb("diff"),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    itineraryIdx: index("audit_log_itinerary_idx").on(t.itineraryId),
  }),
);

export const llmLogs = pgTable("llm_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: uuid("agent_id")
    .notNull()
    .references(() => users.id),
  itineraryId: uuid("itinerary_id").references(() => itineraries.id, {
    onDelete: "cascade",
  }),
  model: text("model").notNull(),
  promptHash: text("prompt_hash").notNull(),
  latencyMs: integer("latency_ms"),
  promptTokens: integer("prompt_tokens"),
  completionTokens: integer("completion_tokens"),
  success: boolean("success").notNull().default(false),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type Itinerary = typeof itineraries.$inferSelect;
export type Asset = typeof assets.$inferSelect;
