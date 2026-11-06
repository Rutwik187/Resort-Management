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
};

export const properties: Property[] = [
  {
    code: "KS",
    name: "Prathamesh Resorts",
    shortName: "Khed Shivapur",
    place: "Khed Shivapur, Pune",
    url: "https://prathameshresorts.com",
    pitch: "Riverside glass houses, a private-pool villa and more than 80 activities",
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
    staySections: [
      { id: "cottages", title: "Cottages", line: "Priced per couple, a night. Add a guest, a child or a second cottage as you need." },
      { id: "packages", title: "Packages with meals", line: "Every meal included, at one rate for every night." },
    ],
  },
];

export const propertyByCode = (code: PropertyCode) => properties.find((property) => property.code === code)!;

/** The group's other resorts, for a site's "Our resorts" menu and footer. */
export const otherProperties = (code: PropertyCode) => properties.filter((property) => property.code !== code);
