/** The query string a search travels in, from a home page bar to the booking page. */
export const searchParamNames = { checkIn: "in", checkOut: "out", rooms: "rooms", adults: "adults", children: "children" } as const;

/** The visit date a day bar sends to the day-pass page. */
export const dayParam = "date";

/** A pass to open straight away, from a "Book this pass" link elsewhere on the site. */
export const passParam = "pass";
