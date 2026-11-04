import { getDb } from "@repo/db";
import { loadStaffAccess, type StaffAccess } from "./permissions";
import { getAuth } from "./server";

/** The signed-in staff member for this request, or null. Pass the request's headers. */
export async function getStaff(headers: Headers): Promise<StaffAccess | null> {
  const current = await getAuth().api.getSession({ headers });
  if (!current) return null;
  return loadStaffAccess(getDb(), current.user.id);
}

/** Thrown when there is no signed-in, active staff member. The admin sends them to sign in. */
export class SignedOutError extends Error {
  constructor() {
    super("Sign in to continue.");
    this.name = "SignedOutError";
  }
}

/** The signed-in staff member, or SignedOutError. */
export async function requireStaff(headers: Headers): Promise<StaffAccess> {
  const staff = await getStaff(headers);
  if (!staff) throw new SignedOutError();
  return staff;
}
