export async function hashInvitationToken(token: string) {
  const pepper = process.env.INVITATION_TOKEN_PEPPER;
  if (!pepper || pepper.length < 32) throw new Error("INVITATION_TOKEN_PEPPER must contain at least 32 characters");
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${token}.${pepper}`));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

