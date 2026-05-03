import {
  AlignmentType,
  Document,
  Footer,
  HeadingLevel,
  ImageRun,
  Packer,
  PageBreak,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type { Itinerary } from "../itinerary-schema";
import { BRANDING } from "../branding";
import { formatDate, formatDateTime, formatINR } from "../format";
import { resolveImageBytes } from "./resolve-image";

const PASSYN_GREEN = "C8F562";
const INK = "0d1f0a";
const MUTED = "5b6b5a";

async function fetchImage(url: string): Promise<Buffer | null> {
  const r = await resolveImageBytes(url);
  return r?.body ?? null;
}

function p(text: string, opts: { bold?: boolean; size?: number; color?: string } = {}) {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        bold: opts.bold,
        size: opts.size ?? 20,
        color: opts.color ?? INK,
      }),
    ],
  });
}

function muted(text: string) {
  return p(text, { color: MUTED, size: 18 });
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

function flightsTable(data: Itinerary): Table {
  const headerRow = new TableRow({
    children: ["Type", "Airline / No.", "From", "To", "PNR"].map(
      (h) =>
        new TableCell({
          children: [p(h, { bold: true, size: 18 })],
          shading: { fill: "f5f8ee" },
        }),
    ),
  });
  const rows = data.flights.map(
    (f) =>
      new TableRow({
        children: [
          new TableCell({ children: [p(f.type)] }),
          new TableCell({
            children: [
              p(`${f.airline}${f.flightNumber ? " · " + f.flightNumber : ""}`),
            ],
          }),
          new TableCell({
            children: [
              p(`${f.from.city} (${f.from.airport})`),
              muted(formatDateTime(f.from.datetime)),
            ],
          }),
          new TableCell({
            children: [
              p(`${f.to.city} (${f.to.airport})`),
              muted(formatDateTime(f.to.datetime)),
            ],
          }),
          new TableCell({ children: [p(f.pnr ?? "—")] }),
        ],
      }),
  );
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...rows],
  });
}

function hotelsTable(data: Itinerary): Table {
  const headerRow = new TableRow({
    children: ["Hotel", "City", "Check-in / out", "Room / Meal"].map(
      (h) =>
        new TableCell({
          children: [p(h, { bold: true, size: 18 })],
          shading: { fill: "f5f8ee" },
        }),
    ),
  });
  const rows = data.hotels.map(
    (h) =>
      new TableRow({
        children: [
          new TableCell({
            children: [
              p(h.name, { bold: true }),
              ...(h.description ? [muted(h.description)] : []),
            ],
          }),
          new TableCell({ children: [p(h.city)] }),
          new TableCell({
            children: [
              p(`${formatDate(h.checkIn)} → ${formatDate(h.checkOut)}`),
              muted(`${h.nights} night${h.nights === 1 ? "" : "s"}`),
            ],
          }),
          new TableCell({
            children: [
              p(h.roomType ?? "—"),
              ...(h.mealPlan ? [muted(h.mealPlan)] : []),
            ],
          }),
        ],
      }),
  );
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...rows],
  });
}

export async function renderItineraryDocx(
  data: Itinerary,
  logoBuf: Buffer | null,
): Promise<Buffer> {
  // Pre-fetch all images server-side so the .docx is portable.
  const hotelImgs = await Promise.all(
    data.hotels.map((h) =>
      h.fetchedImageUrl ? fetchImage(h.fetchedImageUrl) : Promise.resolve(null),
    ),
  );
  const dayImgs = await Promise.all(
    data.days.map((d) =>
      Promise.all(
        d.activities.map((a) =>
          a.fetchedImageUrl
            ? fetchImage(a.fetchedImageUrl)
            : Promise.resolve(null),
        ),
      ),
    ),
  );

  const cover: (Paragraph | Table)[] = [];
  if (logoBuf) {
    cover.push(
      new Paragraph({
        children: [
          new ImageRun({
            data: logoBuf,
            transformation: { width: 56, height: 56 },
            type: "png",
          }),
        ],
        alignment: AlignmentType.CENTER,
      }),
    );
  }
  cover.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: BRANDING.agencyName,
          bold: true,
          size: 32,
          color: INK,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: "Personalised itinerary",
          color: MUTED,
          size: 20,
        }),
      ],
      spacing: { after: 400 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `${data.client.name} · ${data.trip.destination}`,
          bold: true,
          size: 44,
          color: INK,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `${formatDate(data.trip.startDate)} → ${formatDate(data.trip.endDate)} · ${data.trip.nights} nights · ${data.client.travellers} traveller${data.client.travellers === 1 ? "" : "s"}`,
          color: MUTED,
          size: 22,
        }),
      ],
      spacing: { after: 600 },
    }),
    new Paragraph({ children: [new PageBreak()] }),
  );

  const body: (Paragraph | Table)[] = [];

  if (data.flights.length) {
    body.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: "Flights", color: INK })],
      }),
      flightsTable(data),
      new Paragraph({ text: "" }),
    );
  }

  if (data.hotels.length) {
    body.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: "Hotels", color: INK })],
      }),
    );
    data.hotels.forEach((h, i) => {
      const img = hotelImgs[i];
      if (img) {
        body.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: img,
                transformation: { width: 480, height: 270 },
                type: "png",
              }),
            ],
          }),
        );
      }
      body.push(
        p(h.name, { bold: true, size: 24 }),
        muted(
          `${h.city} · ${formatDate(h.checkIn)} → ${formatDate(h.checkOut)} · ${h.nights} night${h.nights === 1 ? "" : "s"}`,
        ),
      );
      if (h.roomType || h.mealPlan) {
        body.push(p(`${h.roomType ?? ""}${h.roomType && h.mealPlan ? " · " : ""}${h.mealPlan ?? ""}`));
      }
      if (h.description) body.push(p(h.description));
      body.push(new Paragraph({ text: "" }));
    });
    body.push(hotelsTable(data), new Paragraph({ text: "" }));
  }

  if (data.days.length) {
    body.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: "Day by day", color: INK })],
      }),
    );
    data.days.forEach((d, di) => {
      body.push(
        muted(`Day ${d.dayNumber} · ${formatDate(d.date)}`),
        p(d.title, { bold: true, size: 26 }),
      );
      if (d.summary) body.push(p(stripHtml(d.summary)));
      d.activities.forEach((a, ai) => {
        const img = dayImgs[di][ai];
        if (img) {
          body.push(
            new Paragraph({
              children: [
                new ImageRun({
                  data: img,
                  transformation: { width: 240, height: 160 },
                  type: "png",
                }),
              ],
            }),
          );
        }
        body.push(
          p(
            `${a.time ? a.time + " · " : ""}${a.title}${a.duration ? "  (" + a.duration + ")" : ""}`,
            { bold: true },
          ),
        );
        if (a.description) body.push(muted(stripHtml(a.description)));
      });
      body.push(new Paragraph({ text: "" }));
    });
  }

  if (data.pricing) {
    body.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: "Investment", color: INK })],
      }),
      p(`Total: ${formatINR(data.pricing.total)}`, { bold: true, size: 26 }),
      p(`Per person: ${formatINR(data.pricing.perPerson)}`),
    );
    if (data.pricing.breakdown?.length) {
      data.pricing.breakdown.forEach((b) =>
        body.push(p(`${b.label} — ${formatINR(b.amount)}`)),
      );
    }
    body.push(new Paragraph({ text: "" }));
  }

  if (data.inclusions.length) {
    body.push(p("Inclusions", { bold: true, size: 24 }));
    data.inclusions.forEach((s) => body.push(p("• " + s)));
    body.push(new Paragraph({ text: "" }));
  }
  if (data.exclusions.length) {
    body.push(p("Exclusions", { bold: true, size: 24 }));
    data.exclusions.forEach((s) => body.push(p("• " + s)));
    body.push(new Paragraph({ text: "" }));
  }
  if (data.termsAndConditions.length) {
    body.push(p("Terms & Conditions", { bold: true, size: 24 }));
    data.termsAndConditions.forEach((s) =>
      body.push(p("• " + s, { color: MUTED, size: 18 })),
    );
  }

  const doc = new Document({
    creator: BRANDING.agencyName,
    title: `${data.client.name} — ${data.trip.destination}`,
    styles: {
      default: {
        document: { run: { font: "Calibri", color: INK } },
      },
    },
    sections: [
      {
        properties: { page: { margin: { top: 720, bottom: 720, left: 720, right: 720 } } },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: `${BRANDING.agencyName} · ${BRANDING.email} · ${BRANDING.phone}`,
                    color: MUTED,
                    size: 16,
                  }),
                ],
              }),
            ],
          }),
        },
        children: [...cover, ...body],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}

export { PASSYN_GREEN };
