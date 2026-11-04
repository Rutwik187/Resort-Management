import type { PhotoKey } from "./photos";

/*
 * Every fact on this site comes from the current prathameshvalleyresorts.com,
 * or from the resort's own photos and drone footage. Change prices and phone
 * numbers here, and the whole site follows.
 */

export const contact = {
  phone: { display: "+91 92251 05656", href: "tel:+919225105656" },
  // The current site gives one number for calls and WhatsApp, weddings included.
  whatsapp: { display: "+91 92251 05656", number: "919225105656" },
  email: "info@prathameshvalleyresorts.com",
  weddingEmail: "wedding@prathameshvalleyresorts.com",
  addressLines: ["SR. No. 28/1 & 48/2, Bhilar Kaswand Road", "Bhilar, Mahabaleshwar", "Maharashtra 412805"],
  // The same search the current site's map uses.
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=Prathamesh%20Valley%20Resort%2C%20Mahabaleshwar",
  // Where the resort's drone took off on 3 August 2026, from its GPS.
  geo: { lat: 17.90464, lng: 73.77372 },
  // The drone's altitude reading at take-off, rounded.
  elevation: "about 1,300 m",
  social: [
    { label: "Instagram", href: "https://www.instagram.com/prathamesh_valley_resort/" },
    { label: "Facebook", href: "https://www.facebook.com/PrathameshValleyResort/" },
    { label: "YouTube", href: "https://www.youtube.com/watch?v=3IBoKgv8vzA&list=PL7w1GOe6_HO5Y8HFiXHASw5kdw2lUDjsf" },
  ],
  checkIn: "1:00 pm",
  checkOut: "10:00 am",
} as const;

export const nav = [
  { label: "Cottages and rates", href: "/stays" },
  { label: "Weddings and events", href: "/celebrations" },
  { label: "Explore Mahabaleshwar", href: "/explore" },
] as const;

/* ------------------------------------------------------------------ */
/* Cottages                                                            */
/* ------------------------------------------------------------------ */

export type RatePlan = {
  basis: "per couple" | "per person";
  base: number;
  /** A guest above 11 years. */
  extraPerson?: number;
  child5to11?: number;
  child3to5?: number;
};

export type Cottage = {
  slug: string;
  name: string;
  /** What sets this cottage apart, in a few words. */
  feature: string;
  line: string;
  description: string;
  guests: string;
  photos: PhotoKey[];
  /** Monday to Thursday, on the CP plan: room with breakfast. */
  weekday: RatePlan;
  /** Friday and Saturday, on the MAP plan: breakfast and one main meal. */
  weekend: RatePlan;
};

export const cottageFeatures = ["Air conditioning", "Television", "Hot water", "All activities and amenities"];

export const cottages: Cottage[] = [
  {
    slug: "ac-cottage",
    name: "AC Cottage",
    feature: "The classic",
    line: "Red laterite walls, a cool room and the hills outside.",
    description:
      "Our cottages are built in natural lal chira, the red laterite stone of the Konkan, in the style of a Konkan house. Inside: air conditioning, a television and hot water, for two to four guests.",
    guests: "2 to 4 guests",
    photos: ["roomBright", "roomLaterite", "roomWardrobe", "cottageFront"],
    weekday: { basis: "per couple", base: 4000, extraPerson: 1500, child5to11: 1000 },
    weekend: { basis: "per couple", base: 7500, extraPerson: 2000, child5to11: 1500, child3to5: 800 },
  },
  {
    slug: "ac-cottage-with-jacuzzi",
    name: "AC Cottage with Jacuzzi",
    feature: "A jacuzzi in the room",
    line: "The same laterite cottage, with a private jacuzzi.",
    description:
      "Warm jets at the end of a cool day in the hills. A private jacuzzi in the room, with air conditioning, a television and hot water. For two to four guests.",
    guests: "2 to 4 guests",
    photos: ["roomJacuzzi", "jacuzzi", "roomLateriteTv", "roomTeal"],
    weekday: { basis: "per couple", base: 4500, extraPerson: 1500, child5to11: 1000 },
    weekend: { basis: "per couple", base: 8000, extraPerson: 2000, child5to11: 1500, child3to5: 800 },
  },
  {
    slug: "ac-cottage-with-bath-tub",
    name: "AC Cottage with Bath Tub",
    feature: "A long, deep bath",
    line: "A laterite cottage with a bath tub of its own.",
    description:
      "For a slow evening after a day of viewpoints. A bath tub of your own, with air conditioning, a television and hot water. For two to four guests.",
    guests: "2 to 4 guests",
    photos: ["bathtub", "bathtub2", "roomLaterite2", "veranda"],
    weekday: { basis: "per couple", base: 4500, extraPerson: 1500, child5to11: 1000 },
    weekend: { basis: "per couple", base: 8000, extraPerson: 2000, child5to11: 1500, child3to5: 800 },
  },
];

/* ------------------------------------------------------------------ */
/* Packages                                                            */
/* ------------------------------------------------------------------ */

export type StayPackage = {
  slug: string;
  name: string;
  /** Short name for the postmark. */
  mark: string;
  line: string;
  guests: string;
  includes: string[];
  rates: { label: string; amount: number }[];
};

export const packages: StayPackage[] = [
  {
    slug: "couple",
    name: "Couple package",
    mark: "For two",
    line: "Every meal from our kitchens, and the whole resort to enjoy.",
    guests: "2 to 4 guests",
    includes: ["All meals, veg or non-veg", "All activities and amenities", "Stay with television and hot water"],
    rates: [
      { label: "Per couple", amount: 8000 },
      { label: "Child, 5 to 11", amount: 1500 },
      { label: "Child, 3 to 5", amount: 800 },
    ],
  },
  {
    slug: "group",
    name: "Group package",
    mark: "Four or more",
    line: "Priced per person, so friends and families can split it simply.",
    guests: "From 4 guests",
    includes: ["All meals, veg or non-veg", "All activities and amenities", "Stay with television and hot water"],
    rates: [
      { label: "Per person", amount: 2500 },
      { label: "Child, 5 to 11", amount: 1500 },
      { label: "Child, 3 to 5", amount: 800 },
    ],
  },
  {
    slug: "full-board",
    name: "Full board (AP)",
    mark: "Four meals",
    line: "Breakfast, lunch, hi-tea and dinner, every day of your stay.",
    guests: "2 to 4 guests",
    includes: ["Breakfast, lunch, hi-tea and dinner", "All activities and amenities", "Stay with television and hot water"],
    rates: [
      { label: "Per couple", amount: 4800 },
      { label: "Adult, above 12", amount: 2000 },
      { label: "Child, 5 to 12", amount: 1500 },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Seasons and places                                                  */
/* ------------------------------------------------------------------ */

export const seasons: { name: string; months: string; line: string; photo: PhotoKey; alt: string }[] = [
  {
    name: "Monsoon",
    months: "June to September",
    line: "The Ghats turn green, and cloud comes down to the fields and the cottages.",
    photo: "mistyWalk",
    alt: "The chequered path between the cottages under a grey, misty sky",
  },
  {
    name: "Winter",
    months: "October to February",
    line: "Clear, cool days and crisp mornings, and the strawberry season on the farms around Bhilar.",
    photo: "aerialTerraces",
    alt: "The resort from the air among terraced green fields and red earth",
  },
  {
    name: "Summer",
    months: "March to May",
    line: "When the plains bake, the hills stay cooler, and the pool is the place to be.",
    photo: "pool",
    alt: "The kidney-shaped pool under a blue sky, with a painted mural wall beyond",
  },
];

export const placeGroups: { area: string; places: string[] }[] = [
  { area: "Bhilar", places: ["Bhilar, the village of books", "Strawberry farms, in season"] },
  { area: "Panchgani", places: ["Table Land", "Sydney Point", "Parsi Point"] },
  {
    area: "Mahabaleshwar",
    places: ["Venna Lake", "Mapro Garden", "Arthur's Seat", "Elephant's Head Point", "Kate's Point", "Wilson Point", "Lingmala Falls"],
  },
  { area: "Further afield", places: ["Pratapgad Fort", "Tapola"] },
];

/* ------------------------------------------------------------------ */
/* Celebrations                                                        */
/* ------------------------------------------------------------------ */

export const weddingMoments: { title: string; body: string; points: string[]; photo: PhotoKey; alt: string }[] = [
  {
    title: "Mehendi and haldi",
    body: "Bright, happy mornings in the gardens, and pre-wedding shoots among the trees and flowers.",
    points: ["Ideal for a professional photo shoot", "Food included in the package", "A package made to your plans", "Ample rooms for family"],
    photo: "weddingCourtyard",
    alt: "A white floral mandap on the chequered courtyard, with rows of white chairs",
  },
  {
    title: "The ceremony",
    body: "Plan the day your way, with the Western Ghats behind every photograph.",
    points: ["Ample space for every guest", "Comfortable rooms for the families", "Reputed chefs and caterers, multi-cuisine", "Calm surroundings for photography"],
    photo: "weddingAisle",
    alt: "A red carpet aisle across the lawn between white chairs, leading to a flower-decked stage",
  },
  {
    title: "The reception",
    body: "An on-site manager runs the evening, so the two of you can enjoy it.",
    points: ["Professional catering and menu options", "Ample seating for guests", "Theme décor and floral arrangements", "Rooms for guests who stay on"],
    photo: "weddingHallAisle",
    alt: "The Imperial Hall set for a wedding, with a red carpet between rows of white chairs",
  },
];

export const eventTypes = [
  {
    title: "Corporate events",
    body: "Meetings, conferences, trainings and exhibitions, in surroundings that keep everyone fresh to the last session.",
    points: ["Banquet hall with the set-up you need", "Ample parking", "Skilled chefs and caterers", "Comfortable rooms for guests", "Outdoor activities for the team"],
  },
  {
    title: "Birthdays",
    body: "A picturesque place and a day of games, for a birthday everyone remembers.",
    points: ["Catering of your choice", "Photography and video in the grounds", "Comfortable rooms for guests", "Games and activities"],
  },
  {
    title: "Family occasions",
    body: "Baby showers, thread ceremonies and other family functions, small or large, in the banquet hall.",
    points: ["Catering of your choice", "Photography and video in the grounds", "Comfortable rooms for guests", "Games and activities"],
  },
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Capitalises the first letter, for list items stored in sentence case. */
export const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Joins items into one sentence-case line: "Venna Lake, Mapro Garden and Table Land". */
export const listLine = (items: string[]) =>
  cap(items.length > 1 ? `${items.slice(0, -1).join(", ")} and ${items.at(-1)}` : items[0] ?? "");

export const formatRupees = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;

/** Decimal degrees as degrees, minutes and seconds: 17°54′17″. */
export function dms(value: number) {
  const deg = Math.floor(value);
  const minFloat = (value - deg) * 60;
  const min = Math.floor(minFloat);
  const sec = Math.round((minFloat - min) * 60);
  return `${deg}°${String(min).padStart(2, "0")}′${String(sec).padStart(2, "0")}″`;
}
