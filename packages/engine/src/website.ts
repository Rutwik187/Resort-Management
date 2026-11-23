import { and, asc, count, desc, eq, gte, inArray, isNotNull, isNull, or } from "drizzle-orm";
import { addons, ageBands, contentSlots, galleryItems, offerDays, reviews, stayPackageChildPrices, stayPackages, offeringChildPrices, offerings, offeringSlots, offers, properties, rateChildPrices, rates, roomTypes, siteNotices, units, type Executor } from "@repo/db";
import { addDays, todayInIndia } from "./dates";
import { offerLabel, offerTakesOff } from "./offers";

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

/**
 * An offer the website shows: what it is, what it covers, and its terms in
 * words. A coupon's code shows only when staff made it public.
 */
export type WebsiteOffer = {
  title: string;
  details: string | null;
  appliesTo: "stay" | "day" | "any";
  label: string;
  startsOn: string | null;
  endsOn: string | null;
  code: string | null;
  /** Whether the guest needs a code for it. */
  coupon: boolean;
  terms: string[];
};

/** A scheduled Offer of the Day (OFR-01). The page shows the one for today, in India, whenever it was cached. */
export type WebsiteOfferDay = { day: string; title: string; details: string | null; label: string; appliesTo: "stay" | "day" | "any"; terms: string[] };

/**
 * A notice for the website, newest first. Its dates are kept, so the page
 * shows it on exactly those days whenever the page was cached.
 */
export type WebsiteNotice = { id: string; message: string; linkLabel: string | null; linkUrl: string | null; startsOn: string | null; endsOn: string | null };

/** An add-on the guest can choose before paying (PR-06). Its price is before GST. */
export type WebsiteAddon = { code: string; name: string; summary: string | null; basis: "unit" | "person" | "night"; pricePaise: number; soldWith: "stay" | "day" | "both"; maxQuantity: number };

/** The company that runs the resort, for the footer and policies page (WEB-04). Empty fields stay empty: staff fill them in Settings. */
export type WebsiteCompany = { legalName: string | null; gstin: string | null; address: string | null; phone: string | null; email: string | null };

/** A stay or staycation package on the website (URD 5.3, PKG-01), with the room types it can be booked in. */
export type WebsiteStayPackage = {
  code: string;
  kind: "stay" | "staycation" | "custom";
  name: string;
  summary: string | null;
  inclusions: string[];
  exclusions: string[];
  mealPlan: "EP" | "CP" | "MAP" | "AP";
  nights: number | null;
  minNights: number | null;
  maxNights: number | null;
  basis: "person" | "couple" | "room";
  priceUnit: "stay" | "night";
  pricePaise: number;
  extraAdultPaise: number | null;
  /** By age band code. */
  childPaise: Record<string, number>;
  arrivalDays: number[] | null;
  validFrom: string | null;
  validTo: string | null;
  cancellationNote: string | null;
  featured: boolean;
  roomTypes: { code: string; name: string }[];
};

/** Google's rating and count for the resort (REV-03), its listing, and the reviews to show (REV-02, REV-04). */
export type WebsiteReviews = {
  rating: string | null;
  count: number | null;
  listingUrl: string | null;
  writeUrl: string | null;
  items: { id: string; author: string; authorUrl: string | null; photoUrl: string | null; rating: number; text: string | null; reviewedAt: string | null; featured: boolean }[];
};

/** A gallery photo on the website (URD 4.2, CMS-06). Only photos with alt text that staff haven't hidden. */
export type WebsitePhoto = { id: string; url: string; width: number | null; height: number | null; alt: string; caption: string | null; category: string; featured: boolean };

export type WebsiteCatalogue = { reviews: WebsiteReviews; content: Record<string, string>; gallery: WebsitePhoto[]; company: WebsiteCompany; stayPackages: WebsiteStayPackage[]; roomTypes: WebsiteRoomType[]; passes: WebsitePass[]; addons: WebsiteAddon[]; offers: WebsiteOffer[]; offerDays: WebsiteOfferDay[]; notices: WebsiteNotice[] };

/** A resort's website catalogue, or null when there is no such resort. A few queries, run one after another. */
export async function websiteCatalogue(db: Executor, propertyCode: string): Promise<WebsiteCatalogue | null> {
  const [property] = await db
    .select({
      id: properties.id,
      legalName: properties.legalName,
      gstin: properties.gstin,
      address: properties.address,
      phone: properties.phone,
      email: properties.email,
      googleRating: properties.googleRating,
      googleReviewCount: properties.googleReviewCount,
      mapsUrl: properties.mapsUrl,
      reviewUrl: properties.reviewUrl,
    })
    .from(properties)
    .where(eq(properties.code, propertyCode));
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

  const addonRows = await db
    .select()
    .from(addons)
    .where(and(eq(addons.propertyId, property.id), eq(addons.active, true), eq(addons.onWebsite, true)))
    .orderBy(asc(addons.sortOrder), asc(addons.name));

  // Offers on the website that haven't ended. A coupon's code isn't shown: the team gives it out.
  const offerRows = await db
    .select()
    .from(offers)
    .where(and(eq(offers.propertyId, property.id), eq(offers.active, true), eq(offers.onWebsite, true), or(isNull(offers.endsOn), gte(offers.endsOn, todayInIndia()))))
    .orderBy(asc(offers.sortOrder), asc(offers.title));

  // Stay packages on the website that haven't ended (PKG-01).
  const packageRows = await db
    .select()
    .from(stayPackages)
    .where(and(eq(stayPackages.propertyId, property.id), eq(stayPackages.active, true), eq(stayPackages.onWebsite, true), or(isNull(stayPackages.validTo), gte(stayPackages.validTo, todayInIndia()))))
    .orderBy(desc(stayPackages.featured), asc(stayPackages.sortOrder), asc(stayPackages.name));
  const packageChildren = packageRows.length
    ? await db
        .select({ packageId: stayPackageChildPrices.packageId, band: ageBands.code, paise: stayPackageChildPrices.paise })
        .from(stayPackageChildPrices)
        .innerJoin(ageBands, eq(ageBands.id, stayPackageChildPrices.ageBandId))
        .where(inArray(stayPackageChildPrices.packageId, packageRows.map((p) => p.id)))
    : [];

  // Offers of the Day from yesterday on, so a page cached overnight still finds today's.
  const dayRows = await db
    .select({ day: offerDays.day, offer: offers })
    .from(offerDays)
    .innerJoin(offers, eq(offers.id, offerDays.offerId))
    .where(and(eq(offerDays.propertyId, property.id), eq(offers.active, true), gte(offerDays.day, addDays(todayInIndia(), -1))))
    .orderBy(asc(offerDays.day))
    .limit(30);
  const scheduledIds = new Set(
    (await db.select({ offerId: offerDays.offerId }).from(offerDays).where(eq(offerDays.propertyId, property.id)).groupBy(offerDays.offerId)).map((r) => r.offerId),
  );
  const names = new Map([...types.map((t) => [t.id, t.name] as const), ...passRows.map((p) => [p.id, p.name] as const)]);

  // Published page text (plan section 2), and the gallery in staff's order.
  const pageText = await db.select({ key: contentSlots.key, text: contentSlots.publishedText }).from(contentSlots).where(and(eq(contentSlots.propertyId, property.id), isNotNull(contentSlots.publishedText)));
  const photos = await db
    .select()
    .from(galleryItems)
    .where(and(eq(galleryItems.propertyId, property.id), eq(galleryItems.hidden, false), isNotNull(galleryItems.alt)))
    .orderBy(asc(galleryItems.category), asc(galleryItems.sortOrder), desc(galleryItems.createdAt));

  // Featured reviews first, then the newest; hidden ones never (REV-03).
  const reviewRows = await db
    .select()
    .from(reviews)
    .where(and(eq(reviews.propertyId, property.id), eq(reviews.hidden, false)))
    .orderBy(desc(reviews.featured), desc(reviews.reviewedAt))
    .limit(6);

  // Notices on now or later, newest first. A day's grace keeps one that ends today, whatever the server's clock.
  const noticeRows = await db
    .select()
    .from(siteNotices)
    .where(and(eq(siteNotices.propertyId, property.id), eq(siteNotices.active, true), or(isNull(siteNotices.endsOn), gte(siteNotices.endsOn, addDays(todayInIndia(), -1)))))
    .orderBy(desc(siteNotices.createdAt));

  return {
    stayPackages: packageRows
      .map((p) => ({
        code: p.code,
        kind: p.kind,
        name: p.name,
        summary: p.summary,
        inclusions: p.inclusions,
        exclusions: p.exclusions,
        mealPlan: p.mealPlan,
        nights: p.nights,
        minNights: p.minNights,
        maxNights: p.maxNights,
        basis: p.basis,
        priceUnit: p.priceUnit,
        pricePaise: p.pricePaise,
        extraAdultPaise: p.extraAdultPaise,
        childPaise: Object.fromEntries(packageChildren.filter((c) => c.packageId === p.id).map((c) => [c.band, c.paise])),
        arrivalDays: p.arrivalDays,
        validFrom: p.validFrom,
        validTo: p.validTo,
        cancellationNote: p.cancellationNote,
        featured: p.featured,
        // Only room types the website sells, in the admin's order.
        roomTypes: types.filter((t) => p.roomTypeIds.includes(t.id)).map((t) => ({ code: t.code, name: t.name })),
      }))
      .filter((p) => p.roomTypes.length > 0),
    content: Object.fromEntries(pageText.filter((slot) => slot.text?.trim()).map((slot) => [slot.key, slot.text!.trim()])),
    gallery: photos.map((p) => ({ id: p.id, url: p.url, width: p.width, height: p.height, alt: p.alt!, caption: p.caption, category: p.category, featured: p.featured })),
    reviews: {
      rating: property.googleRating,
      count: property.googleReviewCount,
      listingUrl: property.mapsUrl,
      writeUrl: property.reviewUrl,
      items: reviewRows.map((r) => ({ id: r.id, author: r.author, authorUrl: r.authorUrl, photoUrl: r.photoUrl, rating: r.rating, text: r.text, reviewedAt: r.reviewedAt?.toISOString() ?? null, featured: r.featured })),
    },
    company: { legalName: property.legalName || null, gstin: property.gstin || null, address: property.address || null, phone: property.phone || null, email: property.email || null },
    notices: noticeRows.map((n) => ({ id: n.id, message: n.message, linkLabel: n.linkLabel, linkUrl: n.linkUrl, startsOn: n.startsOn, endsOn: n.endsOn })),
    // An offer scheduled as Offer of the Day shows in its strip, on its days only.
    offers: offerRows.filter((offer) => !scheduledIds.has(offer.id)).map((offer) => ({
        title: offer.title,
        details: offer.details,
        appliesTo: offer.appliesTo,
        label: offerLabel(offer),
        startsOn: offer.startsOn,
        endsOn: offer.endsOn,
        code: offer.code && offer.showCode ? offer.code : null,
        coupon: Boolean(offer.code),
        terms: offerTerms(offer, names),
      })),
    offerDays: dayRows.map(({ day, offer }) => ({ day, title: offer.title, details: offer.details, label: offerLabel(offer), appliesTo: offer.appliesTo, terms: offerTerms(offer, names) })),
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
    addons: addonRows.map((a) => ({ code: a.code, name: a.name, summary: a.summary, basis: a.basis, pricePaise: a.pricePaise, soldWith: a.soldWith, maxQuantity: a.maxQuantity })),
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

const weekdayNames = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"];
const shortDay = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** An offer's rules as short lines a guest can read, such as "Book by 30 Nov 2026" (OFR-02). */
export function offerTerms(offer: typeof offers.$inferSelect, names: Map<string, string>): string[] {
  const terms: string[] = [];
  const covers = offer.appliesTo === "day" ? "visits" : "stays";
  if (offer.startsOn && offer.endsOn) terms.push(`For ${covers} from ${shortDay(offer.startsOn)} to ${shortDay(offer.endsOn)}.`);
  else if (offer.startsOn) terms.push(`For ${covers} from ${shortDay(offer.startsOn)}.`);
  else if (offer.endsOn) terms.push(`For ${covers} until ${shortDay(offer.endsOn)}.`);
  if (offer.bookFrom && offer.bookTo) terms.push(`Book between ${shortDay(offer.bookFrom)} and ${shortDay(offer.bookTo)}.`);
  else if (offer.bookTo) terms.push(`Book by ${shortDay(offer.bookTo)}.`);
  else if (offer.bookFrom) terms.push(`Book from ${shortDay(offer.bookFrom)}.`);
  if (offer.minDaysAhead) terms.push(`Book at least ${offer.minDaysAhead} days before you arrive.`);
  if (offer.maxDaysAhead !== null) terms.push(`For arrivals within ${offer.maxDaysAhead} ${offer.maxDaysAhead === 1 ? "day" : "days"} of booking.`);
  if (offer.minNights && offer.appliesTo !== "day") terms.push(`Stays of ${offer.minNights} nights or more.`);
  if (offer.weekdays?.length) terms.push(`${offer.appliesTo === "day" ? "Visits" : "Nights"} on ${offer.weekdays.map((d) => weekdayNames[d]).join(", ")} only.`);
  const covered = [...offer.roomTypeIds, ...offer.offeringIds].map((id) => names.get(id)).filter(Boolean);
  if (covered.length) terms.push(`Covers ${covered.join(", ")}.`);
  if (offer.minAmountPaise) terms.push(`On bookings of ₹${(offer.minAmountPaise / 100).toLocaleString("en-IN")} or more before GST.`);
  if (offer.maxUsesPerGuest) terms.push(offer.maxUsesPerGuest === 1 ? "Once per guest." : `Up to ${offer.maxUsesPerGuest} times per guest.`);
  if (offer.maxUses) terms.push("While it lasts.");
  if (offer.code && !offerTakesOff(offer)) terms.push("The team applies it when you book.");
  else if (!offer.code && offerTakesOff(offer)) terms.push("Applied by itself when you book online. One offer per booking.");
  else if (offer.code) terms.push("Enter the code when you book. One offer per booking.");
  return terms;
}
