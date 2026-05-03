import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { Itinerary } from "../itinerary-schema";
import { BRANDING } from "../branding";
import { formatDate, formatDateTime, formatINR } from "../format";

// Brand palette
const PASSYN_GREEN = "#C8F562";
const GREEN_SOFT = "#E8FAB6";
const INK = "#0d1f0a";
const INK_SOFT = "#2c3a28";
const MUTED = "#6b786a";
const BORDER = "#e6ecdf";
const PAPER = "#f7faf3";

const PAGE_PAD_X = 44;
const PAGE_PAD_Y = 48;

const styles = StyleSheet.create({
  page: {
    paddingTop: PAGE_PAD_Y,
    paddingBottom: PAGE_PAD_Y + 18,
    paddingHorizontal: PAGE_PAD_X,
    fontSize: 10,
    color: INK,
    fontFamily: "Helvetica",
    lineHeight: 1.45,
  },
  pageCover: {
    padding: 0,
    fontSize: 10,
    color: INK,
    fontFamily: "Helvetica",
  },

  // Top brand bar
  brandBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 10,
    marginBottom: 18,
    borderBottom: `0.7pt solid ${BORDER}`,
  },
  brandLeft: { flexDirection: "row", alignItems: "center" },
  brandLogo: { width: 22, height: 22, marginRight: 8 },
  brandName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.5,
  },
  brandRight: { fontSize: 8, color: MUTED },

  // Cover page
  coverHero: {
    backgroundColor: PASSYN_GREEN,
    paddingTop: 80,
    paddingBottom: 56,
    paddingHorizontal: PAGE_PAD_X,
  },
  coverEyebrow: {
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 2,
    color: INK_SOFT,
  },
  coverTitle: {
    fontSize: 38,
    fontFamily: "Times-Bold",
    color: INK,
    marginTop: 14,
    lineHeight: 1.1,
  },
  coverDest: {
    fontSize: 18,
    fontFamily: "Times-Italic",
    color: INK_SOFT,
    marginTop: 6,
  },
  coverMetaRow: {
    flexDirection: "row",
    marginTop: 28,
    gap: 24,
  },
  coverMetaLabel: {
    fontSize: 8,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    color: INK_SOFT,
  },
  coverMetaValue: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: INK,
    marginTop: 3,
  },
  coverFooter: {
    paddingHorizontal: PAGE_PAD_X,
    paddingTop: 36,
  },
  coverFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  coverFooterLabel: {
    fontSize: 8,
    textTransform: "uppercase",
    letterSpacing: 1.4,
    color: MUTED,
  },
  coverFooterValue: {
    fontSize: 10,
    color: INK,
    marginTop: 3,
  },

  // Section headers
  sectionEyebrow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 22,
    marginBottom: 10,
  },
  sectionDot: {
    width: 18,
    height: 4,
    backgroundColor: PASSYN_GREEN,
    borderRadius: 2,
    marginRight: 8,
  },
  sectionLabel: {
    fontSize: 8,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: MUTED,
    fontFamily: "Helvetica-Bold",
  },
  h2: {
    fontSize: 22,
    fontFamily: "Times-Bold",
    color: INK,
    marginBottom: 14,
  },
  h3: { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 4 },

  muted: { color: MUTED, fontSize: 9 },

  // Cards & containers
  card: {
    border: `0.7pt solid ${BORDER}`,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    backgroundColor: "white",
  },

  // Flights
  flightTable: {
    border: `0.7pt solid ${BORDER}`,
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 6,
  },
  flightHeader: {
    flexDirection: "row",
    backgroundColor: PAPER,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  flightHeaderCell: {
    fontSize: 8,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: MUTED,
    fontFamily: "Helvetica-Bold",
  },
  flightRow: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderTop: `0.5pt solid ${BORDER}`,
    alignItems: "center",
  },
  flightTypePillWrap: {
    alignSelf: "flex-start",
    paddingVertical: 3,
    paddingHorizontal: 7,
    backgroundColor: GREEN_SOFT,
    borderRadius: 6,
    justifyContent: "center",
  },
  flightTypePillText: {
    fontSize: 8,
    color: INK,
    textTransform: "uppercase",
    letterSpacing: 1,
    lineHeight: 1,
  },

  // Hotel hero
  hotelCard: {
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 14,
    border: `0.7pt solid ${BORDER}`,
    backgroundColor: "white",
  },
  hotelImg: {
    width: "100%",
    height: 180,
    objectFit: "cover",
  },
  hotelBody: { padding: 14 },
  hotelStrip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GREEN_SOFT,
    paddingVertical: 6,
    paddingHorizontal: 14,
    fontSize: 8,
    color: INK_SOFT,
  },

  // Day spreads
  dayCard: {
    marginBottom: 16,
    borderRadius: 10,
    overflow: "hidden",
    border: `0.7pt solid ${BORDER}`,
    backgroundColor: "white",
  },
  dayHeader: {
    backgroundColor: INK,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dayPillWrap: {
    alignSelf: "flex-start",
    backgroundColor: PASSYN_GREEN,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
    justifyContent: "center",
  },
  dayPillText: {
    fontSize: 8,
    color: INK,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    lineHeight: 1,
    fontFamily: "Helvetica-Bold",
  },
  dayTitle: {
    fontSize: 18,
    fontFamily: "Times-Bold",
    color: "white",
    marginTop: 10,
    lineHeight: 1.2,
  },
  daySummary: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
    color: INK_SOFT,
  },
  activityRow: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTop: `0.5pt solid ${BORDER}`,
    alignItems: "flex-start",
  },
  activityImg: {
    width: 110,
    height: 74,
    borderRadius: 6,
    objectFit: "cover",
    marginRight: 12,
  },
  timePillWrap: {
    alignSelf: "center",
    backgroundColor: GREEN_SOFT,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
    marginRight: 8,
    justifyContent: "center",
  },
  timePillText: {
    fontSize: 8,
    color: INK,
    letterSpacing: 0.6,
    lineHeight: 1,
    fontFamily: "Helvetica-Bold",
  },

  // Pricing
  priceCard: {
    backgroundColor: INK,
    borderRadius: 10,
    padding: 18,
    color: "white",
    flexDirection: "row",
    gap: 24,
  },
  priceLabel: {
    fontSize: 8,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: PASSYN_GREEN,
  },
  priceValue: {
    fontSize: 22,
    fontFamily: "Times-Bold",
    color: "white",
    marginTop: 4,
  },
  breakdown: {
    marginTop: 8,
    border: `0.7pt solid ${BORDER}`,
    borderRadius: 8,
  },
  breakdownRow: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderTop: `0.5pt solid ${BORDER}`,
    justifyContent: "space-between",
  },

  // Inclusions / exclusions
  twoCol: { flexDirection: "row", gap: 10 },
  inExCard: {
    flex: 1,
    border: `0.7pt solid ${BORDER}`,
    borderRadius: 8,
    padding: 12,
  },
  bulletRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  bulletDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: PASSYN_GREEN,
    marginTop: 5,
    marginRight: 8,
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 22,
    left: PAGE_PAD_X,
    right: PAGE_PAD_X,
    fontSize: 7.5,
    color: MUTED,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTop: `0.5pt solid ${BORDER}`,
    paddingTop: 6,
  },
});

function Footer() {
  return (
    <View style={styles.footer} fixed>
      <Text>
        {BRANDING.agencyName}  ·  {BRANDING.email}  ·  {BRANDING.phone}
      </Text>
      <Text
        render={({ pageNumber, totalPages }) =>
          `${pageNumber} / ${totalPages}`
        }
      />
    </View>
  );
}

function BrandBar({ logoData }: { logoData?: string }) {
  return (
    <View style={styles.brandBar} fixed>
      <View style={styles.brandLeft}>
        {logoData && <Image src={logoData} style={styles.brandLogo} />}
        <Text style={styles.brandName}>{BRANDING.agencyName.toUpperCase()}</Text>
      </View>
      <Text style={styles.brandRight}>Personalised travel itinerary</Text>
    </View>
  );
}

function SectionHeader({ label, title }: { label: string; title: string }) {
  return (
    <>
      <View style={styles.sectionEyebrow}>
        <View style={styles.sectionDot} />
        <Text style={styles.sectionLabel}>{label}</Text>
      </View>
      <Text style={styles.h2}>{title}</Text>
    </>
  );
}

function CoverPage({ data, logoData }: { data: Itinerary; logoData?: string }) {
  return (
    <Page size="A4" style={styles.pageCover}>
      <View style={styles.coverHero}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 36 }}>
          {logoData && (
            <Image src={logoData} style={{ width: 36, height: 36, marginRight: 10 }} />
          )}
          <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 14, color: INK, letterSpacing: 0.6 }}>
            {BRANDING.agencyName.toUpperCase()}
          </Text>
        </View>

        <Text style={styles.coverEyebrow}>Personalised itinerary · prepared for</Text>
        <Text style={styles.coverTitle}>{data.client.name}</Text>
        <Text style={styles.coverDest}>{data.trip.destination}</Text>

        <View style={styles.coverMetaRow}>
          <View>
            <Text style={styles.coverMetaLabel}>Travel dates</Text>
            <Text style={styles.coverMetaValue}>
              {formatDate(data.trip.startDate)} → {formatDate(data.trip.endDate)}
            </Text>
          </View>
          <View>
            <Text style={styles.coverMetaLabel}>Duration</Text>
            <Text style={styles.coverMetaValue}>
              {data.trip.nights} night{data.trip.nights === 1 ? "" : "s"}
            </Text>
          </View>
          <View>
            <Text style={styles.coverMetaLabel}>Travellers</Text>
            <Text style={styles.coverMetaValue}>
              {data.client.travellers} guest{data.client.travellers === 1 ? "" : "s"}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.coverFooter}>
        <View style={styles.coverFooterRow}>
          <View>
            <Text style={styles.coverFooterLabel}>Prepared by</Text>
            <Text style={styles.coverFooterValue}>{BRANDING.contactName}</Text>
            <Text style={styles.coverFooterValue}>{BRANDING.agencyName}</Text>
          </View>
          <View>
            <Text style={styles.coverFooterLabel}>Get in touch</Text>
            <Text style={styles.coverFooterValue}>{BRANDING.email}</Text>
            <Text style={styles.coverFooterValue}>{BRANDING.phone}</Text>
          </View>
        </View>
      </View>
    </Page>
  );
}

function FlightsSection({ data }: { data: Itinerary }) {
  if (!data.flights.length) return null;
  return (
    <View>
      <SectionHeader label="Air travel" title="Flights" />
      <View style={styles.flightTable}>
        <View style={styles.flightHeader}>
          <Text style={[styles.flightHeaderCell, { width: "16%" }]}>Type</Text>
          <Text style={[styles.flightHeaderCell, { width: "22%" }]}>Carrier</Text>
          <Text style={[styles.flightHeaderCell, { width: "27%" }]}>From</Text>
          <Text style={[styles.flightHeaderCell, { width: "27%" }]}>To</Text>
          <Text style={[styles.flightHeaderCell, { width: "8%" }]}>PNR</Text>
        </View>
        {data.flights.map((f, i) => (
          <View key={i} style={styles.flightRow}>
            <View style={{ width: "16%" }}>
              <View style={styles.flightTypePillWrap}>
                <Text style={styles.flightTypePillText}>{f.type}</Text>
              </View>
            </View>
            <View style={{ width: "22%" }}>
              <Text style={{ fontFamily: "Helvetica-Bold" }}>{f.airline}</Text>
              {f.flightNumber && <Text style={styles.muted}>{f.flightNumber}</Text>}
            </View>
            <View style={{ width: "27%" }}>
              <Text>{f.from.city} ({f.from.airport})</Text>
              <Text style={styles.muted}>{formatDateTime(f.from.datetime)}</Text>
            </View>
            <View style={{ width: "27%" }}>
              <Text>{f.to.city} ({f.to.airport})</Text>
              <Text style={styles.muted}>{formatDateTime(f.to.datetime)}</Text>
            </View>
            <Text style={{ width: "8%", fontSize: 8 }}>{f.pnr ?? "—"}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function HotelsSection({ data }: { data: Itinerary }) {
  if (!data.hotels.length) return null;
  return (
    <View>
      <SectionHeader label="Stays" title="Where you're staying" />
      {data.hotels.map((h, i) => (
        <View key={i} style={styles.hotelCard} wrap={false}>
          {h.fetchedImageUrl && <Image src={h.fetchedImageUrl} style={styles.hotelImg} />}
          <View style={styles.hotelStrip}>
            <Text style={{ fontFamily: "Helvetica-Bold", letterSpacing: 1, textTransform: "uppercase" }}>
              {h.city}
            </Text>
            <Text style={{ marginLeft: 10, color: MUTED }}>
              {formatDate(h.checkIn)} → {formatDate(h.checkOut)} · {h.nights} night{h.nights === 1 ? "" : "s"}
            </Text>
          </View>
          <View style={styles.hotelBody}>
            <Text style={{ fontSize: 16, fontFamily: "Times-Bold", marginBottom: 4 }}>
              {h.name}
            </Text>
            {(h.roomType || h.mealPlan) && (
              <Text style={[styles.muted, { marginBottom: 4 }]}>
                {h.roomType ?? ""}
                {h.roomType && h.mealPlan ? "  ·  " : ""}
                {h.mealPlan ?? ""}
              </Text>
            )}
            {h.description && <Text style={{ marginTop: 4 }}>{h.description}</Text>}
            {h.notes && (
              <Text style={[styles.muted, { marginTop: 6, fontStyle: "italic" }]}>
                {h.notes}
              </Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

function DaysSection({ data }: { data: Itinerary }) {
  if (!data.days.length) return null;
  return (
    <View>
      <SectionHeader label="Day by day" title="Your journey" />
      {data.days.map((d) => (
        <View key={d.dayNumber} style={styles.dayCard} wrap={false}>
          <View style={styles.dayHeader}>
            <View style={styles.dayPillWrap}>
              <Text style={styles.dayPillText}>
                Day {d.dayNumber}  ·  {formatDate(d.date)}
              </Text>
            </View>
            <Text style={styles.dayTitle}>{d.title}</Text>
          </View>
          {d.summary && (
            <Text style={styles.daySummary}>{stripHtml(d.summary)}</Text>
          )}
          {d.activities.map((a, i) => (
            <View key={i} style={styles.activityRow}>
              {a.fetchedImageUrl ? (
                <Image src={a.fetchedImageUrl} style={styles.activityImg} />
              ) : (
                <View
                  style={[
                    styles.activityImg,
                    { backgroundColor: PAPER, justifyContent: "center", alignItems: "center" },
                  ]}
                >
                  <Text style={{ fontSize: 7, color: MUTED }}>No image</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 2 }}>
                  {a.time && (
                    <View style={styles.timePillWrap}>
                      <Text style={styles.timePillText}>{a.time}</Text>
                    </View>
                  )}
                  <Text style={{ fontFamily: "Helvetica-Bold" }}>{a.title}</Text>
                  {a.duration && (
                    <Text style={[styles.muted, { marginLeft: 6 }]}>· {a.duration}</Text>
                  )}
                </View>
                {a.description && (
                  <Text style={[styles.muted, { color: INK_SOFT }]}>
                    {stripHtml(a.description)}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function PricingSection({ data }: { data: Itinerary }) {
  if (!data.pricing) return null;
  const p = data.pricing;
  return (
    <View>
      <SectionHeader label="Investment" title="Pricing" />
      <View style={styles.priceCard} wrap={false}>
        <View style={{ flex: 1 }}>
          <Text style={styles.priceLabel}>Total</Text>
          <Text style={styles.priceValue}>{formatINR(p.total)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.priceLabel}>Per person</Text>
          <Text style={styles.priceValue}>{formatINR(p.perPerson)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.priceLabel}>Travellers</Text>
          <Text style={styles.priceValue}>{data.client.travellers}</Text>
        </View>
      </View>
      {p.breakdown && p.breakdown.length > 0 && (
        <View style={styles.breakdown}>
          {p.breakdown.map((b, i) => (
            <View key={i} style={[styles.breakdownRow, i === 0 && { borderTop: 0 }]}>
              <Text>{b.label}</Text>
              <Text style={{ fontFamily: "Helvetica-Bold" }}>{formatINR(b.amount)}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function InclusionsExclusionsSection({ data }: { data: Itinerary }) {
  if (!data.inclusions.length && !data.exclusions.length) return null;
  return (
    <View>
      <SectionHeader label="Fine print" title="What's included" />
      <View style={styles.twoCol}>
        {data.inclusions.length > 0 && (
          <View style={styles.inExCard}>
            <Text style={[styles.h3, { color: INK }]}>Inclusions</Text>
            {data.inclusions.map((s, i) => (
              <View key={i} style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <Text style={{ flex: 1 }}>{s}</Text>
              </View>
            ))}
          </View>
        )}
        {data.exclusions.length > 0 && (
          <View style={styles.inExCard}>
            <Text style={[styles.h3, { color: INK }]}>Exclusions</Text>
            {data.exclusions.map((s, i) => (
              <View key={i} style={styles.bulletRow}>
                <View
                  style={[
                    styles.bulletDot,
                    { backgroundColor: BORDER },
                  ]}
                />
                <Text style={{ flex: 1 }}>{s}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

function TermsSection({ data }: { data: Itinerary }) {
  if (!data.termsAndConditions.length) return null;
  return (
    <View style={[styles.card, { marginTop: 14 }]} wrap={false}>
      <Text style={[styles.h3, { color: MUTED }]}>Terms & conditions</Text>
      {data.termsAndConditions.map((s, i) => (
        <View key={i} style={[styles.bulletRow, { marginTop: 2 }]}>
          <View style={[styles.bulletDot, { backgroundColor: MUTED }]} />
          <Text style={{ flex: 1, fontSize: 8, color: MUTED }}>{s}</Text>
        </View>
      ))}
    </View>
  );
}

function ItineraryPDF({ data, logoData }: { data: Itinerary; logoData?: string }) {
  return (
    <Document
      title={`${data.client.name} — ${data.trip.destination}`}
      author={BRANDING.agencyName}
      creator={BRANDING.agencyName}
    >
      <CoverPage data={data} logoData={logoData} />
      <Page size="A4" style={styles.page}>
        <BrandBar logoData={logoData} />
        <FlightsSection data={data} />
        <HotelsSection data={data} />
        <DaysSection data={data} />
        <PricingSection data={data} />
        <InclusionsExclusionsSection data={data} />
        <TermsSection data={data} />
        <Footer />
      </Page>
    </Document>
  );
}

function stripHtml(html: string): string {
  return html
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function renderItineraryPdf(
  data: Itinerary,
  logoData?: string,
): Promise<Buffer> {
  return await renderToBuffer(<ItineraryPDF data={data} logoData={logoData} />);
}
