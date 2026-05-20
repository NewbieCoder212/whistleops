/**
 * One-off: link a Supabase Auth user to a profiles row (and workspace membership).
 * Usage: bun run scripts/link-profile.ts <email> [ADMIN|ASSIGNOR|OFFICIAL]
 */
import { createClient } from "@supabase/supabase-js";

const email = process.argv[2]?.trim().toLowerCase();
const role = (process.argv[3] ?? "ADMIN").toUpperCase();
const WORKSPACE_ID = "00000000-0000-4000-8000-000000000001";

if (!email) {
  console.error("Usage: bun run scripts/link-profile.ts <email> [role]");
  process.exit(1);
}

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

const { data: list, error: listErr } = await db.auth.admin.listUsers({ perPage: 1000 });
if (listErr) {
  console.error("listUsers:", listErr.message);
  process.exit(1);
}

const authUser = list.users.find((u) => u.email?.toLowerCase() === email);
if (!authUser) {
  console.error(`No auth user for ${email}. Sign up or invite them in Supabase Auth first.`);
  process.exit(1);
}

console.log("Auth user:", authUser.id, authUser.email);

const { data: byUser } = await db.from("profiles").select("*").eq("user_id", authUser.id).maybeSingle();
if (byUser) {
  console.log("Profile already linked:", byUser.id, byUser.role);
  process.exit(0);
}

const { data: byEmail } = await db.from("profiles").select("*").eq("email", email).maybeSingle();

let profileId: string;

if (byEmail) {
  const { data: updated, error: updErr } = await db
    .from("profiles")
    .update({ user_id: authUser.id })
    .eq("id", byEmail.id)
    .select()
    .single();
  if (updErr) {
    console.error("link profile:", updErr.message);
    process.exit(1);
  }
  profileId = updated.id;
  console.log("Linked existing profile:", profileId, updated.role);
} else {
  const { data: inserted, error: insErr } = await db
    .from("profiles")
    .insert({
      user_id: authUser.id,
      email,
      full_name: authUser.user_metadata?.full_name ?? null,
      role,
    })
    .select()
    .single();
  if (insErr) {
    console.error("insert profile:", insErr.message);
    process.exit(1);
  }
  profileId = inserted.id;
  console.log("Created profile:", profileId, role);
}

const { error: wmErr } = await db.from("workspace_members").upsert(
  {
    workspace_id: WORKSPACE_ID,
    profile_id: profileId,
    role: byEmail?.role ?? role,
  },
  { onConflict: "workspace_id,profile_id" }
);
if (wmErr) {
  console.warn("workspace_members (run migration 0011?):", wmErr.message);
} else {
  console.log("Workspace membership OK for Hockey New Brunswick");
}

console.log("Done. User can sign in at https://whistleops.vercel.app");
