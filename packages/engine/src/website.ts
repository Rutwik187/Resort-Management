import { and, asc, count, desc, eq, gte, inArray, isNull, or } from "drizzle-orm";
import { ageBands, offeringChildPrices, offerings, offeringSlots, offers, properties, rateChildPrices, rates, roomTypes, siteNotices, units, type Executor } from "@repo/db";
import { addDays, todayInIndia } from "./dates";
import { offerLabel } from "./offers";

/*
 * What a resort's website shows from the admin: its room types with their
 * text, room counts and base rates, and its day packages with their hours
 * and prices. Only what staff have put on sale and on the website. Child
 * prices are keyed by age band code, such as "child_5_11", because each
 * site names its own bands.
 */

export type WebsiteRate = {
  dayKind: "weekday" | "weekend" | "any";
  basis: "room" | "person";
  basePaise: number;
  extraAdultPaise: number | null;
  mealPlan: "EP" | "CP" | "MAP" | "AP";
  /** By age band code. A band that is missing is not published. */
  childPaise: Record<string, number>;
};

export type WebsiteRoomType = {
  code: string;
  name: string;
  category: "room" | "cottage" | "villa" | "tent" | "dormitory" | "other";
  tagline: string | null;
  description: string | null;
  features: string[];
  webGroup: string | null;
  baseOccupancy: number;
  minGuests: number;
  /** Empty when the resort publishes no limit. */
  maxGuests: number | null;
  /** Rooms in use. Zero when staff have not added the rooms themselves yet. */
  units: number;
  rates: WebsiteRate[];
};

export type WebsitePass = {
  code: string;
  name: string;
  kind: "day_package" | "activity" | "dining" | "other";
  /** What it includes, such as "Breakfast, lunch and hi-tea". */
  summary: string | null;
  /** Its first slot's label, such as "9:00 am to 6:00 pm". */
  hours: string | null;
  adultPaise: number;
  childPaise: Record<string, number>;
  soldOn: number[] | null;
  validFrom: string | null;
  validTo: string | null;
};

/** An offer the website shows: what it is and what it covers. Codes stay with the team. */
export type WebsiteOffer = { title: string; details: string | null; appliesTo: "stay" | "day" | "any"; label: string; startsOn: string | null; endsOn: string | null };

/**
 * A notice for the website, newest first. Its dates are kept, so the page
 * shows it on exactly those days whenever the page was cached.
 */
export type WebsiteNotice = { id: string; message: string; linkLabel: string | null; linkUrl: string | null; startsOn: string | null; endsOn: string | null };

export type WebsiteCatalogue = { roomTypes: WebsiteRoomType[]; passes: WebsitePass[]; offers: WebsiteOffer[]; notices: WebsiteNotice[] };

/** A resort's website catalogue, or null when there is no such resort. A few queries, run one after another. */
export async function websiteCatalogue(db: Executor, propertyCode: string): Promise<WebsiteCatalogue | null> {
  const [property] = await db.select({ id: properties.id }).from(properties).where(eq(properties.code, propertyCode));
  if (!property) return null;

  const types = await db
    .select()
    .from(roomTypes)
    .where(and(eq(roomTypes.propertyId, property.id), eq(roomTypes.status, "active"), eq(roomTypes.onWebsite, true)))
    .orderBy(asc(roomTypes.sortOrder), asc(roomTypes.name));
  const typeIds = types.map((t) => t.id);
  const unitCounts = typeIds.length
    ? await db
        .select({ roomTypeId: units.roomTypeId, n: count() })
        .from(units)
        .where(and(inArray(units.roomTypeId, typeIds), eq(units.status, "active")))
        .groupBy(units.roomTypeId)
    : [];
  const rateRows = typeIds.length ? await db.select().from(rates).where(and(inArray(rates.roomTypeId, typeIds), isNull(rates.seasonId))) : [];
  const rateChildren = rateRows.length
    ? await db
        .select({ rateId: rateChildPrices.rateId, band: ageBands.code, paise: rateChildPrices.paise })
        .from(rateChildPrices)
        .innerJoin(ageBands, eq(ageBands.id, rateChildPrices.ageBandId))
        .where(inArray(rateChildPrices.rateId, rateRows.map((r) => r.id)))
    : [];

  const passRows = await db
    .select()
    .from(offerings)
    .where(and(eq(offerings.propertyId, property.id), eq(offerings.active, true)))
    .orderBy(asc(offerings.sortOrder), asc(offerings.name));
  const passIds = passRows.map((p) => p.id);
  const slots = passIds.length
    ? await db
        .select({ offeringId: offeringSlots.offeringId, label: offeringSlots.label })
        .from(offeringSlots)
        .where(and(inArray(offeringSlots.offeringId, passIds), eq(offeringSlots.active, true)))
        .orderBy(asc(offeringSlots.sortOrder), asc(offeringSlots.label))
    : [];
  const passChildren = passIds.length
    ? await db
        .select({ offeringId: offeringChildPrices.offeringId, band: ageBands.code, paise: offeringChildPrices.paise })
        .from(offeringChildPrices)
        .innerJoin(ageBands, eq(ageBands.id, offeringChildPrices.ageBandId))
        .where(inArray(offeringChildPrices.offeringId, passIds))
    : [];

  // Offers on the website that haven't ended. A coupon's code isn't shown: the team gives it out.
  const offerRows = await db
    .select()
    .from(offers)
    .where(and(eq(offers.propertyId, property.id), eq(offers.active, true), eq(offers.onWebsite, true), or(isNull(offers.endsOn), gte(offers.endsOn, todayInIndia()))))
    .orderBy(asc(offers.sortOrder), asc(offers.title));

  // Notices on now or later, newest first. A day's grace keeps one that ends today, whatever the server's clock.
  const noticeRows = await db
    .select()
    .from(siteNotices)
    .where(and(eq(siteNotices.propertyId, property.id), eq(siteNotices.active, true), or(isNull(siteNotices.endsOn), gte(siteNotices.endsOn, addDays(todayInIndia(), -1)))))
    .orderBy(desc(siteNotices.createdAt));

  return {
    notices: noticeRows.map((n) => ({ id: n.id, message: n.message, linkLabel: n.linkLabel, linkUrl: n.linkUrl, startsOn: n.startsOn, endsOn: n.endsOn })),
    offers: offerRows.map((offer) => ({ title: offer.title, details: offer.details, appliesTo: offer.appliesTo, label: offerLabel(offer), startsOn: offer.startsOn, endsOn: offer.endsOn })),
    roomTypes: types.map((type) => ({
      code: type.code,
      name: type.name,
      category: type.category,
      tagline: type.tagline,
      description: type.description,
      features: type.features,
      webGroup: type.webGroup,
      baseOccupancy: type.baseOccupancy,
      minGuests: type.minGuests,
      maxGuests: type.maxGuests,
      units: unitCounts.find((u) => u.roomTypeId === type.id)?.n ?? 0,
      rates: rateRows
        .filter((rate) => rate.roomTypeId === type.id)
        .map((rate) => ({
          dayKind: rate.dayKind,
          basis: rate.basis,
          basePaise: rate.basePaise,
          extraAdultPaise: rate.extraAdultPaise,
          mealPlan: rate.mealPlan,
          childPaise: Object.fromEntries(rateChildren.filter((c) => c.rateId === rate.id).map((c) => [c.band, c.paise])),
        })),
    })),
    passes: passRows.map((pass) => ({
      code: pass.code,
      name: pass.name,
      kind: pass.kind,
      summary: pass.summary,
      hours: slots.find((slot) => slot.offeringId === pass.id)?.label ?? null,
      adultPaise: pass.adultPaise,
      childPaise: Object.fromEntries(passChildren.filter((c) => c.offeringId === pass.id).map((c) => [c.band, c.paise])),
      soldOn: pass.soldOn,
      validFrom: pass.validFrom,
      validTo: pass.validTo,
    })),
  };
}
