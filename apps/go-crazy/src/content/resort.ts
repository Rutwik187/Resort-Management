import type { PhotoKey } from "./photos";

/*
 * Every fact on this site comes from the current gocrazyadventure.com, or
 * from the park's own photos and films. Change prices and phone numbers
 * here, and the whole site follows.
 */

export const contact = {
  phone: { display: "+91 90494 32222", href: "tel:+919049432222" },
  // The only number the current site gives for WhatsApp. Every enquiry goes here.
  whatsapp: { display: "+91 86053 91111", number: "918605391111" },
  weddingPhone: { display: "+91 86053 91111", href: "tel:+918605391111" },
  email: "info@gocrazyadventure.com",
  groupEmail: "info@prathameshgroup.com",
  weddingEmail: "wedding@gocrazyadventure.com",
  addressLines: ["At Post Donje, Polekar Wadi", "Ghera Sinhagad Fort", "Pune, Maharashtra 411025"],
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=Prathamesh%20Go%20Crazy%20Adventure%20Park%2C%20Donje%2C%20Pune",
  checkIn: "1:00 pm",
  checkOut: "10:00 am",
} as const;

export const nav = [
  { label: "Day passes", href: "/day-packages" },
  { label: "Activities", href: "/activities" },
  { label: "Stays", href: "/stays" },
  { label: "School trips", href: "/schools" },
  { label: "Weddings and events", href: "/celebrations" },
] as const;

/* ------------------------------------------------------------------ */
/* Offers                                                              */
/* ------------------------------------------------------------------ */

/** Current offers from the live site. Set active to false to take one down everywhere. */
export const offers = [
  {
    id: "day-pass-two-for-one",
    active: true,
    title: "Book one day package, get one free",
    note: "Ask us on WhatsApp for the dates it applies to.",
  },
];

export const currentOffer = offers.find((offer) => offer.active);

/* ------------------------------------------------------------------ */
/* Day passes                                                          */
/* ------------------------------------------------------------------ */

export type MealId = "breakfast" | "lunch" | "hiTea" | "dinner";

/** Meal times from the park's rules. */
export const meals: { id: MealId; label: string; time: string }[] = [
  { id: "breakfast", label: "Breakfast", time: "9:30 to 10:30 am" },
  { id: "lunch", label: "Lunch", time: "1:00 to 2:30 pm" },
  { id: "hiTea", label: "Hi-tea", time: "5:00 to 6:00 pm" },
  { id: "dinner", label: "Dinner", time: "8:30 to 9:30 pm" },
];

export type DayPass = {
  id: "morning" | "afternoon" | "evening" | "full-day";
  name: string;
  hours: string;
  meals: MealId[];
  adult: number;
  child5to11: number;
  child3to5: number;
};

export const dayPasses: DayPass[] = [
  { id: "morning", name: "Morning", hours: "9:00 am to 6:00 pm", meals: ["breakfast", "lunch", "hiTea"], adult: 1400, child5to11: 1000, child3to5: 500 },
  { id: "afternoon", name: "Afternoon", hours: "11:00 am to 6:00 pm", meals: ["lunch", "hiTea"], adult: 1200, child5to11: 900, child3to5: 400 },
  { id: "evening", name: "Evening", hours: "3:30 pm to 10:30 pm", meals: ["hiTea", "dinner"], adult: 1300, child5to11: 900, child3to5: 400 },
  // The current site lists breakfast, lunch and hi-tea for the full day, without dinner.
  { id: "full-day", name: "Full day", hours: "9:30 am to 9:30 pm", meals: ["breakfast", "lunch", "hiTea"], adult: 1800, child5to11: 1000, child3to5: 500 },
];

export const isPassId = (value: unknown): value is DayPass["id"] => dayPasses.some((p) => p.id === value);

/* ------------------------------------------------------------------ */
/* Activities                                                          */
/* ------------------------------------------------------------------ */

export type ActivityGroup = {
  id: "water" | "heights" | "aim" | "indoor" | "little-ones";
  title: string;
  line: string;
  items: string[];
  /** No photo yet for some groups: their tile is drawn instead (see activity-board.tsx). */
  cover?: PhotoKey;
  gallery: PhotoKey[];
};

export const activityGroups: ActivityGroup[] = [
  {
    id: "water",
    title: "Water",
    line: "The main pool, its twin slides and the rain dance.",
    items: ["swimming pool", "twin water slides", "rain dance"],
    cover: "slides",
    gallery: ["slides", "pool", "poolGazebo", "poolUpright", "poolWide"],
  },
  {
    id: "heights",
    title: "Heights",
    line: "High ropes, the zip line, the climbing tower and rappelling.",
    items: ["high ropes course", "zip line", "climbing wall", "rappelling", "rope bridges"],
    cover: "zipline",
    gallery: ["zipline", "climb", "ropesCourse", "ropeBridge", "rappel", "climbTower", "zipRider", "ropesTower"],
  },
  {
    id: "aim",
    title: "Aim",
    line: "Archery and rifle shooting, both paid at the ride.",
    items: ["archery", "rifle shooting"],
    gallery: [],
  },
  {
    id: "indoor",
    title: "Indoors",
    line: "Board games and a pool table, for a quieter hour.",
    items: ["carrom", "chess", "pool table", "ludo", "playing cards"],
    gallery: [],
  },
  {
    id: "little-ones",
    title: "Little ones",
    line: "A play area of their own, with swings, a merry-go-round and a flying fox.",
    items: ["swings", "merry-go-round", "flying fox for children", "indoor and outdoor play areas"],
    cover: "swings",
    gallery: ["swings", "merryGoRound", "playGate", "tyreBridge"],
  },
];

/** The general adventure course, as the park lists it for school groups. Included in every day pass. */
export const groundCourse = [
  "Hanging tyre bridge",
  "Horizontal square batten bridge",
  "Wall crossing with a rope",
  "Vertical nylon net bridge, sideways",
  "Flying fox for children",
  "Round batten bridge",
  "Crawl through a vertical tyre",
  "Wooden plank ramp",
  "Nylon net bridge",
  "Vertical ladder",
  "Rope climbing",
  "V wooden beam bridge",
  "X wooden log hanging bridge",
  "U nylon net bridge",
  "Horizontal log bridge",
  "Vertical square beam bridge, sideways",
  "Walking in vertical tyres",
  "Vertical square log bridge",
  "Crawl through hanging tyres",
  "Walking on a wire rope",
];

/** Paid on the day, at the activity. Not part of any package. Student rates apply to school groups. */
export const paidActivities: { name: string; price: number; student?: number }[] = [
  { name: "Zip line", price: 100, student: 50 },
  { name: "Wall climbing", price: 100, student: 50 },
  { name: "Rappelling", price: 100 },
  { name: "Rifle shooting", price: 50, student: 25 },
  { name: "Archery", price: 50, student: 25 },
  { name: "ATV bike", price: 100, student: 50 },
  { name: "360 cycling", price: 100, student: 50 },
  { name: "Bull ride", price: 100, student: 50 },
  { name: "Bungee trampoline", price: 150, student: 75 },
  { name: "Human gyro", price: 100, student: 50 },
  { name: "Rocket ejector", price: 200, student: 100 },
  { name: "Trampoline", price: 100, student: 50 },
];

/* ------------------------------------------------------------------ */
/* Stays                                                               */
/* ------------------------------------------------------------------ */

export type CouplePlan = { base: number; extraPerson: number; child5to11: number; child3to5?: number };

export type Stay = {
  slug: string;
  name: string;
  line: string;
  units: string;
  guests: string;
  photos: PhotoKey[];
  /** Monday to Thursday, room with breakfast (CP). */
  weekday?: CouplePlan;
  /** Friday and Saturday, breakfast and one main meal (MAP). */
  weekend?: CouplePlan;
  /** Villas have one rate per person, every day. */
  perPerson?: number;
};

export const stayFeatures = ["Air conditioning", "Balcony", "Attached bathroom", "Flat-screen TV", "Mineral water", "Veg and non-veg meals"];

export const stays: Stay[] = [
  {
    slug: "chira-cottage",
    name: "1 RK Chira Cottage",
    line: "Red laterite stone cottages under the palms.",
    units: "15 rooms",
    guests: "2 to 4 guests",
    photos: ["chiraPair", "chiraRoom", "chiraPalms", "chiraRoom3"],
    weekday: { base: 4000, extraPerson: 1500, child5to11: 1000 },
    weekend: { base: 7500, extraPerson: 3000, child5to11: 1500, child3to5: 800 },
  },
  {
    slug: "sofa-cum-bed-cottage",
    name: "Sofa Cum Bed AC Cottage",
    line: "Folk-painted cottages, each with a sofa-cum-bed.",
    units: "12 rooms",
    guests: "2 to 4 guests",
    photos: ["paintedCottage", "sofaRoom2", "orangeCottage", "sofaRoom4"],
    weekday: { base: 4000, extraPerson: 1500, child5to11: 1000 },
    weekend: { base: 7000, extraPerson: 3000, child5to11: 1500, child3to5: 800 },
  },
  {
    slug: "new-couple-cottage",
    name: "New Couple Cottage",
    line: "Three newer cottages, made for two.",
    units: "3 rooms",
    guests: "2 guests",
    photos: ["coupleRoom", "coupleRoom2", "coupleRoom3"],
    weekday: { base: 3500, extraPerson: 1500, child5to11: 1000 },
    weekend: { base: 7000, extraPerson: 3000, child5to11: 1500, child3to5: 800 },
  },
  {
    slug: "2-bhk-villa",
    name: "2 BHK Villa",
    line: "Two bedrooms for a group of six.",
    units: "2 villas",
    guests: "6 guests",
    photos: ["villa", "villaRoom"],
    perPerson: 3000,
  },
  {
    slug: "3-bhk-villa",
    name: "3 BHK Villa",
    line: "Three bedrooms for a group of twelve.",
    units: "1 villa",
    guests: "12 guests",
    photos: ["villaRoom2", "villaRoom3"],
    perPerson: 3000,
  },
];

/* ------------------------------------------------------------------ */
/* Schools                                                             */
/* ------------------------------------------------------------------ */

export const schoolDayRates = [
  { grade: "Nursery, Jr. KG and Sr. KG", price: 450 },
  { grade: "Standards 1 to 4", price: 500 },
  { grade: "Standards 5 to 10", price: 550 },
  { grade: "Junior college", price: 650 },
  { grade: "Senior college", price: 900 },
  { grade: "Extra teacher", price: 650 },
  { grade: "Teachers' picnic", price: 1000 },
];

export const schoolItinerary = [
  { time: "9:00 am", what: "Arrival, and registration at the gate until 9:15" },
  { time: "9:15 am", what: "Breakfast" },
  { time: "10:00 am", what: "Briefing on the activities" },
  { time: "10:15 am", what: "Activities" },
  { time: "1:00 pm", what: "Lunch" },
  { time: "2:00 pm", what: "DJ dance and rain dance" },
  { time: "3:00 pm", what: "Departure" },
];

export const schoolMenu = [
  { meal: "Breakfast", food: "Idli, sambhar and chutney, with poha. Tea or coffee for teachers." },
  { meal: "Lunch", food: "Pav bhaji, pulao and gulab jamun." },
  { meal: "Hi-tea", food: "Soft drinks. Tea or coffee with biscuits for teachers." },
];

export const schoolOvernightRates = [
  { grade: "Standards 1 to 4", price: 1800 },
  { grade: "Standards 5 to 10", price: 2000 },
  { grade: "Standards 11 and 12", price: 2500 },
  { grade: "Extra teacher", price: 2500 },
  { grade: "Teachers' picnic", price: 2500 },
];

export const schoolOvernightMenu = [
  { meal: "Breakfast", food: "One South Indian and one Maharashtrian dish, bread, butter and jam, tea and coffee." },
  { meal: "Hi-tea, for teachers", food: "One snack, with tea and coffee." },
  { meal: "Lunch and dinner", food: "Soup, a paneer dish, a Maharashtrian vegetable, dal, rice, roti or naan, papad, pickle and salad." },
];

export const schoolDressCode = [
  "Track pants or loose pants",
  "A T-shirt and sports shoes",
  "A water bottle and a cap",
  "A hand napkin and a towel",
  "One extra set of clothes, for after the rain dance",
  "One bag for wet clothes",
];

export const schoolTerms = [
  "Please report on time, so the group can finish all the activities in one day.",
  "At least 40 adventure activities are in operation.",
  "The package does not include paid activities.",
  "Teachers are responsible for their students' behaviour.",
  "The trip in-charge signs a common disclaimer at registration. This is mandatory.",
  "Students follow the instructions of our activity instructors.",
  "One teacher comes free with every 25 students, and one driver with every 50 students.",
  "Outside food is not allowed.",
  "Bus drivers and cleaners get subsidised food. Collect the coupon at the main gate when you pay.",
  "We are not responsible for lost valuables. Students look after their own.",
  "Please keep the park clean and use the dustbins.",
];

/* ------------------------------------------------------------------ */
/* Celebrations                                                        */
/* ------------------------------------------------------------------ */

export const weddingMoments: { title: string; body: string; points: string[]; photo: PhotoKey }[] = [
  {
    title: "The ceremony",
    body: "Plan the day your way, against the Sahyadri, with a package made around you.",
    points: ["Ample space for many guests", "Comfortable rooms for guests to stay", "Reputed chefs and caterers for multi-cuisine food", "Serene surroundings for photography"],
    photo: "lawn",
  },
  {
    title: "The reception",
    body: "An on-site manager runs the whole evening, so the day ends on the right note.",
    points: ["Professional catering and menu options", "Ample seating for guests", "Theme décor and floral arrangements", "Rooms for guests"],
    photo: "banquetHall",
  },
  {
    title: "Mehendi and haldi",
    body: "Pre-wedding rituals and shoots among the trees, flowers and lawns.",
    points: ["Ideal for a professional photoshoot", "Food included in the package", "A package made to suit you", "Ample rooms available"],
    photo: "treeWalk",
  },
];

/* ------------------------------------------------------------------ */
/* Around the park                                                     */
/* ------------------------------------------------------------------ */

/** Distances from the park, as the current site gives them. */
export const nearby = [
  {
    group: "Forts",
    places: [
      { name: "Sinhagad", km: 2 },
      { name: "Purandar", km: 28 },
      { name: "Rajgad", km: 36 },
      { name: "Torna", km: 41 },
    ],
  },
  {
    group: "Dams",
    places: [
      { name: "Sarawada Dam", km: 20 },
      { name: "Bhatghar Dam", km: 31 },
      { name: "Neera Devdhar Dam", km: 49 },
      { name: "Unjawane Dam", km: 59 },
    ],
  },
  {
    group: "Hill towns",
    places: [
      { name: "Wai", km: 59 },
      { name: "Panchgani", km: 72 },
      { name: "Satara", km: 83 },
      { name: "Mahabaleshwar", km: 91 },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Policies                                                            */
/* ------------------------------------------------------------------ */

export const houseRules = [
  "Keep the park clean, use water carefully and do not waste food.",
  "Smoking and alcohol are not allowed anywhere in the park. Intoxicated persons may not enter.",
  "Outside food and drinks are not allowed.",
  "Pets are not allowed.",
  "Meals are served only at their set times.",
  "Please do not argue with the staff about grievances or discounts. Speak to the office.",
  "All persons, bags and parcels may be checked for security at the entry and inside the park.",
  "Be courteous to other guests and our staff, and keep to the queue at each ride.",
  "Please put sanitary napkins only in the dustbins.",
];

export const safetyRules = [
  "Follow the instructions of the lifeguards, ride operators and the signs at each ride. The management is not responsible for injuries caused by a guest's negligence.",
  "The pools are shallow. Do not dive.",
  "Pregnant women, heart patients, people with high blood pressure and anyone medically unfit should avoid fast or adventurous rides and the pool.",
  "Children must be with an adult at all times.",
  "Some rides have height limits. Children below the height are not allowed on them.",
  "The management may close any ride at any time for safety or technical reasons.",
];

export const poolRules = [
  "Only swimwear is allowed in the pools.",
  "Not allowed: sarees, dupattas, long pants, shirts, jeans of any length, cargos, burkhas, head scarves or other unsuitable clothing.",
];

export const entryTerms = [
  "Each ticket admits one person, on the date and time it is valid for.",
  "Tickets are non-transferable and non-refundable. Passes once sold cannot be cancelled, transferred, brought forward or postponed.",
  "Guests may be asked to leave before closing time if the situation demands it.",
  "The management may cancel a ticket and remove anyone from the park for misbehaviour or for breaking the park rules.",
  "The management is not responsible for the loss of personal belongings.",
  "Selling or promoting goods or services, distributing printed material, and filming or photography for commercial use need the management's approval in advance.",
  "The park may photograph or film guests and use the images for publicity, without payment.",
  "Parking is first come, first served. The park is not responsible for loss of or damage to vehicles. Do not leave valuables in the car.",
  "The park is far from the city, so power cuts happen. We ask for your patience when they do.",
];

export const paymentTerms = [
  "All payments are in Indian rupees.",
  "Please bring a valid photo ID. It may be checked against the booking and the payment.",
  "School groups pay 50% in advance when they book, and the balance on the day at registration, by cash, cheque or RTGS.",
  "These terms are governed by the laws of India, and the courts at Mumbai have exclusive jurisdiction.",
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Capitalises the first letter, for list items stored in lower case. */
export const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Joins items into one sentence-case line: "Zip line, climbing wall and rappelling". */
export const listLine = (items: string[]) =>
  cap(items.length > 1 ? `${items.slice(0, -1).join(", ")} and ${items.at(-1)}` : items[0] ?? "");

export const formatRupees = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;
