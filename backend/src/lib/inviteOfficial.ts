import { serviceDb } from "../db";

export type InviteResult =
  | { ok: true; userId: string }
  | { ok: false; message: string };

/** Send Supabase Auth invite email and return the new auth user id. */
export async function inviteOfficialByEmail(
  email: string,
  metadata?: { full_name?: string }
): Promise<InviteResult> {
  const { data, error } = await serviceDb().auth.admin.inviteUserByEmail(email, {
    data: metadata ?? {},
  });

  if (error) {
    const msg = error.message ?? "Invite failed";
    if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("registered")) {
      const { data: existing } = await serviceDb()
        .from("profiles")
        .select("user_id")
        .eq("email", email.toLowerCase())
        .maybeSingle();
      if (existing?.user_id) return { ok: true, userId: existing.user_id };
    }
    return { ok: false, message: msg };
  }

  if (!data.user?.id) return { ok: false, message: "Invite succeeded but no user id returned" };
  return { ok: true, userId: data.user.id };
}
