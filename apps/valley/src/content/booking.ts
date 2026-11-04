import type { Desk, Listing, ListingGroup, Rate } from "@repo/booking-ui";
import { photos, type PhotoKey } from "./photos";
import { contact, cottageFeatures, cottages, packages, type Cottage, type RatePlan, type StayPackage } from "./resort";

/*
 * The cottages and packages in resort.ts, in the shape the shared booking
 * widget reads. A rate the site doesn't publish stays out, so the widget
 * leaves that price to the team instead of guessing it.
 */

export const desk: Desk = {
  resortName: "Prathamesh Valley Resorts",
  whatsapp: contact.whatsapp,
  phone: contact.phone,
};

const alts: Partial<Record<PhotoKey, string>> = {
  roomBright: "A bright cottage room: a wooden double bed with teal cushions, yellow curtains and a mirror",
  roomLaterite: "A cottage room with a red laterite stone wall, a wooden sofa bed and two chairs at a small table",
  roomWardrobe: "A cottage room with a double bed, a wooden wardrobe and yellow curtains",
  cottageFront: "A laterite cottage with a white railing and a carved door, on chequered paving",
  roomJacuzzi: "A cottage room with a laterite wall, a television, and a jacuzzi in an alcove behind curtains",
  jacuzzi: "The jacuzzi tub, with turquoise curtains drawn back",
  roomLateriteTv: "A laterite-walled room with a television, a table and two chairs",
  roomTeal: "A double bed with teal throws, beside a red laterite wall",
  bathtub: "A white bath tub set in dark granite",
  bathtub2: "A bath tub in a white tiled bathroom",
  roomLaterite2: "A room with a laterite wall, a television and a small table",
  veranda: "A cottage veranda with a white railing, plants and a lawn in front",
  verandaNight: "A laterite cottage at night, its veranda lit by warm strip lights",
  thali: "A table laid with rotis, curries, rice and salad",
  lawn: "A wide lawn between the cottages, edged with plants",
  pool: "The kidney-shaped pool on chequered paving, with a painted wall beyond",
  playArea: "Swings, a slide and a roundabout in the children's play area",
  breakfastTable: "A breakfast table set with plates, fruit and glasses of juice",
  diningHall: "The dining hall, with red brick walls, wooden chairs and tall windows",
};

const shots = (keys: PhotoKey[]) => keys.map((key) => ({ src: photos[key], alt: alts[key] ?? "" }));

const coupleRate = (plan: RatePlan, meals: string): Rate => ({
  basis: plan.basis === "per couple" ? "couple" : "person",
  base: plan.base,
  extraAdult: plan.extraPerson,
  child5to11: plan.child5to11,
  child3to5: plan.child3to5,
  meals,
});

function cottage(c: Cottage): Listing {
  return {
    id: c.slug,
    name: c.name,
    noun: "cottage",
    line: c.line,
    photos: shots(c.photos),
    facts: [c.guests, c.feature],
    details: c.description,
    features: cottageFeatures,
    maxGuests: 4,
    weekday: coupleRate(c.weekday, "Room with breakfast"),
    weekend: coupleRate(c.weekend, "Breakfast and one main meal"),
  };
}

/** A package's published amount for one line of its rate card, such as "Child, 5 to 11". */
const amount = (pkg: StayPackage, label: RegExp) => pkg.rates.find((rate) => label.test(rate.label))?.amount;

const packagePhotos: Record<string, PhotoKey[]> = {
  couple: ["verandaNight", "thali", "roomTeal"],
  group: ["lawn", "pool", "playArea"],
  "full-board": ["breakfastTable", "diningHall", "thali"],
};

function stayPackage(pkg: StayPackage): Listing {
  const perPerson = amount(pkg, /^Per person/);
  const meals = pkg.slug === "full-board" ? "Breakfast, lunch, hi-tea and dinner" : "All meals, veg or non-veg";
  return {
    id: `${pkg.slug}-package`,
    name: pkg.name,
    noun: "package",
    line: pkg.line,
    photos: shots(packagePhotos[pkg.slug] ?? []),
    facts: [pkg.guests, pkg.mark],
    features: pkg.includes,
    minGuests: perPerson ? 4 : undefined,
    maxGuests: perPerson ? undefined : 4,
    everyNight: perPerson
      ? { basis: "person", base: perPerson, child5to11: amount(pkg, /^Child, 5/), child3to5: amount(pkg, /^Child, 3/), meals }
      : {
          basis: "couple",
          base: amount(pkg, /^Per couple/)!,
          extraAdult: amount(pkg, /^Adult/),
          child5to11: amount(pkg, /^Child, 5/),
          child3to5: amount(pkg, /^Child, 3/),
          meals,
        },
  };
}

export const stayGroups: ListingGroup[] = [
  {
    id: "cottages",
    title: "Cottages",
    line: "Priced per couple, a night. Add a guest, a child or a second cottage as you need.",
    listings: cottages.map(cottage),
  },
  {
    id: "packages",
    title: "Packages with meals",
    line: "Every meal included, at one rate for every night.",
    listings: packages.map(stayPackage),
  },
];

export const stayNotes = [
  `Check-in ${contact.checkIn}, check-out ${contact.checkOut}.`,
  "Sunday to Thursday nights include breakfast. Friday and Saturday nights include breakfast and one main meal. Packages include every meal.",
  "In the mid and peak seasons and at New Year, the minimum stay is two nights. Children under 3 stay free.",
  "Our team confirms availability and the final price on WhatsApp. Nothing is charged now.",
];
