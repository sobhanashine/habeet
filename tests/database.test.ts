import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const userA = "11111111-1111-4111-8111-111111111111";
const userB = "22222222-2222-4222-8222-222222222222";
const habitId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const runs = JSON.stringify([
  {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    startedAt: "2026-09-29T20:00:00Z",
    endedAt: null,
    checkins: [],
  },
]);

test("Supabase schema enforces private account access and safe updates", async (t) => {
  const db = new PGlite();
  try {
    await db.exec(`create role authenticated; create role anon; create schema auth;
      create table auth.users (id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth, public to authenticated, anon;
      insert into auth.users values ('${userA}'), ('${userB}');`);
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/202610030001_habits.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    const asUser = async (id: string) => {
      await db.exec("reset role; set role authenticated");
      await db.query("select set_config('request.jwt.claim.sub', $1, false)", [
        id,
      ]);
    };
    const insert = (owner: string, id = habitId) =>
      db.query(
        "insert into public.habits (id,user_id,title,icon,color,goal_days,runs) values ($1,$2,'ترک سیگار','cigarette','green',7,$3::jsonb)",
        [id, owner, runs],
      );

    await t.test(
      "an authenticated owner can create and read their habit",
      async () => {
        await asUser(userA);
        await insert(userA);
        const result = await db.query<{ title: string }>(
          "select title from public.habits",
        );
        assert.equal(result.rows[0].title, "ترک سیگار");
      },
    );
    await t.test(
      "another account cannot read or modify the habit",
      async () => {
        await asUser(userB);
        assert.equal(
          (await db.query("select * from public.habits")).rows.length,
          0,
        );
        assert.equal(
          (
            await db.query(
              "update public.habits set title='تغییر' where id=$1 returning id",
              [habitId],
            )
          ).rows.length,
          0,
        );
        await assert.rejects(insert(userA), /row-level security/);
      },
    );
    await t.test(
      "the same backup ID can be imported into a separate account",
      async () => {
        await asUser(userB);
        await insert(userB);
        const result = await db.query<{ user_id: string }>(
          "select user_id from public.habits",
        );
        assert.equal(result.rows.length, 1);
        assert.equal(result.rows[0].user_id, userB);
      },
    );
    await t.test(
      "anonymous visitors cannot access account habits",
      async () => {
        await db.exec("reset role; set role anon");
        await assert.rejects(
          db.query("select * from public.habits"),
          /permission denied/,
        );
      },
    );
    await t.test(
      "a stale revision cannot overwrite a newer update",
      async () => {
        await asUser(userA);
        const first = await db.query(
          "update public.habits set revision=1, title='عنوان تازه' where id=$1 and revision=0 returning revision",
          [habitId],
        );
        assert.equal(first.rows.length, 1);
        const stale = await db.query(
          "update public.habits set revision=1, title='عنوان قدیمی' where id=$1 and revision=0 returning revision",
          [habitId],
        );
        assert.equal(stale.rows.length, 0);
      },
    );
    await t.test("invalid goals are rejected by the database", async () => {
      await asUser(userA);
      await assert.rejects(
        db.query("update public.habits set goal_days=999 where id=$1", [
          habitId,
        ]),
        /check constraint/,
      );
    });
    await t.test(
      "soft deleted habits are excluded and cannot be resurrected by stale edits",
      async () => {
        await asUser(userA);
        await db.query(
          "update public.habits set deleted_at=now(), revision=2 where id=$1",
          [habitId],
        );
        assert.equal(
          (
            await db.query(
              "select * from public.habits where deleted_at is null",
            )
          ).rows.length,
          0,
        );
        assert.equal(
          (
            await db.query(
              "update public.habits set revision=3 where id=$1 and deleted_at is null returning id",
              [habitId],
            )
          ).rows.length,
          0,
        );
      },
    );
  } finally {
    await db.close();
  }
});
