export const DAY = 86_400_000;
export const TIME_ZONE = "Asia/Tehran";
export const GUEST_KEY = "habeet:guest:v1";

export type HabitIcon =
  "cigarette" | "phone" | "moon" | "coffee" | "heart" | "leaf";
export type HabitColor = "green" | "lavender" | "peach" | "blue";
export type Run = {
  id: string;
  startedAt: string;
  endedAt: string | null;
  checkins: string[];
};
export type Habit = {
  id: string;
  title: string;
  reason: string;
  icon: HabitIcon;
  color: HabitColor;
  goalDays: number;
  createdAt: string;
  runs: Run[];
  revision: number;
};
export type HabitInput = Pick<
  Habit,
  "title" | "reason" | "icon" | "color" | "goalDays"
> & { startedAt: string };

export const fa = (number: number) =>
  new Intl.NumberFormat("fa-IR").format(number);
export const padFa = (number: number) =>
  new Intl.NumberFormat("fa-IR", {
    minimumIntegerDigits: 2,
    useGrouping: false,
  }).format(number);

export function dateKey(value: number | Date | string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const get = (name: string) => parts.find((part) => part.type === name)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export const dateFromKey = (key: string) => new Date(`${key}T12:00:00Z`);
export function addDays(key: string, days: number) {
  const date = dateFromKey(key);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
export function weekDays(now: number, offset = 0) {
  const today = dateKey(now);
  const weekday = dateFromKey(today).getUTCDay();
  const start = addDays(today, -((weekday + 1) % 7) + offset * 7);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}
export function persianDate(
  value: number | Date | string,
  options: Intl.DateTimeFormatOptions = {},
) {
  const parts = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    timeZone: TIME_ZONE,
    day: "numeric",
    month: "long",
    ...options,
  }).formatToParts(new Date(value));
  const get = (type: string) => parts.find((part) => part.type === type)?.value;
  const date = [get("day"), get("month"), get("year")]
    .filter(Boolean)
    .join(" ");
  return get("weekday") ? `${get("weekday")}، ${date}` : date;
}

export function activeRun(habit: Habit) {
  return habit.runs[habit.runs.length - 1];
}
export function elapsed(habit: Habit, now: number) {
  const seconds = Math.floor(
    Math.max(0, now - new Date(activeRun(habit).startedAt).getTime()) / 1000,
  );
  return {
    days: Math.floor(seconds / 86400),
    hours: Math.floor(seconds / 3600) % 24,
    minutes: Math.floor(seconds / 60) % 60,
    seconds: seconds % 60,
    progress: (seconds % 86400) / 86400,
  };
}
export function completedDays(run: Run, now: number) {
  return Math.floor(
    Math.max(
      0,
      Math.min(now, run.endedAt ? new Date(run.endedAt).getTime() : now) -
        new Date(run.startedAt).getTime(),
    ) / DAY,
  );
}
export function totalDays(habit: Habit, now: number) {
  return habit.runs.reduce((sum, run) => sum + completedDays(run, now), 0);
}
export function bestDays(habit: Habit, now: number) {
  return Math.max(0, ...habit.runs.map((run) => completedDays(run, now)));
}

// A tick belongs to the Tehran date on which a full 24-hour period finishes.
// Midnight alone never awards a completed day.
export function isCompletedOn(habit: Habit, key: string, now: number) {
  const dayStart = new Date(`${key}T00:00:00+03:30`).getTime();
  const dayEnd = dayStart + DAY;
  return habit.runs.some((run) => {
    const start = new Date(run.startedAt).getTime();
    const end = Math.min(
      now,
      run.endedAt ? new Date(run.endedAt).getTime() : now,
    );
    const n = Math.max(1, Math.ceil((dayStart - start) / DAY));
    const boundary = start + n * DAY;
    return boundary < dayEnd && boundary <= end;
  });
}
export function isCheckedToday(habit: Habit, now: number) {
  return activeRun(habit).checkins.includes(dateKey(now));
}
export function checkIn(habit: Habit, now: number): Habit {
  const key = dateKey(now);
  return {
    ...habit,
    runs: habit.runs.map((run, i) =>
      i === habit.runs.length - 1
        ? { ...run, checkins: [...new Set([...run.checkins, key])] }
        : run,
    ),
  };
}
export function restart(habit: Habit, now: number): Habit {
  const time = new Date(
    Math.max(now, Date.parse(activeRun(habit).startedAt)),
  ).toISOString();
  return {
    ...habit,
    runs: [
      ...habit.runs.map((run, i) =>
        i === habit.runs.length - 1 ? { ...run, endedAt: time } : run,
      ),
      { id: crypto.randomUUID(), startedAt: time, endedAt: null, checkins: [] },
    ],
  };
}
export function createHabit(input: HabitInput, now: number): Habit {
  const start = new Date(input.startedAt).getTime();
  if (!input.title.trim() || input.title.trim().length > 80)
    throw new Error("نام عادت را بین ۱ تا ۸۰ حرف بنویس.");
  if (!Number.isFinite(start) || start > now || start < Date.UTC(2000, 0, 1))
    throw new Error("زمان شروع باید در گذشته و بعد از سال ۲۰۰۰ باشد.");
  return {
    id: crypto.randomUUID(),
    title: input.title.trim(),
    reason: input.reason.trim(),
    icon: input.icon,
    color: input.color,
    goalDays: input.goalDays,
    createdAt: new Date(now).toISOString(),
    revision: 0,
    runs: [
      {
        id: crypto.randomUUID(),
        startedAt: new Date(start).toISOString(),
        endedAt: null,
        checkins: [],
      },
    ],
  };
}

export function monthDays(pivot: string) {
  const getMonth = (key: string) =>
    new Intl.DateTimeFormat("en-u-ca-persian", {
      timeZone: TIME_ZONE,
      year: "numeric",
      month: "numeric",
    }).format(dateFromKey(key));
  const month = getMonth(pivot);
  let first = pivot;
  let last = pivot;
  for (let i = 0; i < 31 && getMonth(addDays(first, -1)) === month; i++)
    first = addDays(first, -1);
  for (let i = 0; i < 31 && getMonth(addDays(last, 1)) === month; i++)
    last = addDays(last, 1);
  const leading = (dateFromKey(first).getUTCDay() + 1) % 7;
  const length =
    Math.round(
      (dateFromKey(last).getTime() - dateFromKey(first).getTime()) / DAY,
    ) + 1;
  return {
    first,
    last,
    leading,
    days: Array.from({ length }, (_, i) => addDays(first, i)),
  };
}

export function parseHabits(value: unknown): Habit[] {
  if (!Array.isArray(value) || value.length > 500)
    throw new Error("فایل پشتیبان معتبر نیست.");
  const ids = new Set<string>();
  return value.map((item: unknown) => {
    if (!item || typeof item !== "object")
      throw new Error("فایل پشتیبان معتبر نیست.");
    const h = item as Habit;
    if (
      typeof h.id !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(h.id) ||
      ids.has(h.id) ||
      typeof h.title !== "string" ||
      !h.title.trim() ||
      h.title.length > 80 ||
      typeof h.reason !== "string" ||
      h.reason.length > 500 ||
      !["cigarette", "phone", "moon", "coffee", "heart", "leaf"].includes(
        h.icon,
      ) ||
      !["green", "lavender", "peach", "blue"].includes(h.color) ||
      ![7, 14, 30, 60, 90].includes(h.goalDays) ||
      !Number.isFinite(Date.parse(h.createdAt)) ||
      !Array.isArray(h.runs) ||
      h.runs.length === 0 ||
      h.runs.length > 1000
    )
      throw new Error("اطلاعات یکی از عادت‌ها معتبر نیست.");
    ids.add(h.id);
    h.runs.forEach((run, i) => {
      const start = Date.parse(run.startedAt);
      const end = run.endedAt ? Date.parse(run.endedAt) : null;
      if (
        !Number.isFinite(start) ||
        start < Date.UTC(2000, 0, 1) ||
        start > Date.now() ||
        (i < h.runs.length - 1 && end === null) ||
        (i === h.runs.length - 1 && end !== null) ||
        (end !== null &&
          (!Number.isFinite(end) || end < start || end > Date.now())) ||
        (i > 0 && start < Date.parse(h.runs[i - 1].endedAt!)) ||
        !Array.isArray(run.checkins) ||
        run.checkins.some(
          (day) => typeof day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(day),
        )
      )
        throw new Error("زمان‌های فایل پشتیبان معتبر نیست.");
    });
    return {
      ...h,
      revision:
        Number.isInteger(h.revision) && h.revision >= 0 ? h.revision : 0,
    };
  });
}
