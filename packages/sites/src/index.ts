/**
 * The Prathamesh Group's four resorts. Each is its own company with its own
 * website. Every site lists the others from here, so a name, place or
 * address changes once for all four.
 */

export type PropertyCode = "KS" | "GC" | "SB" | "PV";

/** A section of a website's Stays page. Each room type is listed under one (its `web_group` in the database). */
export type StaySection = { id: string; title: string; line?: string };

export type Property = {
  code: PropertyCode;
  name: string;
  /** The short name for tight spaces, such as a menu. */
  shortName: string;
  place: string;
  url: string;
  /** What the resort is known for, in its own site's words. */
  pitch: string;
  /** The sections of its Stays page, in order. The admin offers these when it places a room type. */
  staySections: StaySection[];
  /** Whether its site has a Day packages page, which lists the admin's day packages. */
  dayPackagesPage: boolean;
};

export const properties: Property[] = [
  {
    code: "KS",
    name: "Prathamesh Resorts",
    shortName: "Khed Shivapur",
    place: "Khed Shivapur, Pune",
    url: "https://prathameshresorts.com",
    pitch: "Riverside glass houses, a private-pool villa and more than 80 activities",
    dayPackagesPage: true,
    staySections: [
      { id: "rooms", title: "Rooms, cottages and tents", line: "Priced per couple, a night. Add a guest, a child or a second room as you need." },
      { id: "groups", title: "For families and groups", line: "Priced per person, a night, for larger parties." },
    ],
  },
  {
    code: "GC",
    name: "Prathamesh Go Crazy Resort",
    shortName: "Go Crazy",
    place: "Ghera Sinhagad, Pune",
    url: "https://www.gocrazyadventure.com",
    pitch: "An adventure park with more than 70 activities, day passes and cottages",
    dayPackagesPage: true,
    staySections: [
      { id: "cottages", title: "Cottages", line: "Priced per couple, a night. Add a guest, a child or a second cottage as you need." },
      { id: "villas", title: "Villas for groups", line: "Priced per person, a night, for the whole party." },
    ],
  },
  {
    code: "SB",
    name: "Sinhagad Bliss",
    shortName: "Sinhagad Bliss",
    place: "Ghera Sinhagad, Pune",
    url: "https://sinhagadbliss.com",
    pitch: "Mountain-view cottages, and villas with private pools",
    dayPackagesPage: false,
    staySections: [
      { id: "rooms", title: "Rooms", line: "Priced per couple, a night. Add a guest, a child or a second room as you need." },
      { id: "villas", title: "Villas", line: "More room for families, some with a pool of their own. The team quotes each stay." },
      { id: "groups", title: "Groups", line: "Priced per person, for four or more." },
    ],
  },
  {
    code: "PV",
    name: "Prathamesh Valley Resorts",
    shortName: "Valley Resorts",
    place: "Bhilar, Mahabaleshwar",
    url: "https://www.prathameshvalleyresorts.com",
    pitch: "Red laterite cottages in the hills of Mahabaleshwar",
    dayPackagesPage: false,
    staySections: [
      { id: "cottages", title: "Cottages", line: "Priced per couple, a night. Add a guest, a child or a second cottage as you need." },
      { id: "packages", title: "Packages with meals", line: "Every meal included, at one rate for every night." },
    ],
  },
];

export const propertyByCode = (code: PropertyCode) => properties.find((property) => property.code === code)!;

/** The group's other resorts, for a site's "Our resorts" menu and footer. */
export const otherProperties = (code: PropertyCode) => properties.filter((property) => property.code !== code);

/**
 * Page text staff may change in the admin (plan section 2), with each
 * site's own words as the default. The layout stays in code, so each site
 * keeps its design; a slot with nothing published shows the default.
 */
export type TextSlot = { key: string; page: string; label: string; max: number; defaults: Record<PropertyCode, string> };

export const textSlots: TextSlot[] = [
  {
    key: "home.heroLine",
    page: "Home page",
    label: "The line under the big heading",
    max: 220,
    defaults: {
      KS: "A green valley resort at the foot of the Sahyadri, near Khed Shivapur, just south of Pune.",
      GC: "An adventure park and resort at the foot of Sinhagad fort, with more than 70 activities, four day passes and cottages for the night.",
      SB: "A mountain view resort in the foothills of Sinhagad, Pune. Cottages, villas with private pools, and the hills in view.",
      PV: "Cottages of red laterite stone among the fields of Bhilar, between Panchgani and Mahabaleshwar.",
    },
  },
  {
    key: "stays.lead",
    page: "Rooms page",
    label: "The opening line under the page's heading",
    max: 300,
    defaults: {
      KS: "Ways to stay, from glass houses on stilts to a private-pool villa. Add as many rooms as your group needs, of any kind.",
      GC: "Laterite stone cottages under the palms, painted cottages, cottages for couples and villas for groups. Every stay includes the activities and the games.",
      SB: "Rooms that face the hills or open onto a pool, villas for more space, and a package for groups. Add as many rooms as your group needs, of any kind.",
      PV: "Every cottage is built in lal chira, the red laterite stone of the Konkan. Or choose a package with every meal included.",
    },
  },
];

/** The gallery's usual categories; staff can add others. */
export const galleryCategories = ["Rooms", "Cottages", "Pool", "Weddings", "Food", "Adventure", "Events", "Nature", "Night views"];
