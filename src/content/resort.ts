import type { PhotoKey } from "./photos";

/*
 * Every fact on this page comes from the current prathameshresorts.com.
 * Change prices and phone numbers here, and the whole site follows.
 */

export const contact = {
  bookingPhone: { display: "+91 90495 38888", href: "tel:+919049538888" },
  whatsapp: { display: "+91 77219 65656", number: "917721965656" },
  weddingPhone: { display: "+91 92255 85952", href: "tel:+919225585952", number: "919225585952" },
  email: "info@prathameshresorts.com",
  weddingEmail: "wedding@prathameshresorts.com",
  addressLines: ["At Post Salawade, near Khed Shivapur Toll", "Taluka Bhor, District Pune", "Maharashtra 412205"],
  mapsUrl: "https://maps.app.goo.gl/7AtDb3gf7WbEx82j6",
  reviewsUrl: "https://www.google.com/travel/hotels/entity/CgsI_YXpwaa9rZjKARAB/overview",
  geo: { lat: 18.45735, lng: 73.80356 },
  social: [
    { label: "Instagram", href: "https://www.instagram.com/prathamesh_resorts/" },
    { label: "Facebook", href: "https://www.facebook.com/prathameshresorts" },
    { label: "YouTube", href: "https://www.youtube.com/@PrathameshResorts" },
  ],
  checkIn: "1:00 pm",
  checkOut: "10:00 am",
} as const;

export const sisterResorts = [
  { name: "Prathamesh Go Crazy Resort", place: "Ghera Sinhagad, Pune", href: "https://gocrazyadventure.com" },
  { name: "Prathamesh Valley Resorts", place: "Bhilar, Mahabaleshwar", href: "https://prathameshvalleyresorts.com" },
  { name: "Sinhgad Bliss", place: "Ghera Sinhgad, Pune", href: "https://sinhagadbliss.com" },
] as const;

export const nav = [
  { label: "Stays", href: "/stays" },
  { label: "Experiences", href: "/experiences" },
  { label: "Celebrations", href: "/celebrations" },
] as const;

/* ------------------------------------------------------------------ */
/* Stays                                                               */
/* ------------------------------------------------------------------ */

export type RatePlan = {
  /** "per couple" or "per person" as the base price unit */
  basis: "per couple" | "per person";
  base: number;
  extraPerson?: number;
  child5to11: number;
  child3to5: number;
};

export type Stay = {
  slug: string;
  name: string;
  line: string;
  description: string;
  rooms: string;
  guests: string;
  photos: PhotoKey[];
  /** Photo for cards, when it should differ from the first gallery photo. */
  cover?: PhotoKey;
  features: string[];
  weekday?: RatePlan;
  weekend?: RatePlan;
  /** Some stays have one rate for every day of the week. */
  everyDay?: RatePlan;
};

const standardFeatures = ["Air conditioning", "Attached bathroom", "Balcony", "Flat-screen TV", "Mineral water", "Pure-veg meals included"];

export const stays: Stay[] = [
  {
    slug: "riverside-glass-house",
    name: "Riverside Glass House",
    line: "A bath on the balcony, with the river trees for walls.",
    description:
      "Our newest rooms. Each one opens onto a private balcony with a jacuzzi, two chairs and nothing but green beyond the railing. Inside, white linen, soft light and room for four.",
    rooms: "6 rooms",
    guests: "4 to 5 guests",
    photos: ["glassBalcony", "glassTwin", "glassDetail", "glassJacuzzi", "glassRoom", "glassTub"],
    cover: "glassJacuzzi",
    features: ["Balcony jacuzzi", ...standardFeatures],
    weekday: { basis: "per couple", base: 5000, extraPerson: 1500, child5to11: 800, child3to5: 0 },
    weekend: { basis: "per couple", base: 8000, extraPerson: 2000, child5to11: 1500, child3to5: 800 },
  },
  {
    slug: "bungalow-private-pool",
    name: "Bungalow with Private Pool",
    line: "A three-bedroom villa with its own pool, for the whole family.",
    description:
      "The resort inside the resort. A 3 BHK villa with a private swimming pool, a garden gazebo, a large lounge and its own veg and non-veg kitchens and dining. Built for weddings, reunions and large family weekends.",
    rooms: "One 3 BHK villa",
    guests: "20 to 30 guests",
    photos: ["bungalowPool", "bungalowExterior", "bungalowLounge", "bungalowRoom"],
    features: ["Private swimming pool", "Separate veg kitchen and dining", "Separate non-veg kitchen and dining", ...standardFeatures],
    weekday: { basis: "per person", base: 2000, child5to11: 1000, child3to5: 0 },
    weekend: { basis: "per person", base: 3500, child5to11: 1500, child3to5: 800 },
  },
  {
    slug: "river-view-tent",
    name: "River View Tent",
    line: "Canvas, a carved wooden door, and the sound of the river at night.",
    description:
      "Glamping without giving anything up. Air-conditioned tents along a shaded garden path, each with a proper bed, a private bathroom and a view toward the river.",
    rooms: "3 tents",
    guests: "4 guests",
    photos: ["tentFront", "tentRow", "tentRoom"],
    features: ["Separate veg kitchen and dining", "Separate non-veg kitchen and dining", ...standardFeatures],
    everyDay: { basis: "per couple", base: 8250, extraPerson: 2000, child5to11: 1500, child3to5: 800 },
  },
  {
    slug: "garden-view-chira-cottages",
    name: "Garden View Chira Cottages",
    line: "Laterite stone cottages on a lawn under old trees.",
    description:
      "Built from chira, the red laterite stone of the Sahyadri and the Konkan. The cottages sit around a wide lawn, shaded by old trees.",
    rooms: "12 cottages",
    guests: "2 to 4 guests",
    photos: ["chiraLawn", "chiraExterior", "chiraRoom", "chiraForest"],
    features: standardFeatures,
    weekday: { basis: "per couple", base: 5000, extraPerson: 1500, child5to11: 800, child3to5: 0 },
    weekend: { basis: "per couple", base: 8000, extraPerson: 2000, child5to11: 1500, child3to5: 800 },
  },
  {
    slug: "wooden-cottage",
    name: "Wooden Cottage",
    line: "Pine-panelled rooms a few steps from the water.",
    description:
      "Warm timber inside and out, set beside the pool. A simple, honest room for couples and small families who plan to spend the day outdoors.",
    rooms: "4 cottages",
    guests: "2 to 4 guests",
    photos: ["woodenPool", "woodenRoom", "woodenInterior"],
    features: standardFeatures,
    weekday: { basis: "per couple", base: 4000, extraPerson: 1500, child5to11: 800, child3to5: 0 },
    weekend: { basis: "per couple", base: 7000, extraPerson: 2000, child5to11: 1500, child3to5: 800 },
  },
  {
    slug: "poolside-wooden-house",
    name: "Poolside Wooden House",
    line: "A raised wooden house in the shade of the trees.",
    description: "Two wooden rooms raised above the garden, with a picket-fenced veranda and the pool close by.",
    rooms: "2 rooms",
    guests: "4 to 6 guests",
    photos: ["pwhExterior", "pwhRoom", "pwhCanopy"],
    features: standardFeatures,
    weekday: { basis: "per couple", base: 4000, extraPerson: 1500, child5to11: 800, child3to5: 0 },
    weekend: { basis: "per couple", base: 7000, extraPerson: 2000, child5to11: 1500, child3to5: 800 },
  },
  {
    slug: "cozy-cottage",
    name: "Cozy Cottage",
    line: "Room for the whole family, under one roof.",
    description: "Generous cottages sized for families of four to six, with space to spread out after a long day of activities.",
    rooms: "5 cottages",
    guests: "4 to 6 guests",
    photos: ["cozyRoom", "cozyExterior"],
    features: standardFeatures,
    weekday: { basis: "per couple", base: 5000, extraPerson: 1500, child5to11: 800, child3to5: 0 },
    weekend: { basis: "per couple", base: 8000, extraPerson: 2000, child5to11: 1500, child3to5: 800 },
  },
  {
    slug: "standard-room",
    name: "Standard Room",
    line: "Clean, bright and close to everything.",
    description: "Comfortable rooms with wooden furniture and a garden-facing veranda. The easy choice for a short weekend.",
    rooms: "6 rooms",
    guests: "3 to 4 guests",
    photos: ["standardExterior", "standardRoom", "standardRoom2"],
    features: standardFeatures,
    weekday: { basis: "per couple", base: 4000, extraPerson: 1500, child5to11: 800, child3to5: 0 },
    weekend: { basis: "per couple", base: 7000, extraPerson: 2000, child5to11: 1500, child3to5: 800 },
  },
  {
    slug: "wooden-house-501",
    name: "Wooden House 501",
    line: "Timber rooms for groups of friends.",
    description: "Wood-panelled rooms that sleep up to seven, priced per person so groups can split it simply.",
    rooms: "6 rooms",
    guests: "3 to 7 guests",
    photos: ["wh501Room", "wh501Room2", "wh501Room3"],
    features: standardFeatures,
    weekday: { basis: "per person", base: 1500, extraPerson: 1500, child5to11: 800, child3to5: 0 },
    weekend: { basis: "per person", base: 3000, extraPerson: 2000, child5to11: 1500, child3to5: 800 },
  },
  {
    slug: "poolside-big-cottage",
    name: "Poolside Big Cottage",
    line: "Two large rooms for a team, a class or a big family.",
    description: "Two spacious air-conditioned rooms with two washrooms, beside the pool. Made for groups of 14 to 16.",
    rooms: "1 cottage, 2 rooms",
    guests: "14 to 16 guests",
    photos: ["bigcottageRoom", "bigcottageRoom2"],
    features: ["2 washrooms", ...standardFeatures],
    weekday: { basis: "per person", base: 1500, extraPerson: 1500, child5to11: 800, child3to5: 0 },
    weekend: { basis: "per person", base: 3000, extraPerson: 2000, child5to11: 1500, child3to5: 800 },
  },
];

export const featuredStaySlugs = [
  "riverside-glass-house",
  "bungalow-private-pool",
  "river-view-tent",
  "garden-view-chira-cottages",
  "wooden-cottage",
  "poolside-wooden-house",
] as const;

/* ------------------------------------------------------------------ */
/* Day packages                                                        */
/* ------------------------------------------------------------------ */

export type DayPackage = {
  name: string;
  /** 24-hour decimal times, used to draw the timeline */
  start: number;
  end: number;
  hours: string;
  kitchen: string;
  meals: string;
  adult: number;
  child5to11: number;
  child3to5: number;
};

export const dayPackages: DayPackage[] = [
  { name: "Morning", start: 9, end: 18, hours: "9:00 am to 6:00 pm", kitchen: "Pure veg", meals: "Breakfast, lunch and hi-tea", adult: 1500, child5to11: 1000, child3to5: 500 },
  { name: "Afternoon", start: 11, end: 18, hours: "11:00 am to 6:00 pm", kitchen: "Pure veg", meals: "Lunch and hi-tea", adult: 1300, child5to11: 900, child3to5: 400 },
  { name: "Evening", start: 15.5, end: 21.5, hours: "3:30 pm to 9:30 pm", kitchen: "Veg and non-veg", meals: "Hi-tea and dinner", adult: 1300, child5to11: 900, child3to5: 400 },
  { name: "Full day", start: 9.5, end: 21.5, hours: "9:30 am to 9:30 pm", kitchen: "Veg and non-veg", meals: "Breakfast, lunch, hi-tea and dinner", adult: 2000, child5to11: 1300, child3to5: 800 },
];

/* ------------------------------------------------------------------ */
/* Experiences                                                         */
/* ------------------------------------------------------------------ */

export type ExperienceGroup = {
  id: string;
  title: string;
  items: string[];
  cover: PhotoKey;
  gallery: PhotoKey[];
};

export const experienceGroups: ExperienceGroup[] = [
  {
    id: "water",
    title: "In the water",
    items: ["swimming pool", "pool with a waterfall", "rain dance"],
    cover: "poolWaterfall",
    gallery: ["poolWaterfall", "poolPalms", "rainDance", "poolFalls", "poolMushroom", "poolSlides"],
  },
  {
    id: "heights",
    title: "Up in the trees",
    items: ["zip line", "ropeway", "Burma bridge", "high ropes course"],
    cover: "ropesSky",
    gallery: ["ropesSky", "zipForest", "burmaBridge", "ropeway", "zipline", "ropesCourse", "netClimb", "ropeWalk", "swing", "ropeTunnel"],
  },
  {
    id: "ground",
    title: "On firm ground",
    items: ["archery", "aim shooting", "rock climbing and rappelling", "wall climbing"],
    cover: "archery",
    gallery: ["archery", "skyWall", "climbWall", "atv", "tandem"],
  },
  {
    id: "indoors",
    title: "Indoors",
    items: ["carrom", "chess", "pool table", "table tennis"],
    cover: "chess",
    gallery: ["chess", "carrom", "billiards"],
  },
  {
    id: "children",
    title: "For the children",
    items: ["a play area of their own", "outdoor games", "nature trails"],
    cover: "kidsPlay",
    gallery: ["kidsPlay"],
  },
];

/* ------------------------------------------------------------------ */
/* Celebrations                                                        */
/* ------------------------------------------------------------------ */

export const weddingMoments = [
  {
    title: "Pre-wedding shoot",
    body: "Nature and flower backdrops across the resort, from the Burma bridge in the trees to the lawns, with food included in the package. Ample rooms are available for the crew.",
    photo: "burmaBridge" as PhotoKey,
  },
  {
    title: "Haldi and mehendi",
    body: "Sunflower stages on the lawn in front of the cottages, with both families together in one place for the whole weekend.",
    photo: "weddingHaldi" as PhotoKey,
  },
  {
    title: "The ceremony",
    body: "Plan the day your way, with ample space for every guest, comfortable rooms for family, and reputed chefs and caterers for a multi-cuisine menu.",
    photo: "weddingMandap" as PhotoKey,
  },
  {
    title: "The reception",
    body: "An on-site manager, theme décor and floral arrangements, professional catering and air-conditioned rooms for the guests who stay on.",
    photo: "weddingReception" as PhotoKey,
  },
];

export const eventTypes = [
  {
    title: "Corporate offsites",
    body: "Seminars, meetings, conferences, exhibitions and training days.",
    points: ["AC banquet hall with technical setup", "Ample parking", "In-house catering by skilled chefs", "Outdoor activities for team building"],
  },
  {
    title: "Birthdays",
    body: "A dedicated space with fun activities and catering made to order.",
    points: ["Customised catering", "Photography and video coverage", "Game zones and entertainment", "AC rooms"],
  },
  {
    title: "Family ceremonies",
    body: "Baby showers, thread ceremonies and naming ceremonies.",
    points: ["Elegant décor and venue setup", "Premium catering", "Kid-friendly games", "Comfortable rooms"],
  },
  {
    title: "Reunions",
    body: "Family reunions, college and alumni meets, and weekends with friends.",
    points: ["Indoor and outdoor seating", "Buffet options", "Live music or DJ on request", "Bonfire nights and camping add-ons"],
  },
];

/** Capitalises the first letter, for list items stored in sentence case. */
export const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Joins items into one sentence-case line: "Zip line, ropeway and Burma bridge". */
export const listLine = (items: string[]) =>
  cap(items.length > 1 ? `${items.slice(0, -1).join(", ")} and ${items.at(-1)}` : items[0] ?? "");

export const formatRupees = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;
