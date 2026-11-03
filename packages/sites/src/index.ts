/**
 * The Prathamesh Group's four resorts. Each is its own company with its own
 * website. Every site lists the others from here, so a name, place or
 * address changes once for all four.
 */

export type PropertyCode = "KS" | "GC" | "SB" | "PV";

export type Property = {
  code: PropertyCode;
  name: string;
  /** The short name for tight spaces, such as a menu. */
  shortName: string;
  place: string;
  url: string;
  /** What the resort is known for, in its own site's words. */
  pitch: string;
};

export const properties: Property[] = [
  {
    code: "KS",
    name: "Prathamesh Resorts",
    shortName: "Khed Shivapur",
    place: "Khed Shivapur, Pune",
    url: "https://prathameshresorts.com",
    pitch: "Riverside glass houses, a private-pool villa and more than 80 activities",
  },
  {
    code: "GC",
    name: "Prathamesh Go Crazy Resort",
    shortName: "Go Crazy",
    place: "Ghera Sinhagad, Pune",
    url: "https://gocrazyadventure.com",
    pitch: "An adventure park with more than 70 activities, day passes and cottages",
  },
  {
    code: "SB",
    name: "Sinhagad Bliss",
    shortName: "Sinhagad Bliss",
    place: "Ghera Sinhagad, Pune",
    url: "https://sinhagadbliss.com",
    pitch: "Mountain-view cottages, and villas with private pools",
  },
  {
    code: "PV",
    name: "Prathamesh Valley Resorts",
    shortName: "Valley Resorts",
    place: "Bhilar, Mahabaleshwar",
    url: "https://prathameshvalleyresorts.com",
    pitch: "Red laterite cottages in the hills of Mahabaleshwar",
  },
];

export const propertyByCode = (code: PropertyCode) => properties.find((property) => property.code === code)!;

/** The group's other resorts, for a site's "Our resorts" menu and footer. */
export const otherProperties = (code: PropertyCode) => properties.filter((property) => property.code !== code);
