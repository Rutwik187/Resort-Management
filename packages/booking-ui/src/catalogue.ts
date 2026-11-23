import { plural } from "./dates";
import type { Listing, ListingGroup, Pass, Photo, Rate } from "./types";

export type { Listing, ListingGroup, Pass, Photo };

/*
 * Turns what the admin says a website shows (the engine's
 * websiteCatalogue) into the widget's listings and passes. The shapes are
 * described here, not imported, so the widget never depends on database
 * code (docs/implementation-plan.md, section 3). Photos stay with each site,
 * found by the room type's or package's code.
 */

export type CatalogueRate = {
  dayKind: "weekday" | "weekend" | "any";
  basis: "room" | "person";
  basePaise: number;
  extraAdultPaise: number | null;
  mealPlan: "EP" | "CP" | "MAP" | "AP";
  /** By age band code, such as "child_5_11". */
  childPaise: Record<string, number>;
};

export type CatalogueRoomType = {
  code: string;
  name: string;
  category: "room" | "cottage" | "villa" | "tent" | "dormitory" | "other";
  tagline: string | null;
  description: string | null;
  features: string[];
  webGroup: string | null;
  minGuests: number;
  maxGuests: number | null;
  units: number;
  rates: CatalogueRate[];
};

export type CataloguePass = {
  code: string;
  name: string;
  kind: "day_package" | "activity" | "dining" | "other";
  summary: string | null;
  hours: string | null;
  adultPaise: number;
  childPaise: Record<string, number>;
};

/** An offer the website shows. Coupon codes stay with the team. */
export type CatalogueOffer = { title: string; details: string | null; appliesTo: "stay" | "day" | "any" };

export type CatalogueStayPackage = {
  code: string;
  kind: "stay" | "staycation" | "custom";
  name: string;
  summary: string | null;
  inclusions: string[];
  exclusions: string[];
  mealPlan: CatalogueRate["mealPlan"];
  nights: number | null;
  minNights: number | null;
  maxNights: number | null;
  basis: "person" | "couple" | "room";
  priceUnit: "stay" | "night";
  pricePaise: number;
  extraAdultPaise: number | null;
  childPaise: Record<string, number>;
  arrivalDays: number[] | null;
  cancellationNote: string | null;
  roomTypes: { code: string; name: string }[];
};

export type Catalogue = { roomTypes: CatalogueRoomType[]; passes: CataloguePass[]; offers?: CatalogueOffer[]; stayPackages?: CatalogueStayPackage[] };
export type Section = { id: string; title: string; line?: string };

/** The sites' words for each meal plan. Room only says nothing. */
const mealWords: Record<CatalogueRate["mealPlan"], string | undefined> = {
  EP: undefined,
  CP: "Room with breakfast",
  MAP: "Breakfast and one main meal",
  AP: "All meals",
};
const nouns: Record<CatalogueRoomType["category"], string> = { room: "room", cottage: "cottage", villa: "villa", tent: "tent", dormitory: "dormitory", other: "package" };
const rupees = (paise: number | null | undefined) => (paise === null || paise === undefined ? undefined : paise / 100);

function rate(row: CatalogueRate | undefined): Rate | undefined {
  if (!row) return undefined;
  return {
    basis: row.basis === "person" ? "person" : "couple",
    base: row.basePaise / 100,
    extraAdult: rupees(row.extraAdultPaise),
    child5to11: rupees(row.childPaise.child_5_11),
    child3to5: rupees(row.childPaise.child_3_5),
    meals: mealWords[row.mealPlan],
  };
}

/** One room type as a listing: its text, guests, rooms and base rates. */
export function listingFromCatalogue(type: CatalogueRoomType, photos: Photo[]): Listing {
  const noun = nouns[type.category];
  const byDay = (day: CatalogueRate["dayKind"]) => type.rates.find((r) => r.dayKind === day);
  const guests =
    type.maxGuests === null
      ? type.minGuests > 1
        ? `${type.minGuests} or more guests`
        : undefined
      : type.minGuests > 1 && type.minGuests < type.maxGuests
        ? `${type.minGuests} to ${type.maxGuests} guests`
        : `Up to ${type.maxGuests} guests`;
  // Short standouts only, such as "Balcony jacuzzi"; longer features wait under "Details".
  const standout = type.features.find((feature) => feature.length <= 24 && !/^(Air conditioning|Attached bathroom|Balcony|Flat-screen TV|Mineral water|Pure-veg meals included|Veg and non-veg meals)$/i.test(feature));
  const hasRate = type.rates.length > 0;
  return {
    id: type.code,
    name: type.name,
    noun,
    line: type.tagline ?? "",
    photos,
    facts: [type.units ? plural(type.units, noun) : undefined, guests, standout].filter((fact): fact is string => Boolean(fact)),
    details: type.description ?? undefined,
    features: type.features.length ? type.features : undefined,
    minGuests: type.minGuests > 1 ? type.minGuests : undefined,
    maxGuests: type.maxGuests ?? undefined,
    units: type.units || undefined,
    weekday: rate(byDay("weekday")),
    weekend: rate(byDay("weekend")),
    everyNight: rate(byDay("any")),
    onRequest: hasRate ? undefined : "Rates on request",
  };
}

/**
 * The website's Stays sections, filled from the catalogue in the admin's
 * order. A room type in a section the site doesn't know joins the first.
 * Sections with nothing in them drop out.
 */
export function stayGroupsFromCatalogue(catalogue: Catalogue, sections: Section[], photosFor: (code: string) => Photo[]): ListingGroup[] {
  const known = new Set(sections.map((section) => section.id));
  return sections
    .map((section, index) => ({
      id: section.id,
      title: section.title,
      line: section.line,
      listings: catalogue.roomTypes
        .filter((type) => (type.webGroup && known.has(type.webGroup) ? type.webGroup === section.id : index === 0))
        .map((type) => listingFromCatalogue(type, photosFor(type.code))),
    }))
    .filter((group) => group.listings.length > 0);
}

/** The day packages on sale, as day passes. */
export function passesFromCatalogue(catalogue: Catalogue, photoFor: (code: string) => Photo | undefined): Pass[] {
  return catalogue.passes
    .filter((pass) => pass.kind === "day_package")
    .map((pass) => ({
      id: pass.code,
      name: pass.name,
      hours: pass.hours ?? "",
      meals: pass.summary ?? "",
      adult: pass.adultPaise / 100,
      child5to11: rupees(pass.childPaise.child_5_11),
      child3to5: rupees(pass.childPaise.child_3_5),
      photo: photoFor(pass.code),
    }));
}

/** The offers for stays or for day visits, such as "Offer: 25% off for honeymooners." */
export function offersFor(catalogue: Catalogue, kind: "stay" | "day"): CatalogueOffer[] {
  return (catalogue.offers ?? []).filter((offer) => offer.appliesTo === "any" || offer.appliesTo === kind);
}

export function offerNotes(catalogue: Catalogue, kind: "stay" | "day"): string[] {
  return offersFor(catalogue, kind).map((offer) => `Offer: ${offer.title}.${offer.details ? ` ${offer.details}` : ""}`);
}

/** A package card's id: the package and the room type it books, such as pkg~weekend-escape~glass-house. */
export const packageListingId = (packageCode: string, roomTypeCode: string) => `pkg~${packageCode}~${roomTypeCode}`;

/** The package and room type codes in a package card's id, or null for a plain room type. */
export function parsePackageListingId(id: string): { packageCode: string; roomTypeCode: string } | null {
  const [prefix, packageCode, roomTypeCode] = id.split("~");
  return prefix === "pkg" && packageCode && roomTypeCode ? { packageCode, roomTypeCode } : null;
}

const dayWords = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * The website's stay and staycation packages as cards (URD 5.3, PKG-01): one
 * card for each package and room type it can be booked in. Photos come from
 * the room type's own listing.
 */
export function packageListings(catalogue: Catalogue, photosFor: (code: string) => Photo[]): Listing[] {
  return (catalogue.stayPackages ?? []).flatMap((pkg) =>
    pkg.roomTypes.map((room) => {
      const length = pkg.nights ? plural(pkg.nights, "night") : pkg.minNights ? `${pkg.minNights}+ nights` : undefined;
      const arrivals = pkg.arrivalDays?.length ? `Arrive ${pkg.arrivalDays.map((d) => dayWords[d]).join(" or ")}` : undefined;
      const details = [
        pkg.inclusions.length ? `Includes: ${pkg.inclusions.join(", ")}.` : "",
        pkg.exclusions.length ? `Not included: ${pkg.exclusions.join(", ")}.` : "",
        pkg.cancellationNote ?? "",
      ]
        .filter(Boolean)
        .join(" ");
      return {
        id: packageListingId(pkg.code, room.code),
        name: pkg.roomTypes.length > 1 ? `${pkg.name}, ${room.name}` : pkg.name,
        noun: "package",
        line: pkg.summary ?? "",
        photos: photosFor(room.code),
        facts: [length, mealWords[pkg.mealPlan], arrivals, pkg.roomTypes.length > 1 ? undefined : room.name].filter((fact): fact is string => Boolean(fact)),
        details: details || undefined,
        features: pkg.inclusions.length ? pkg.inclusions : undefined,
        everyNight: {
          basis: pkg.basis === "person" ? "person" : "couple",
          base: pkg.pricePaise / 100,
          extraAdult: rupees(pkg.extraAdultPaise),
          child5to11: rupees(pkg.childPaise.child_5_11),
          child3to5: rupees(pkg.childPaise.child_3_5),
          meals: mealWords[pkg.mealPlan],
        },
        stayPackage: { nights: pkg.nights, minNights: pkg.minNights, maxNights: pkg.maxNights, unit: pkg.priceUnit, arrivalDays: pkg.arrivalDays, room: room.name },
      } satisfies Listing;
    }),
  );
}
