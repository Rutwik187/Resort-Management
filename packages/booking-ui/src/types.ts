import type { StaticImageData } from "next/image";

/** One night's rate for one room or package, in rupees, before GST. */
export type Rate = {
  /** What `base` pays for: two adults ("couple") or one adult ("person"). */
  basis: "couple" | "person";
  base: number;
  /** Each guest aged 12 or more beyond the two that a couple rate covers. */
  extraAdult?: number;
  /** Each child aged 5 to 11. */
  child5to11?: number;
  /** Each child aged 3 to 5. Zero means free. */
  child3to5?: number;
  /** What the rate includes, for example "Breakfast". */
  meals?: string;
};

export type Photo = { src: StaticImageData; alt: string };

/** A room type, villa or package that a guest can add to a stay. */
export type Listing = {
  /** Unique on the page. It is also the card's anchor, so /stays#glass-house lands on the card. */
  id: string;
  name: string;
  /** What one booking of it is called: "room", "tent", "villa" or "package". */
  noun: string;
  /** One line under the name. */
  line: string;
  photos: Photo[];
  /** Short facts under the name, such as "6 rooms" or "Balcony jacuzzi". */
  facts: string[];
  /** A longer description and the full list of features, behind "Details". */
  details?: string;
  features?: string[];
  /** The fewest paying guests it takes, for group packages and large villas. */
  minGuests?: number;
  /** The most guests in one booking of it, children included. Leave it out when the resort doesn't publish one. */
  maxGuests?: number;
  /** How many of it exist. Guests cannot add more than this. */
  units?: number;
  /** Sunday to Thursday nights. */
  weekday?: Rate;
  /** Friday and Saturday nights. */
  weekend?: Rate;
  /** One rate for every night of the week. */
  everyNight?: Rate;
  /** Set when no rate is published. The text says what happens, for example "Rates on request". */
  onRequest?: string;
};

/** A heading with the listings under it, such as "Rooms" and "Packages". */
export type ListingGroup = { id: string; title: string; line?: string; listings: Listing[] };

/** Who stays in one room, or who comes on one kind of day pass. */
export type Party = { adults: number; children5to11: number; children3to5: number; under3: number };

/** What the guest searched for. Dates are yyyy-mm-dd, and empty until chosen. */
export type StaySearch = { checkIn: string; checkOut: string; rooms: number; adults: number; children: number };

/** One room, villa or package in the guest's selection. */
export type Picked = { key: string; listingId: string; party: Party };

/** A day pass. Prices are per person, before GST. */
export type Pass = {
  id: string;
  name: string;
  hours: string;
  meals: string;
  adult: number;
  child5to11: number;
  child3to5: number;
  /** A photo for the card, if the site has one. */
  photo?: Photo;
};

/** Where requests go, and the name they are addressed to. */
export type Desk = {
  resortName: string;
  whatsapp: { number: string; display: string };
  phone?: { href: string; display: string };
};
