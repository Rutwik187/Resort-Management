/** Nothing free to hold: the last room went to someone else, or the day is full. */
export class SoldOutError extends Error {
  constructor(message = "Sold out for these dates.") {
    super(message);
    this.name = "SoldOutError";
  }
}

/** A stay rule says no, such as a minimum of two nights or no arrivals that day (INV-08). */
export class RuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RuleError";
  }
}

/** A booking can't move from its status to the one asked for (BK-04). */
export class TransitionError extends Error {
  constructor(from: string, to: string) {
    super(`A booking that is ${from.replace(/_/g, " ")} can't become ${to.replace(/_/g, " ")}.`);
    this.name = "TransitionError";
  }
}

export class NotFoundError extends Error {
  constructor(what: string) {
    super(`${what} not found.`);
    this.name = "NotFoundError";
  }
}

/** Whether a database error is a unique-key clash. Drizzle wraps the driver's error in `cause`. */
export function isUniqueViolation(error: unknown): boolean {
  for (let e: unknown = error; e; e = (e as { cause?: unknown }).cause) {
    if ((e as { code?: string }).code === "23505") return true;
  }
  return false;
}

/** Whether a database error is a failed check, such as day capacity being full. */
export function isCheckViolation(error: unknown): boolean {
  for (let e: unknown = error; e; e = (e as { cause?: unknown }).cause) {
    if ((e as { code?: string }).code === "23514") return true;
  }
  return false;
}
