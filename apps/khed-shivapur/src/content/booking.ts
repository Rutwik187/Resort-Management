import type { Desk, Listing, ListingGroup, Pass, Rate } from "@repo/booking-ui";
import { photos } from "./photos";
import { contact, dayPackages, stays, type RatePlan, type Stay } from "./resort";

/*
 * The stays and day packages in resort.ts, in the shape the shared booking
 * widget reads. Prices, rooms and guests stay in resort.ts.
 */

export const desk: Desk = {
  resortName: "Prathamesh Resorts",
  whatsapp: contact.whatsapp,
  phone: contact.bookingPhone,
};

const weekdayMeals = "Room with breakfast";
const weekendMeals = "Breakfast and one main meal";

const rate = (plan: RatePlan | undefined, meals?: string): Rate | undefined =>
  plan && {
    basis: plan.basis === "per couple" ? "couple" : "person",
    base: plan.base,
    extraAdult: plan.basis === "per couple" ? plan.extraPerson : undefined,
    child5to11: plan.child5to11,
    child3to5: plan.child3to5,
    meals,
  };

/** "4 to 5 guests" gives 4 and 5; "4 guests" gives 4 and 4. */
const guestRange = (guests: string) => {
  const [low, high = low] = (guests.match(/\d+/g) ?? ["2"]).map(Number);
  return { low, high };
};

/** What one booking of each stay is called, for buttons such as "Add tent". */
const nouns: Record<string, string> = {
  "bungalow-private-pool": "villa",
  "river-view-tent": "tent",
  "garden-view-chira-cottages": "cottage",
  "wooden-cottage": "cottage",
  "cozy-cottage": "cottage",
  "poolside-big-cottage": "cottage",
};

function listing(stay: Stay): Listing {
  const { low, high } = guestRange(stay.guests);
  const perPerson = (stay.weekday ?? stay.everyDay)?.basis === "per person";
  const standout = stay.features.filter((f) => !/^(Air conditioning|Attached bathroom|Balcony|Flat-screen TV|Mineral water|Pure-veg meals included)$/.test(f));
  return {
    id: stay.slug,
    name: stay.name,
    noun: nouns[stay.slug] ?? "room",
    line: stay.line,
    photos: stay.photos.map((key, i) => ({
      src: photos[key],
      alt: i === 0 ? `${stay.name}: ${stay.line}` : `${stay.name}, photo ${i + 1} of ${stay.photos.length}`,
    })),
    // Short standouts only, such as "Balcony jacuzzi"; longer features wait under "Details".
    facts: [stay.rooms, stay.guests, ...standout.filter((f) => f.length <= 24).slice(0, 1)],
    details: stay.description,
    features: stay.features,
    // A per-person stay is priced for a group, so its smallest group is its minimum.
    minGuests: perPerson ? low : undefined,
    maxGuests: high,
    // "One 3 BHK villa" is one villa; "6 rooms" is six.
    units: /^one\b/i.test(stay.rooms) ? 1 : Number(stay.rooms.match(/\d+/)?.[0] ?? 1),
    weekday: rate(stay.weekday, weekdayMeals),
    weekend: rate(stay.weekend, weekendMeals),
    everyNight: rate(stay.everyDay),
  };
}

const groupSlugs = ["bungalow-private-pool", "wooden-house-501", "poolside-big-cottage"];

export const stayGroups: ListingGroup[] = [
  {
    id: "rooms",
    title: "Rooms, cottages and tents",
    line: "Priced per couple, a night. Add a guest, a child or a second room as you need.",
    listings: stays.filter((s) => !groupSlugs.includes(s.slug)).map(listing),
  },
  {
    id: "groups",
    title: "For families and groups",
    line: "Priced per person, a night, for larger parties.",
    listings: stays.filter((s) => groupSlugs.includes(s.slug)).map(listing),
  },
];

export const stayNotes = [
  `Check-in ${contact.checkIn}, check-out ${contact.checkOut}.`,
  "Sunday to Thursday nights include breakfast. Friday and Saturday nights include breakfast and one main meal.",
  "Every stay includes the games and activities. Babies under 3 stay free.",
  "Our team confirms availability and the final price on WhatsApp. Nothing is charged now.",
];

export const dayPasses: Pass[] = dayPackages.map((p) => ({
  id: p.name.toLowerCase().replace(/\s+/g, "-"),
  name: p.name,
  hours: p.hours,
  meals: `${p.meals}. ${p.kitchen} kitchen.`,
  adult: p.adult,
  child5to11: p.child5to11,
  child3to5: p.child3to5,
}));

export const dayNotes = [
  "Every day package includes all the games and activities.",
  "Our team confirms the booking on WhatsApp. Nothing is charged now.",
];
