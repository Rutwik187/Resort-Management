import type { Desk, Listing, ListingGroup, Pass, Rate } from "@repo/booking-ui";
import { photos, type PhotoKey } from "./photos";
import { contact, currentOffer, dayPasses, listLine, meals, stayFeatures, stays, type CouplePlan, type Stay } from "./resort";

/*
 * The stays and day passes in resort.ts, in the shape the shared booking
 * widget reads. A rate the site doesn't publish stays out, so the widget
 * leaves that price to the team instead of guessing it.
 */

export const desk: Desk = {
  resortName: "Prathamesh Go Crazy Resort",
  whatsapp: contact.whatsapp,
  phone: contact.phone,
};

const alts: Partial<Record<PhotoKey, string>> = {
  chiraPair: "Two red laterite stone cottages with carved white eaves and a palm between them",
  chiraRoom: "A chira cottage room: laterite stone walls, a carved wooden door, a TV and a small table",
  chiraPalms: "A laterite stone cottage between two palms, on a green lawn",
  chiraRoom3: "A double bed under a wooden ceiling, against a laterite stone wall",
  paintedCottage: "A cottage painted with folk art in purple, blue and yellow, under mango trees",
  sofaRoom2: "A bright room with a wooden floor, a TV and a sofa-cum-bed",
  orangeCottage: "An orange cottage with painted murals and a railed veranda among the trees",
  sofaRoom4: "A white room with a wooden floor, a TV on the wall and a wardrobe",
  coupleRoom: "A double bed in a warm yellow room with a painted flower motif above it",
  coupleRoom2: "A double bed and dressing table in a yellow room with a wooden floor",
  coupleRoom3: "A yellow room with a glass door onto the garden, a double bed and a painted motif",
  villa: "Two cottages under tall trees, with a lawn in front",
  villaRoom: "A villa room with two beds, laterite stone walls and a wooden ceiling",
  villaRoom2: "A villa room with twin beds against a laterite stone wall",
  villaRoom3: "A villa room with a wardrobe and a laterite stone wall",
};

const coupleRate = (plan: CouplePlan | undefined, meals: string): Rate | undefined =>
  plan && { basis: "couple", base: plan.base, extraAdult: plan.extraPerson, child5to11: plan.child5to11, child3to5: plan.child3to5, meals };

/** "2 to 4 guests" gives 2 and 4; "6 guests" gives 6 and 6. */
const guestRange = (guests: string) => {
  const [low, high = low] = (guests.match(/\d+/g) ?? ["2"]).map(Number);
  return { low, high };
};

function listing(stay: Stay): Listing {
  const { low, high } = guestRange(stay.guests);
  const villa = stay.perPerson !== undefined;
  return {
    id: stay.slug,
    name: stay.name,
    noun: villa ? "villa" : "cottage",
    line: stay.line,
    photos: stay.photos.map((key) => ({ src: photos[key], alt: alts[key] ?? stay.name })),
    facts: [stay.units, stay.guests],
    features: stayFeatures,
    // A villa is priced for its whole party: the site gives one size for it.
    minGuests: villa ? low : undefined,
    maxGuests: high,
    units: Number(stay.units.match(/\d+/)?.[0] ?? 1),
    weekday: coupleRate(stay.weekday, "Room with breakfast"),
    weekend: coupleRate(stay.weekend, "Breakfast and one main meal"),
    everyNight: villa ? { basis: "person", base: stay.perPerson!, meals: "Veg and non-veg meals" } : undefined,
  };
}

export const stayGroups: ListingGroup[] = [
  {
    id: "cottages",
    title: "Cottages",
    line: "Priced per couple, a night. Add a guest, a child or a second cottage as you need.",
    listings: stays.filter((s) => s.perPerson === undefined).map(listing),
  },
  {
    id: "villas",
    title: "Villas for groups",
    line: "Priced per person, a night, for the whole party.",
    listings: stays.filter((s) => s.perPerson !== undefined).map(listing),
  },
];

export const stayNotes = [
  `Check-in ${contact.checkIn}, check-out ${contact.checkOut}.`,
  "Sunday to Thursday nights include breakfast. Friday and Saturday nights include breakfast and one main meal.",
  "Every stay includes the activities and games. Paid activities are extra, at the activity.",
  "Our team confirms availability and the final price on WhatsApp. Nothing is charged now.",
];

const mealLabel = Object.fromEntries(meals.map((meal) => [meal.id, meal.label.toLowerCase()]));

export const passes: Pass[] = dayPasses.map((pass) => ({
  id: pass.id,
  name: pass.name,
  hours: pass.hours,
  meals: `${listLine(pass.meals.map((id) => mealLabel[id]))}, veg or non-veg.`,
  adult: pass.adult,
  child5to11: pass.child5to11,
  child3to5: pass.child3to5,
}));

export const dayNotes = [
  ...(currentOffer ? [`Offer: ${currentOffer.title}. ${currentOffer.note}`] : []),
  "Every day pass includes the activities and games. Paid activities are extra, at the activity.",
  "Our team confirms the booking on WhatsApp. Nothing is charged now.",
];
