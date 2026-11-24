/**
 * Words for a failed upload to Vercel Blob. The Blob client hides the
 * server's reason behind "Failed to retrieve the client token", so this
 * says what usually causes it.
 */
export function uploadProblem(error: unknown, fallback = "The upload didn't go through. Try again.") {
  const message = error instanceof Error ? error.message : "";
  if (/client token/i.test(message)) return "The upload couldn't start. File storage may not be set up yet, or your role can't upload here.";
  if (/content type|not allowed/i.test(message)) return "That kind of file isn't allowed here.";
  if (/too large|maximum|size/i.test(message)) return "That file is too large.";
  return message ? `${fallback} (${message.replace(/^Vercel Blob:\s*/, "")})` : fallback;
}
