import test from "node:test";
import assert from "node:assert/strict";
import {
  DAY,
  activeRun,
  addDays,
  bestDays,
  checkIn,
  createHabit,
  dateKey,
  elapsed,
  isCompletedOn,
  monthDays,
  parseHabits,
  persianDate,
  restart,
  totalDays,
  weekDays,
} from "../lib/habits";

const start = Date.parse("2026-09-29T20:00:00Z"); // 23:30 in Tehran
const makeHabit = (now = start) =>
  createHabit(
    {
      title: "ترک سیگار",
      reason: "برای خودم",
      icon: "cigarette",
      color: "green",
      goalDays: 7,
      startedAt: new Date(start).toISOString(),
    },
    now,
  );

test("midnight does not award a completed 24-hour day", () => {
  const habit = makeHabit();
  const now = start + 2 * 3600_000;
  assert.equal(dateKey(now), "2026-09-30");
  assert.equal(elapsed(habit, now).days, 0);
  assert.equal(isCompletedOn(habit, "2026-09-30", now), false);
});
test("the exact 24-hour boundary awards one tick on the Tehran date", () => {
  const habit = makeHabit();
  assert.equal(isCompletedOn(habit, "2026-09-30", start + DAY - 1), false);
  assert.equal(isCompletedOn(habit, "2026-09-30", start + DAY), true);
  assert.equal(elapsed(habit, start + DAY).days, 1);
  assert.equal(isCompletedOn(habit, "2026-10-01", start + DAY), false);
});
test("reopening calculates elapsed time from timestamps", () => {
  const habit = JSON.parse(JSON.stringify(makeHabit()));
  assert.deepEqual(
    elapsed(habit, start + 17 * DAY + 2 * 3600_000 + 13 * 60_000 + 8000),
    {
      days: 17,
      hours: 2,
      minutes: 13,
      seconds: 8,
      progress: (2 * 3600 + 13 * 60 + 8) / 86400,
    },
  );
});
test("daily check-ins are idempotent and never fast-forward the timer", () => {
  const habit = checkIn(checkIn(makeHabit(), start + 1000), start + 1000);
  assert.equal(activeRun(habit).checkins.length, 1);
  assert.equal(elapsed(habit, start + 1000).days, 0);
  assert.equal(totalDays(habit, start + 1000), 0);
});
test("restarting preserves old successful days, attempts and best streak", () => {
  const resumed = restart(makeHabit(), start + DAY + 3600_000);
  const now = start + 3 * DAY + 3600_000;
  assert.equal(resumed.runs.length, 2);
  assert.equal(totalDays(resumed, now), 3);
  assert.equal(bestDays(resumed, now), 2);
  assert.equal(elapsed(resumed, now).days, 2);
  assert.equal(isCompletedOn(resumed, "2026-09-30", now), true);
  assert.equal(
    resumed.runs[0].endedAt,
    new Date(start + DAY + 3600_000).toISOString(),
  );
});
test("weeks start on Saturday in Tehran", () => {
  assert.deepEqual(weekDays(Date.parse("2026-10-03T10:00:00Z")), [
    "2026-10-03",
    "2026-10-04",
    "2026-10-05",
    "2026-10-06",
    "2026-10-07",
    "2026-10-08",
    "2026-10-09",
  ]);
  assert.equal(
    weekDays(Date.parse("2026-10-03T10:00:00Z"), -1)[0],
    "2026-09-26",
  );
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
});
test("Persian month bounds account for leap Esfand", () => {
  const month = monthDays("2025-03-10");
  assert.equal(month.first, "2025-02-19");
  assert.equal(month.last, "2025-03-20");
  assert.equal(month.days.length, 30);
});
test("invalid or duplicate backup records are rejected", () => {
  const habit = makeHabit();
  assert.equal(parseHabits([habit]).length, 1);
  assert.throws(() => parseHabits([habit, habit]));
  assert.throws(() => parseHabits([{ ...habit, runs: [] }]));
  assert.throws(() => parseHabits([{ ...habit, goalDays: -1 }]));
  assert.throws(() => parseHabits([{ ...habit, title: "" }]));
  assert.throws(() =>
    parseHabits([
      { ...habit, runs: [{ ...activeRun(habit), startedAt: "not-a-date" }] },
    ]),
  );
});
test("future start times are rejected", () => {
  assert.throws(() =>
    createHabit(
      {
        title: "ترک سیگار",
        reason: "",
        icon: "leaf",
        color: "green",
        goalDays: 7,
        startedAt: new Date(start + DAY).toISOString(),
      },
      start,
    ),
  );
});

test("Persian dates use natural day-month-year order", () => {
  assert.equal(
    persianDate("2026-10-03T12:00:00Z", { year: "numeric", weekday: "long" }),
    "شنبه، ۱۱ مهر ۱۴۰۵",
  );
  assert.equal(
    persianDate("2026-10-03T12:00:00Z", { year: "numeric", day: undefined }),
    "مهر ۱۴۰۵",
  );
});

test("restarting within the creation second cannot end a run before it starts", () => {
  const restarted = restart(makeHabit(), start - 300);
  assert.equal(restarted.runs[0].endedAt, new Date(start).toISOString());
});
