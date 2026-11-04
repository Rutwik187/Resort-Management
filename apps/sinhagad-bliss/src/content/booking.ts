import type { Desk, Listing, ListingGroup, Rate } from "@repo/booking-ui";
import { photos, type PhotoKey } from "./photos";
import { backRooms, contact, couplePackages, groupPackage, packageIncludes, roomKinds, type CouplePackage, type PackageId, type RatePlan } from "./resort";

/*
 * The rooms, villas and packages in resort.ts, in the shape the shared
 * booking widget reads. The site publishes rates by package, and room
 * counts by view and pool. A count appears here only where the site ties a
 * package to a kind of room; nothing is guessed.
 */

export const desk: Desk = {
  resortName: "Sinhagad Bliss",
  whatsapp: contact.whatsapp,
  phone: contact.phone,
};

const coupleRate = (plan: RatePlan, meals: string): Rate => ({
  basis: "couple",
  base: plan.couple,
  extraAdult: plan.extraGuest,
  child5to11: plan.child5to11,
  child3to5: plan.child3to5,
  meals,
});

const shots = (name: string, list: [PhotoKey, string][]) =>
  list.map(([key, alt]) => ({ src: photos[key], alt: alt || name }));

/** How many rooms of each package's kind the site lists. */
const roomsFor = (id: PackageId) => roomKinds.find((kind) => kind.rate === id)?.rooms;

const roomPhotos: Record<PackageId, [PhotoKey, string][]> = {
  "mountain-view-pool": [
    ["poolPergola", "A private plunge pool under a pergola, beside a painted wall of trees"],
    ["balconyHills", "A balcony table set for tea, with green hills beyond the railing"],
    ["roomBed", "A double bed with towels folded into swans, under a warm cove light"],
  ],
  "mountain-view-jacuzzi": [
    ["balconyBook", "A book and a cup on a balcony table, the hills behind in mist"],
    ["bathPetals", "A jacuzzi bath scattered with rose petals, under a window onto the trees"],
    ["roomMarble", "A bright room with a marble floor and a double bed"],
  ],
  "mountain-view": [
    ["verandaView", "A cottage veranda looking across the lawn to the other cottages and the hills"],
    ["cottageMarch", "A cottage on the lawn, with the bare Sinhagad hills behind it"],
    ["roomGarden", "A room whose glass doors open onto a garden"],
  ],
  "without-pool": [
    ["veranda", "Two chairs on a cottage veranda beside a panelled wall"],
    ["roomMarble", "A bright room with a marble floor, a double bed and a window onto the trees"],
    ["cottageHills", "A cottage on a green lawn, with the wooded hills behind it"],
  ],
};

const names: Record<PackageId, string> = {
  "mountain-view-pool": "Mountain view room with pool",
  "mountain-view-jacuzzi": "Mountain view room with jacuzzi",
  "mountain-view": "Mountain view room without pool",
  "without-pool": "Room without pool",
};

const lines: Record<PackageId, string> = {
  "mountain-view-pool": "A room facing the hills, with a pool.",
  "mountain-view-jacuzzi": "A room facing the hills, with a jacuzzi.",
  "mountain-view": "A room facing the hills.",
  "without-pool": "A comfortable room without a pool.",
};

function room(pack: CouplePackage): Listing {
  const rooms = roomsFor(pack.id);
  return {
    id: pack.id,
    name: names[pack.id],
    noun: "room",
    line: lines[pack.id],
    photos: shots(pack.name, roomPhotos[pack.id]),
    facts: [...(rooms ? [`${rooms} rooms`] : []), "2 to 4 guests"],
    details: "Every package includes the activities and amenities and more than fifteen indoor games, with television and hot water in the room.",
    features: packageIncludes,
    maxGuests: 4,
    units: rooms,
    weekday: coupleRate(pack.weekday, "Room with breakfast"),
    weekend: coupleRate(pack.weekend, "Breakfast and one main meal"),
  };
}

const poolOnly = roomKinds.find((kind) => kind.id === "pool")!;

export const stayGroups: ListingGroup[] = [
  {
    id: "rooms",
    title: "Rooms",
    line: "Priced per couple, a night. Add a guest, a child or a second room as you need.",
    listings: [
      ...couplePackages.map(room),
      {
        id: "pool-room",
        name: "Room with pool, no mountain view",
        noun: "room",
        line: "A room with a pool, facing the gardens rather than the hills.",
        photos: shots("Room with pool", [
          ["poolMural2", "A small private pool with chequered tiles and a painted wall"],
          ["roomGarden", "A room whose glass doors open onto a garden"],
        ]),
        facts: [`${poolOnly.rooms} rooms`, "2 to 4 guests"],
        features: packageIncludes,
        maxGuests: 4,
        units: poolOnly.rooms,
        onRequest: "Rates on request",
      },
    ],
  },
  {
    id: "villas",
    title: "Villas",
    line: "More room for families, some with a pool of their own. The team quotes each stay.",
    listings: [
      {
        id: "1-bhk-villa",
        name: "1 BHK villa",
        noun: "villa",
        line: "One bedroom, and space to spread out.",
        photos: shots("1 BHK villa", [["cottageMarch", "A cottage on the lawn, with the Sinhagad hills behind it"]]),
        facts: ["One bedroom"],
        onRequest: "Rates on request",
      },
      {
        id: "1-bhk-villa-with-private-pool",
        name: "1 BHK villa with private pool",
        noun: "villa",
        line: "One bedroom, and a pool of its own.",
        photos: shots("1 BHK villa with private pool", [["poolPrivate", "A glass of juice beside a small private pool and a wall of plants"]]),
        facts: ["One bedroom", "Private pool"],
        onRequest: "Rates on request",
      },
      {
        id: "2-bhk-villa-with-private-pool",
        name: "2 BHK villa with private pool",
        noun: "villa",
        line: "Two bedrooms, and a pool of their own.",
        photos: shots("2 BHK villa with private pool", [["poolMural2", "A small private pool with chequered tiles and a painted wall"]]),
        facts: ["Two bedrooms", "Private pool"],
        onRequest: "Rates on request",
      },
    ],
  },
  {
    id: "groups",
    title: "Groups",
    line: "Priced per person, for four or more.",
    listings: [
      {
        id: "group-package",
        name: groupPackage.name,
        noun: "package",
        line: "Every meal, the activities and the games, for friends and families travelling together.",
        photos: shots("Group package", [
          ["lawnPath", "A lawn running between two rows of cottages, under tall trees"],
          ["poolMain", "The main pool with loungers along a painted wall"],
          ["games", "Table tennis and foosball in the games room"],
        ]),
        facts: [`From ${groupPackage.minimum} guests`, "All meals"],
        features: packageIncludes,
        minGuests: groupPackage.minimum,
        everyNight: {
          basis: "person",
          base: groupPackage.perPerson,
          child5to11: groupPackage.child5to11,
          child3to5: groupPackage.child3to5,
          meals: "All meals, veg or non-veg",
        },
      },
    ],
  },
];

export const stayNotes = [
  `Check-in ${contact.checkIn}, check-out ${contact.checkOut}.`,
  "Sunday to Thursday nights include breakfast. Friday and Saturday nights include breakfast and one main meal.",
  `${backRooms.rooms} more rooms at the back, without air conditioning, can be booked with our team.`,
  "Our team confirms availability and the final price on WhatsApp. Nothing is charged now.",
];
