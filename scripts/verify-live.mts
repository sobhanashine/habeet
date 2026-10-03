import { createClient } from "@supabase/supabase-js";
import assert from "node:assert/strict";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const serviceKey = process.env.HABEET_SUPABASE_SERVICE_KEY!;
if (!url || !key || !serviceKey)
  throw new Error("Supabase verification environment is missing.");
const options = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
};
const admin = createClient(url, serviceKey, options);
const clientA = createClient(url, key, options);
const clientB = createClient(url, key, options);
const anonymous = createClient(url, key, options);
const created: string[] = [];

try {
  for (const client of [clientA, clientB]) {
    const email = `habeet.qa.${crypto.randomUUID()}@example.invalid`;
    const password = crypto.randomUUID() + "aA1!";
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    assert.equal(error, null, "Temporary QA user creation failed");
    assert.ok(data.user);
    created.push(data.user.id);
    const login = await client.auth.signInWithPassword({ email, password });
    assert.equal(login.error, null, "Password login failed");
  }
  const habitId = crypto.randomUUID();
  const row = {
    id: habitId,
    user_id: created[0],
    title: "تست موقت هبیت",
    reason: "",
    icon: "leaf",
    color: "green",
    goal_days: 7,
    runs: [
      {
        id: crypto.randomUUID(),
        startedAt: new Date(Date.now() - 86_400_000).toISOString(),
        endedAt: null,
        checkins: [],
      },
    ],
    revision: 0,
  };
  const insert = await clientA.from("habits").insert(row).select("id").single();
  assert.equal(insert.error, null, "Habit creation failed");
  const own = await clientA.from("habits").select("id").eq("id", habitId);
  assert.equal(own.data?.length, 1);
  const other = await clientB.from("habits").select("id").eq("id", habitId);
  assert.equal(other.error, null);
  assert.equal(other.data?.length, 0, "Another account can read the habit");
  const otherEdit = await clientB
    .from("habits")
    .update({ title: "تغییر غیرمجاز" })
    .eq("id", habitId)
    .select("id");
  assert.equal(
    otherEdit.data?.length,
    0,
    "Another account can change the habit",
  );
  const badInsert = await clientB
    .from("habits")
    .insert({ ...row, id: crypto.randomUUID() });
  assert.ok(badInsert.error, "Another account can create habits for the owner");
  const unauthenticated = await anonymous.from("habits").select("id");
  assert.ok(unauthenticated.error, "Unauthenticated reads are permitted");
  const update = await clientA
    .from("habits")
    .update({ revision: 1 })
    .eq("id", habitId)
    .eq("revision", 0)
    .select("id");
  assert.equal(update.data?.length, 1);
  const stale = await clientA
    .from("habits")
    .update({ revision: 1, title: "عنوان قدیمی" })
    .eq("id", habitId)
    .eq("revision", 0)
    .select("id");
  assert.equal(stale.data?.length, 0);
  const sameId = await clientB
    .from("habits")
    .insert({ ...row, user_id: created[1] })
    .select("id");
  assert.equal(
    sameId.error,
    null,
    "Backup ID cannot be imported into another account",
  );
  const deleted = await clientA
    .from("habits")
    .update({ deleted_at: new Date().toISOString(), revision: 2 })
    .eq("id", habitId)
    .eq("revision", 1)
    .select("id");
  assert.equal(deleted.data?.length, 1);
  const active = await clientA
    .from("habits")
    .select("id")
    .is("deleted_at", null);
  assert.equal(active.data?.length, 0);
  console.log(
    "Live Supabase verified: login, create, read, owner isolation, blocked anonymous access, revision conflicts, backup IDs, soft deletion.",
  );
} finally {
  for (const id of created) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) {
      console.error("Temporary QA account cleanup failed.");
      process.exitCode = 1;
    }
  }
  console.log(
    `Cleaned up ${created.length} temporary QA accounts and their habit rows.`,
  );
}
