import type { PhotoKey } from "./photos";

/*
 * Every fact here comes from the current sinhagadbliss.com, as published in
 * November 2026. Change prices, rooms and phone numbers here, and the whole
 * site follows.
 */

const mapsQuery = encodeURIComponent("Sinhagad Bliss Resort, Gat No: 121, near Swaraj Hotel Haveli, Ghera Sinhagad, Maharashtra 411025");

export const contact = {
  phone: { display: "+91 99702 45656", href: "tel:+919970245656" },
  // The WhatsApp button on the current site goes to this number.
  whatsapp: { display: "+91 86053 91111", number: "918605391111" },
  weddingPhone: { display: "+91 93255 16060", href: "tel:+919325516060", number: "919325516060" },
  email: "info@sinhagadbliss.com",
  weddingEmail: "wedding@sinhagadbliss.com",
  addressLines: ["Gat No. 121, near Swaraj Hotel Haveli", "At Post Donje, Ghera Sinhagad", "Pune, Maharashtra 411025"],
  mapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${mapsQuery}`,
  social: [
    { label: "Instagram", href: "https://www.instagram.com/sinhagad_bliss/" },
    { label: "Facebook", href: "https://www.facebook.com/Sinhagadbliss/" },
  ],
  checkIn: "1:00 pm",
  checkOut: "10:00 am",
} as const;

export const sisterResorts = [
  { name: "Prathamesh Resorts", place: "Khed Shivapur, Pune", href: "https://prathameshresorts.com" },
  { name: "Prathamesh Go Crazy Resort", place: "Ghera Sinhagad, Pune", href: "https://gocrazyadventure.com" },
  { name: "Prathamesh Valley Resorts", place: "Bhilar, Mahabaleshwar", href: "https://prathameshvalleyresorts.com" },
] as const;

export const nav = [
  { label: "Stays", href: "/stays" },
  { label: "Dining", href: "/#dining" },
  { label: "Celebrations", href: "/celebrations" },
  { label: "Find us", href: "/#find-us" },
] as const;

/* ------------------------------------------------------------------ */
/* Rooms                                                               */
/* ------------------------------------------------------------------ */

/**
 * The rooms come in four kinds, by two choices: a mountain view or not,
 * a pool or not. `rate` names the couple package of the same name, where
 * the site publishes one.
 */
export type RoomKind = {
  id: string;
  name: string;
  view: boolean;
  pool: boolean;
  rooms: number;
  rate?: PackageId;
};

export const roomKinds: RoomKind[] = [
  { id: "view-pool", name: "Mountain view, with pool", view: true, pool: true, rooms: 7, rate: "mountain-view-pool" },
  { id: "view", name: "Mountain view, without pool", view: true, pool: false, rooms: 3, rate: "mountain-view" },
  { id: "pool", name: "No mountain view, with pool", view: false, pool: true, rooms: 6 },
  { id: "plain", name: "No pool, no mountain view", view: false, pool: false, rooms: 7 },
];

export const backRooms = { name: "Non-AC rooms at the back", rooms: 2 };

export const totalRooms = roomKinds.reduce((sum, kind) => sum + kind.rooms, 0) + backRooms.rooms;

/* ------------------------------------------------------------------ */
/* Packages and rates                                                  */
/* ------------------------------------------------------------------ */

export type RatePlan = {
  /** Per couple, plus GST */
  couple: number;
  /** Each extra guest over 11, plus GST */
  extraGuest: number;
  child5to11: number;
  child3to5: number;
};

export type PackageId = "mountain-view-pool" | "mountain-view-jacuzzi" | "mountain-view" | "without-pool";

export type CouplePackage = {
  id: PackageId;
  name: string;
  /** Monday to Thursday, CP: the room with breakfast */
  weekday: RatePlan;
  /** Friday and Saturday, MAP: breakfast and one main meal */
  weekend: RatePlan;
};

const higher = {
  weekday: { couple: 4500, extraGuest: 2000, child5to11: 1000, child3to5: 0 },
  weekend: { couple: 8000, extraGuest: 2000, child5to11: 1500, child3to5: 800 },
};
const lower = {
  weekday: { couple: 4000, extraGuest: 2000, child5to11: 1000, child3to5: 0 },
  weekend: { couple: 7000, extraGuest: 2000, child5to11: 1500, child3to5: 800 },
};

export const couplePackages: CouplePackage[] = [
  { id: "mountain-view-pool", name: "Mountain view with pool", ...higher },
  { id: "mountain-view-jacuzzi", name: "Mountain view with jacuzzi", ...higher },
  { id: "mountain-view", name: "Mountain view without pool", ...lower },
  { id: "without-pool", name: "Without pool", ...lower },
];

export const coupleGuests = "2 to 4 guests";

export const groupPackage = {
  name: "Group package",
  perPerson: 2999,
  minimum: 4,
  child5to11: 1500,
  child3to5: 800,
};

export const packageIncludes = [
  "Every activity and amenity",
  "15+ indoor games",
  "Television and hot water",
  "Veg and non-veg meals, from separate kitchens",
];

/* ------------------------------------------------------------------ */
/* Villas                                                              */
/* ------------------------------------------------------------------ */

/** The site lists the villas without rates, so the team quotes them. */
export const villas = [
  { name: "1 BHK villa", detail: "One bedroom" },
  { name: "1 BHK villa with private pool", detail: "One bedroom, and a pool of its own" },
  { name: "2 BHK villa with private pool", detail: "Two bedrooms, and a pool of its own" },
] as const;

/* ------------------------------------------------------------------ */
/* Offers                                                              */
/* ------------------------------------------------------------------ */

/** The offers on the current site. Set `showOffers` to false to take them all down. */
export const showOffers = true;

export const offers = [
  { id: "honeymoon", percent: 25, label: "For honeymooners", line: "Off your honeymoon stay" },
  { id: "family", percent: 10, label: "For families", line: "Off a family stay" },
  { id: "group", percent: 35, label: "For groups", line: "Off a group stay" },
] as const;

/* ------------------------------------------------------------------ */
/* Around the resort                                                   */
/* ------------------------------------------------------------------ */

export const amenities: { title: string; body: string; photo: PhotoKey }[] = [
  {
    title: "Swimming pool",
    body: "A pool with loungers along a painted wall, and the hills beyond it.",
    photo: "poolMain",
  },
  {
    title: "Play areas",
    body: "Swings and slides outdoors for children, and an indoor play area for rainy days.",
    photo: "playArea",
  },
  {
    title: "Sports",
    body: "Badminton, cricket in the nets, and a space set aside for archery.",
    photo: "cricketNets",
  },
  {
    title: "Indoor games",
    body: "More than fifteen, from table tennis and foosball to carrom and chess.",
    photo: "games",
  },
];

/* ------------------------------------------------------------------ */
/* Celebrations                                                        */
/* ------------------------------------------------------------------ */

export const weddingMoments: { title: string; body: string; points: string[]; photo: PhotoKey; alt: string }[] = [
  {
    title: "The wedding",
    body: "Say “I do” on the lawn, with the Sahyadri behind you, or in the banquet hall. Our team plans it with you: the décor, the catering and the rooms.",
    points: ["Professional catering and menu options", "Ample seating for guests", "Theme décor and floral arrangements", "Rooms for guests"],
    photo: "mandap",
    alt: "A mandap in the banquet hall, hung with strings of red and white flowers between brass lamps",
  },
  {
    title: "Mehendi and haldi",
    body: "Colourful mornings for the rituals before the wedding, set up by the pool or on the lawn.",
    points: ["Ideal for a professional photoshoot", "Food included in the package", "A package made to order", "Ample rooms"],
    photo: "haldiCouple",
    alt: "A bride and groom seated at their haldi, on a stage of marigolds set over the pool",
  },
  {
    title: "The reception",
    body: "Indoors in the banquet hall or outdoors on the lawn, with the mountains around you.",
    points: ["Professional catering and menu options", "Ample seating for guests", "Theme décor and floral arrangements", "Rooms for guests"],
    photo: "stageLawn",
    alt: "A reception stage on the lawn, framed in pink and white flowers, with trees behind",
  },
];

export const eventTypes = [
  {
    title: "Corporate events",
    body: "Offsites, meetings and training days in the quiet of the hills.",
    points: ["AC banquet hall with the setup you need", "Ample parking", "Skilled chefs and caterers", "AC rooms for guests", "Outdoor activities for team building"],
  },
  {
    title: "Birthdays",
    body: "A birthday with games for everyone and a view for the photographs.",
    points: ["Catering to your choice", "Photography and video shoots", "AC rooms for guests", "Games and activities"],
  },
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export const formatRupees = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;

/** Free for a zero rate, as the site writes "No charge". */
export const rateOrFree = (amount: number) => (amount === 0 ? "Free" : formatRupees(amount));

export const packageById = (id: PackageId) => couplePackages.find((p) => p.id === id)!;
