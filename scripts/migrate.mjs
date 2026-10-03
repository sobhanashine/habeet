import { Client } from "pg";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

const connectionString = process.env.HABEET_DATABASE_URL;
if (!connectionString) {
  console.error(
    "Set HABEET_DATABASE_URL in .env.provision. Use the Supabase Session pooler connection.",
  );
  process.exit(1);
}
const ca = process.env.HABEET_CA_CERT_PATH
  ? await readFile(resolve(process.env.HABEET_CA_CERT_PATH), "utf8")
  : undefined;
const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: true, ...(ca ? { ca } : {}) },
  connectionTimeoutMillis: 15000,
});
try {
  await client.connect();
  await client.query("begin");
  await client.query("select pg_advisory_xact_lock(437672110)");
  await client.query("create schema if not exists habeet_private");
  await client.query(
    "revoke all on schema habeet_private from public, anon, authenticated",
  );
  await client.query(
    "create table if not exists habeet_private.migrations (name text primary key, applied_at timestamptz not null default now())",
  );
  const files = (await readdir("supabase/migrations"))
    .filter((name) => name.endsWith(".sql"))
    .sort();
  for (const name of files) {
    const existing = await client.query(
      "select name from habeet_private.migrations where name = $1",
      [name],
    );
    if (existing.rowCount) {
      console.log(`Already applied: ${name}`);
      continue;
    }
    await client.query(await readFile(`supabase/migrations/${name}`, "utf8"));
    await client.query(
      "insert into habeet_private.migrations (name) values ($1)",
      [name],
    );
    console.log(`Applied: ${name}`);
  }
  await client.query("notify pgrst, 'reload schema'");
  await client.query("commit");
  console.log("Habeet database is ready.");
} catch (error) {
  await client.query("rollback").catch(() => {});
  const safeMessage = String(error.message).replace(
    /postgres(?:ql)?:\/\/\S+/g,
    "[redacted connection]",
  );
  console.error(
    `Migration failed (${error.code ?? "connection"}): ${safeMessage}`,
  );
  process.exitCode = 1;
} finally {
  await client.end();
}
