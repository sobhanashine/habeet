"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
} from "react";
import {
  ArrowLeft,
  ArrowUpLeft,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Download,
  Ellipsis,
  Heart,
  HelpCircle,
  House,
  Leaf,
  ListChecks,
  LogOut,
  Plus,
  RotateCcw,
  Settings,
  ShieldCheck,
  Sprout,
  Target,
  Trash2,
  Upload,
  WifiOff,
  X,
} from "lucide-react";
import { useHabits } from "@/lib/use-habits";
import {
  activeRun,
  addDays,
  bestDays,
  checkIn,
  completedDays,
  dateFromKey,
  dateKey,
  elapsed,
  fa,
  isCheckedToday,
  isCompletedOn,
  monthDays,
  padFa,
  parseHabits,
  persianDate,
  restart,
  totalDays,
  weekDays,
  type Habit,
} from "@/lib/habits";
import { supabase } from "@/lib/supabase";
import { AccountForm } from "./account-form";
import { HabitForm, templates, type Template } from "./habit-form";
import { Brand, Dialog, GrowingPlant, HabitSymbol } from "./ui";

type View = "today" | "habits" | "progress" | "settings";
const views = [
  { id: "today" as const, label: "امروز", icon: House },
  { id: "habits" as const, label: "عادت‌های من", icon: ListChecks },
  {
    id: "progress" as const,
    label: "مسیر من",
    icon: ChartNoAxesColumnIncreasing,
  },
  { id: "settings" as const, label: "تنظیمات", icon: Settings },
];
const dayNames = [
  "شنبه",
  "یکشنبه",
  "دوشنبه",
  "سه‌شنبه",
  "چهارشنبه",
  "پنجشنبه",
  "جمعه",
];
const quotes = [
  "هر بار که ادامه می‌دهی، به خودت می‌گویی: من می‌توانم.",
  "لازم نیست تمام مسیر را ببینی؛ قدم بعدی کافی است.",
  "یک روز سخت، تمام روزهای خوبت را پاک نمی‌کند.",
  "تغییر از همین تصمیم‌های کوچک شروع می‌شود.",
  "آرام پیش رفتن هم پیش رفتن است.",
  "امروز را زندگی کن؛ فردا نوبت خودش را دارد.",
  "هر شروع دوباره، نشانه اهمیت دادن به خودت است.",
];

const subscribeClock = (callback: () => void) => {
  const timer = setInterval(callback, 1000);
  return () => clearInterval(timer);
};
const clockSnapshot = () => Math.floor(Date.now() / 1000) * 1000;
const serverClock = () => 0;
const subscribeOnline = (callback: () => void) => {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
};
type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};

function HabitCard({
  habit,
  now,
  onDetail,
  onCheck,
  saving,
}: {
  habit: Habit;
  now: number;
  onDetail: () => void;
  onCheck: () => void;
  saving: boolean;
}) {
  const timer = elapsed(habit, now);
  const checked = isCheckedToday(habit, now);
  const days = weekDays(now);
  const reached = timer.days >= habit.goalDays;
  return (
    <article className={`habit-card ${habit.color}`}>
      <div className="habit-card-heading">
        <span className="habit-symbol">
          <HabitSymbol name={habit.icon} />
        </span>
        <div className="habit-title">
          <h3>
            <button onClick={onDetail}>{habit.title}</button>
          </h3>
          <p>از {persianDate(activeRun(habit).startedAt)}</p>
        </div>
        <button
          className="icon-button more-button"
          onClick={onDetail}
          aria-label={`جزئیات ${habit.title}`}
        >
          <Ellipsis size={22} />
        </button>
      </div>
      <div className="day-counter">
        <span className="counter-number">{fa(timer.days)}</span>
        <span className="counter-unit">
          روز
          <br />
          <small>از شروع این مسیر</small>
        </span>
        <span className="counter-leaf">
          <Leaf size={26} strokeWidth={1.3} />
        </span>
      </div>
      <div
        className="time-counter"
        aria-label={`${fa(timer.days)} روز و ${fa(timer.hours)} ساعت و ${fa(timer.minutes)} دقیقه و ${fa(timer.seconds)} ثانیه`}
      >
        <span>
          <b>{padFa(timer.hours)}</b> ساعت
        </span>
        <i>:</i>
        <span>
          <b>{padFa(timer.minutes)}</b> دقیقه
        </span>
        <i>:</i>
        <span>
          <b>{padFa(timer.seconds)}</b> ثانیه
        </span>
      </div>
      <div className="card-week" aria-label="روزهای این هفته">
        {days.map((day, i) => {
          const complete = isCompletedOn(habit, day, now);
          const today = day === dateKey(now);
          return (
            <div
              key={day}
              className={`card-day ${complete ? "complete" : ""} ${today ? "today" : ""}`}
              title={`${dayNames[i]}، ${persianDate(dateFromKey(day))}: ${complete ? "یک روز کامل" : today ? "امروز، در مسیر" : "روز کامل ثبت نشده"}`}
            >
              <span>{dayNames[i].slice(0, 1)}</span>
              <i>
                {complete ? (
                  <Check size={15} strokeWidth={2.5} />
                ) : today ? (
                  <span className="day-dot" />
                ) : (
                  <span className="empty-dot" />
                )}
              </i>
            </div>
          );
        })}
      </div>
      <div className="habit-goal">
        <div>
          <span>
            {reached
              ? "به مقصد کوچکت رسیدی!"
              : `مقصد بعدی: ${fa(habit.goalDays)} روز`}
          </span>
          <span>
            {fa(Math.min(timer.days, habit.goalDays))}{" "}
            <small>/ {fa(habit.goalDays)}</small>
          </span>
        </div>
        <div
          className="progress-track"
          role="progressbar"
          aria-label={`هدف ${habit.title}`}
          aria-valuemin={0}
          aria-valuemax={habit.goalDays}
          aria-valuenow={Math.min(timer.days, habit.goalDays)}
        >
          <span
            style={{
              width: `${Math.min(100, (timer.days / habit.goalDays) * 100)}%`,
            }}
          />
        </div>
      </div>
      <button
        className={`checkin-button ${checked ? "checked" : ""}`}
        disabled={checked || saving}
        onClick={onCheck}
      >
        {checked ? (
          <CheckCheck size={18} />
        ) : (
          <span className="checkin-circle" />
        )}
        {checked ? "پایبندی امروزت ثبت شد" : "امروز پایبند بودم"}
        {!checked && <span className="checkin-plus">+</span>}
      </button>
    </article>
  );
}

function WeeklyOverview({ habits, now }: { habits: Habit[]; now: number }) {
  const [offset, setOffset] = useState(0);
  const days = weekDays(now, offset);
  const countFor = (key: string) =>
    habits.filter((habit) => isCompletedOn(habit, key, now)).length;
  const count = days.reduce((sum, key) => sum + countFor(key), 0);
  return (
    <section className="panel weekly-panel">
      <div className="panel-heading">
        <div>
          <h2>قدم‌های این هفته</h2>
          <p>
            {offset === 0
              ? "هر تیک، یک روز کامل برای یک عادت"
              : `${persianDate(dateFromKey(days[0]))} تا ${persianDate(dateFromKey(days[6]))}`}
          </p>
        </div>
        <div className="week-controls">
          <button
            className="icon-button"
            aria-label="هفته قبل"
            onClick={() => setOffset(offset - 1)}
          >
            <ChevronRight size={17} />
          </button>
          <button
            className="icon-button"
            aria-label="هفته بعد"
            disabled={offset === 0}
            onClick={() => setOffset(offset + 1)}
          >
            <ChevronLeft size={17} />
          </button>
        </div>
      </div>
      <div className="week-overview">
        {days.map((key, i) => {
          const count = countFor(key);
          return (
            <div
              key={key}
              className={`${key === dateKey(now) ? "current" : ""} ${key > dateKey(now) ? "future" : ""}`}
            >
              <span className="week-day-name">{dayNames[i]}</span>
              <span className={`week-circle ${count ? "done" : ""}`}>
                {count ? (
                  <Check size={22} />
                ) : (
                  persianDate(dateFromKey(key), { month: undefined })
                )}
              </span>
              <small>
                {count
                  ? `${fa(count)} تیک`
                  : key === dateKey(now)
                    ? "امروز"
                    : "—"}
              </small>
            </div>
          );
        })}
      </div>
      <div className="week-footer">
        <span className="legend-dot" />
        <span>
          این هفته <strong>{fa(count)} روز کامل</strong> ثبت شده
        </span>
        {offset !== 0 && (
          <button className="text-button" onClick={() => setOffset(0)}>
            هفته جاری
          </button>
        )}
      </div>
    </section>
  );
}

function ProgressView({ habits, now }: { habits: Habit[]; now: number }) {
  const [pivot, setPivot] = useState(() => dateKey(Date.now()));
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);
  const visible =
    filter === "all" ? habits : habits.filter((habit) => habit.id === filter);
  const month = monthDays(pivot);
  const total = habits.reduce((sum, habit) => sum + totalDays(habit, now), 0);
  const best = Math.max(0, ...habits.map((habit) => bestDays(habit, now)));
  const achieved = habits.filter(
    (habit) => bestDays(habit, now) >= habit.goalDays,
  ).length;
  const countFor = (key: string) =>
    visible.filter((habit) => isCompletedOn(habit, key, now)).length;
  return (
    <>
      <div className="stats-grid">
        <div className="stat-box">
          <span className="stat-icon">
            <CheckCheck size={21} />
          </span>
          <div>
            <strong>
              {fa(total)} <small>روز</small>
            </strong>
            <span>مجموع روزهای کامل</span>
          </div>
        </div>
        <div className="stat-box">
          <span className="stat-icon lavender">
            <ChartNoAxesColumnIncreasing size={21} />
          </span>
          <div>
            <strong>
              {fa(best)} <small>روز</small>
            </strong>
            <span>بهترین مسیر پیوسته</span>
          </div>
        </div>
        <div className="stat-box">
          <span className="stat-icon peach">
            <Target size={21} />
          </span>
          <div>
            <strong>
              {fa(achieved)} <small>هدف</small>
            </strong>
            <span>مقصدهای کوچک رسیده</span>
          </div>
        </div>
      </div>
      <section className="panel month-panel">
        <div className="panel-heading">
          <div>
            <h2>تقویم مسیر تو</h2>
            <p>روزهای کامل در تقویم شمسی، با ساعت تهران</p>
          </div>
          <select
            className="habit-filter"
            aria-label="انتخاب عادت در تقویم"
            value={filter}
            onChange={(event) => {
              setFilter(event.target.value);
              setSelected(null);
            }}
          >
            <option value="all">همه عادت‌ها</option>
            {habits.map((habit) => (
              <option value={habit.id} key={habit.id}>
                {habit.title}
              </option>
            ))}
          </select>
        </div>
        <div className="calendar-heading">
          <button
            className="icon-button"
            aria-label="ماه قبل"
            onClick={() => {
              setPivot(addDays(month.first, -1));
              setSelected(null);
            }}
          >
            <ChevronRight size={20} />
          </button>
          <h3>
            {persianDate(dateFromKey(pivot), {
              day: undefined,
              year: "numeric",
            })}
          </h3>
          <button
            className="icon-button"
            aria-label="ماه بعد"
            disabled={month.last >= dateKey(now)}
            onClick={() => {
              setPivot(addDays(month.last, 1));
              setSelected(null);
            }}
          >
            <ChevronLeft size={20} />
          </button>
        </div>
        <div className="calendar-grid large">
          {dayNames.map((day) => (
            <span className="calendar-weekday" key={day}>
              {day}
            </span>
          ))}
          {Array.from({ length: month.leading }, (_, i) => (
            <span key={`blank-${i}`} />
          ))}
          {month.days.map((key) => {
            const count = countFor(key);
            return (
              <button
                key={key}
                className={`calendar-day ${count ? "done" : ""} ${key === dateKey(now) ? "current" : ""} ${selected === key ? "chosen" : ""}`}
                disabled={key > dateKey(now)}
                aria-label={`${persianDate(dateFromKey(key))}، ${fa(count)} روز کامل`}
                aria-pressed={selected === key}
                onClick={() => setSelected(key)}
              >
                <span>
                  {persianDate(dateFromKey(key), { month: undefined })}
                </span>
                {count ? (
                  <small>
                    <Check size={12} />
                    {fa(count)}
                  </small>
                ) : (
                  <small className="calendar-empty">·</small>
                )}
              </button>
            );
          })}
        </div>
        <div className="calendar-legend">
          <span>
            <i className="legend-dot" />
            روز کامل
          </span>
          <span>
            <i className="legend-outline" />
            امروز
          </span>
          <small>تیک‌ها بعد از هر ۲۴ ساعت کامل می‌شوند.</small>
        </div>
        {selected && (
          <div className="selected-day">
            <strong>
              {persianDate(dateFromKey(selected), { weekday: "long" })}
            </strong>
            {countFor(selected) ? (
              visible
                .filter((habit) => isCompletedOn(habit, selected, now))
                .map((habit) => (
                  <span key={habit.id}>
                    <Check size={15} />
                    {habit.title}
                  </span>
                ))
            ) : (
              <span>روز کاملی برای این تاریخ ثبت نشده است.</span>
            )}
          </div>
        )}
      </section>
      <section className="panel progress-list">
        <div className="panel-heading">
          <div>
            <h2>هر مسیر، داستان خودش را دارد</h2>
            <p>شروع دوباره، روزهای قبلی را پاک نمی‌کند.</p>
          </div>
          <Sprout size={23} />
        </div>
        {habits.length ? (
          habits.map((habit) => (
            <div className="progress-row" key={habit.id}>
              <span className={`habit-symbol ${habit.color}`}>
                <HabitSymbol name={habit.icon} />
              </span>
              <div>
                <strong>{habit.title}</strong>
                <small>
                  {fa(habit.runs.length)} تلاش · {fa(totalDays(habit, now))} روز
                  کامل در مجموع
                </small>
              </div>
              <span className="row-number">
                {fa(elapsed(habit, now).days)}
                <small>روز در مسیر فعلی</small>
              </span>
            </div>
          ))
        ) : (
          <p className="muted empty-progress">
            با ثبت اولین عادت، مسیرت اینجا شکل می‌گیرد.
          </p>
        )}
      </section>
    </>
  );
}

export function HabeetApp() {
  const store = useHabits();
  const now = useSyncExternalStore(subscribeClock, clockSnapshot, serverClock);
  const online = useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
  const [view, setView] = useState<View>("today");
  const [form, setForm] = useState<{
    habit?: Habit;
    template?: Template;
  } | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<"restart" | "delete" | null>(null);
  const [account, setAccount] = useState(false);
  const [help, setHelp] = useState(false);
  const [toast, setToast] = useState("");
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(
    null,
  );
  const [installed, setInstalled] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const detail = store.habits.find((habit) => habit.id === detailId);
  const titles = {
    today: "هر روز، کمی آزادتر.",
    habits: "عادت‌هایی که تغییر می‌دهی.",
    progress: "قدم‌های کوچک، یک مسیر بزرگ.",
    settings: "این گوشه، برای خودت.",
  };
  const descriptions = {
    today: "قرار نیست بی‌نقص باشی. فقط امروز، یک قدم بردار.",
    habits: "یکی‌یکی، با صبر و با مهربانی با خودت.",
    progress: "ببین از اولین قدم تا امروز چقدر پیش آمده‌ای.",
    settings: "حساب، پشتیبان و همراه داشتن مسیرت.",
  };

  function changeView(nextView: View) {
    setView(nextView);
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production")
      void navigator.serviceWorker
        .register("/sw.js")
        .then(async (registration) => {
          await navigator.serviceWorker.ready;
          const assets = performance
            .getEntriesByType("resource")
            .map((entry) => entry.name)
            .filter((url) =>
              url.startsWith(`${window.location.origin}/_next/static/`),
            );
          registration.active?.postMessage({ type: "CACHE_ASSETS", assets });
        })
        .catch(() => {});
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPrompt);
    };
    const installedHandler = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (!supabase) return;
    if (new URLSearchParams(window.location.search).get("recovery") === "1")
      queueMicrotask(() => setAccount(true));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setAccount(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function save(habit: Habit) {
    const existing = store.habits.some((item) => item.id === habit.id);
    const success = await store.save(habit);
    if (success)
      setToast(
        existing
          ? "تغییرات ذخیره شد."
          : "اولین قدم را برداشتی. مسیرت شروع شد 🌱",
      );
    return success;
  }
  async function confirmAction() {
    if (!detail) return;
    const result =
      confirm === "delete"
        ? await store.remove(detail)
        : await store.save(restart(detail, now));
    if (result) {
      setToast(
        confirm === "delete"
          ? "عادت حذف شد."
          : "یک شروع تازه. روزهای قبلی‌ات محفوظ است.",
      );
      setConfirm(null);
      setDetailId(null);
    }
  }
  function exportBackup() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            app: "habeet",
            version: 1,
            exportedAt: new Date().toISOString(),
            habits: store.habits,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `habeet-${dateKey(Date.now())}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setToast("فایل پشتیبان آماده شد.");
  }
  async function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      if (file.size > 5_000_000)
        throw new Error("فایل پشتیبان باید کوچک‌تر از ۵ مگابایت باشد.");
      const data = JSON.parse(await file.text());
      if (data.app !== "habeet" || data.version !== 1)
        throw new Error("فایل پشتیبان هبیت را انتخاب کن.");
      const items = parseHabits(data.habits);
      if (await store.importHabits(items))
        setToast(
          "عادت‌های تازه از پشتیبان اضافه شدند. عادت‌های موجود حفظ شدند.",
        );
    } catch (cause) {
      setToast(
        cause instanceof Error ? cause.message : "فایل پشتیبان خوانده نشد.",
      );
    }
  }
  async function install() {
    if (!installPrompt) {
      setHelp(true);
      return;
    }
    await installPrompt.prompt();
    if ((await installPrompt.userChoice).outcome === "accepted")
      setInstalled(true);
    setInstallPrompt(null);
  }
  async function signOut() {
    const { error } = await supabase!.auth.signOut();
    if (error) setToast("خروج انجام نشد. دوباره تلاش کن.");
    else setToast("از حساب خارج شدی. اطلاعاتت در حساب محفوظ است.");
  }

  const quote = quotes[now ? dateFromKey(dateKey(now)).getUTCDay() : 0];
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        رفتن به محتوا
      </a>
      <aside className="sidebar">
        <Brand />
        <div className="sidebar-label">فضای شخصی تو</div>
        <nav aria-label="منوی اصلی">
          {views.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              className={`nav-item ${view === id ? "active" : ""}`}
              aria-current={view === id ? "page" : undefined}
              onClick={() => changeView(id)}
            >
              <Icon size={20} strokeWidth={1.7} />
              <span>{label}</span>
              {id === "habits" && store.habits.length > 0 && (
                <small>{fa(store.habits.length)}</small>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <Sprout size={24} strokeWidth={1.5} />
            <p>
              قرار کوچک تو با خودت،
              <br />
              هر روز تازه می‌شود.
            </p>
            <span>تو از پس قدم بعدی برمی‌آیی.</span>
          </div>
          <button className="help-link" onClick={() => setHelp(true)}>
            <HelpCircle size={18} />
            آشنایی با هبیت
            <ArrowUpLeft size={16} />
          </button>
          <button
            className="profile-button"
            onClick={() =>
              store.user ? changeView("settings") : setAccount(true)
            }
          >
            <span className="avatar">
              <Heart size={18} />
            </span>
            <span>
              <strong>{store.user ? "مسیر شخصی من" : "سلام، دوست من"}</strong>
              <small>
                {store.user ? "حساب متصل است" : "خوش آمدی به مسیر خودت"}
              </small>
            </span>
            <ChevronLeft size={17} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="mobile-brand">
            <Brand compact />
          </div>
          <div className="date-label">
            <CalendarDays size={16} />
            <span>
              {now
                ? persianDate(now, { weekday: "long", year: "numeric" })
                : "یک روز تازه"}
            </span>
          </div>
          <button
            className="cloud-status"
            onClick={() =>
              store.user ? changeView("settings") : setAccount(true)
            }
          >
            {!online ? (
              <WifiOff size={15} />
            ) : store.user ? (
              <Cloud size={16} />
            ) : (
              <ShieldCheck size={16} />
            )}
            <span>
              {!online
                ? "آفلاین"
                : store.user
                  ? "حساب شخصی"
                  : "ذخیره روی این دستگاه"}
            </span>
            <span className={`status-dot ${online ? "" : "offline"}`} />
          </button>
        </header>
        <main id="main" className="main-content">
          <div className="page-heading">
            <div>
              <span className="eyebrow">
                {view === "today"
                  ? "امروز، فرصت تازه توست"
                  : views.find((item) => item.id === view)?.label}
              </span>
              <h1>{titles[view]}</h1>
              <p>{descriptions[view]}</p>
            </div>
            {view !== "settings" && (
              <button
                className="button primary new-habit"
                disabled={store.loading || !now}
                onClick={() => setForm({})}
              >
                <Plus size={19} />
                عادت جدید
              </button>
            )}
          </div>
          {store.error && (
            <div className="notice error" role="alert">
              <span>{store.error}</span>
              <button
                className="text-button"
                onClick={() => void store.reload()}
              >
                تلاش دوباره
              </button>
              <button
                className="icon-button"
                aria-label="بستن پیام"
                onClick={store.clearError}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {!online && (
            <div className="notice">
              <WifiOff size={17} />
              <span>
                {store.user
                  ? "نسخه ذخیره‌شده را می‌بینی. برای تغییر عادت‌ها در حساب، به اینترنت وصل شو."
                  : "می‌توانی ادامه بدهی؛ عادت‌ها روی همین دستگاه ذخیره می‌شوند."}
              </span>
            </div>
          )}
          {(view === "today" || view === "habits") && (
            <>
              {view === "today" && (
                <section className="motivation-banner">
                  <div className="banner-copy">
                    <span className="banner-eyebrow">
                      <span className="tiny-leaf">
                        <Leaf size={15} />
                      </span>
                      برای خودت، برای حال بهترت
                    </span>
                    <h2>تغییر، از یک روز شروع می‌شود.</h2>
                    <p>
                      همین امروز کافی است.
                      <br className="mobile-break" /> فردا را فردا ادامه
                      می‌دهیم.
                    </p>
                    <div className="banner-tag">
                      <span className="small-check">
                        <Check size={12} />
                      </span>
                      قدم‌های کوچک هم حساب می‌شوند.
                    </div>
                  </div>
                  <GrowingPlant />
                </section>
              )}
              <section className="habits-section">
                <div className="section-heading">
                  <h2>
                    مسیرهای من{" "}
                    <span className="count-badge">
                      {fa(store.habits.length)}
                    </span>
                  </h2>
                  <span className="section-caption">
                    <span className="legend-dot" />
                    {store.habits.length
                      ? "هر روز، یک قدم رو به جلو"
                      : "از یک عادت شروع کن"}
                  </span>
                </div>
                {store.loading || !now ? (
                  <div className="habits-grid">
                    <div className="skeleton-card" />
                    <div className="skeleton-card" />
                    <div className="skeleton-card" />
                  </div>
                ) : store.habits.length ? (
                  <div className="habits-grid">
                    {store.habits.map((habit) => (
                      <HabitCard
                        key={habit.id}
                        habit={habit}
                        now={now}
                        saving={store.saving}
                        onDetail={() => {
                          setDetailId(habit.id);
                          setConfirm(null);
                        }}
                        onCheck={() =>
                          void store
                            .save(checkIn(habit, Date.now()))
                            .then((success) => {
                              if (success)
                                setToast(
                                  "پایبندی امروزت ثبت شد. همین قدم کوچک ارزش دارد.",
                                );
                            })
                        }
                      />
                    ))}
                    <button
                      className="add-habit-card"
                      onClick={() => setForm({})}
                    >
                      <span>
                        <Plus size={25} />
                      </span>
                      <strong>یک قدم تازه</strong>
                      <small>عادت دیگری را به مسیرت اضافه کن</small>
                    </button>
                  </div>
                ) : (
                  <div className="empty-habits">
                    <div className="empty-habits-copy">
                      <span className="empty-sprout">
                        <Sprout size={30} strokeWidth={1.4} />
                      </span>
                      <h3>اینجا، جای یک شروع تازه است.</h3>
                      <p>
                        آنچه می‌خواهی کنار بگذاری را بنویس.
                        <br />
                        ما روزها را می‌شماریم؛ تو قدم‌ها را برمی‌داری.
                      </p>
                      <button
                        className="button primary"
                        onClick={() => setForm({})}
                      >
                        اولین عادتم را اضافه می‌کنم
                        <ArrowLeft size={17} />
                      </button>
                    </div>
                    <div className="start-suggestions">
                      <span>یک پیشنهاد برای شروع</span>
                      {templates.map((template) => (
                        <button
                          key={template.icon}
                          onClick={() => setForm({ template })}
                        >
                          <span className={`habit-symbol ${template.color}`}>
                            <HabitSymbol name={template.icon} size={19} />
                          </span>
                          <strong>{template.title}</strong>
                          <Plus size={18} />
                        </button>
                      ))}
                      <p>یا هر عادت دیگری که خودت انتخاب می‌کنی.</p>
                    </div>
                  </div>
                )}
              </section>
              {view === "today" && now > 0 && (
                <div className="lower-grid">
                  <WeeklyOverview habits={store.habits} now={now} />
                  <section className="daily-note">
                    <span className="note-eyebrow">
                      <Heart size={16} />
                      یک یادآوری کوچک
                    </span>
                    <span className="quote-mark">“</span>
                    <p>{quote}</p>
                    <span className="note-footer">با خودت مهربان باش.</span>
                    <span className="note-decoration">
                      <Sprout size={57} strokeWidth={1} />
                    </span>
                  </section>
                </div>
              )}
            </>
          )}
          {view === "progress" && now > 0 && (
            <ProgressView habits={store.habits} now={now} />
          )}
          {view === "settings" && (
            <div className="settings-grid">
              <section className="panel settings-panel">
                <div className="settings-icon">
                  <Cloud size={24} />
                </div>
                <h2>مسیرت را همراه داشته باش</h2>
                <p>
                  {store.user
                    ? "عادت‌ها در حساب شخصی تو ذخیره می‌شوند. روی دستگاه دیگر با همین حساب وارد شو."
                    : "فعلاً عادت‌ها روی این مرورگر ذخیره می‌شوند. با ورود به حساب، از دستگاه‌های دیگر هم ادامه بده."}
                </p>
                {store.user ? (
                  <>
                    <span className="account-email" dir="ltr">
                      {store.user.email}
                    </span>
                    {store.guestCount > 0 && (
                      <button
                        className="button primary"
                        disabled={store.saving}
                        onClick={() =>
                          void store.importGuest().then((success) => {
                            if (success)
                              setToast(
                                "عادت‌های این دستگاه به حساب اضافه شدند.",
                              );
                          })
                        }
                      >
                        انتقال {fa(store.guestCount)} عادت این دستگاه
                        <ArrowLeft size={17} />
                      </button>
                    )}
                    <button
                      className="button secondary"
                      onClick={() => void store.reload()}
                      disabled={store.loading || store.saving}
                    >
                      <RotateCcw size={16} />
                      تازه‌سازی اطلاعات حساب
                    </button>
                    <button
                      className="text-button"
                      disabled={store.saving}
                      onClick={() => void signOut()}
                    >
                      <LogOut size={16} />
                      خروج از حساب
                    </button>
                  </>
                ) : (
                  <button
                    className="button primary"
                    onClick={() => setAccount(true)}
                    disabled={!store.cloudEnabled}
                  >
                    ورود یا ساخت حساب
                    <ArrowLeft size={17} />
                  </button>
                )}
                {!store.cloudEnabled && (
                  <p className="muted">اتصال حساب در حال آماده‌سازی است.</p>
                )}
              </section>
              <section className="panel settings-panel">
                <div className="settings-icon lavender">
                  <Download size={23} />
                </div>
                <h2>یک نسخه برای خودت</h2>
                <p>
                  از عادت‌ها و سابقه‌ها پشتیبان بگیر. هنگام بازیابی، عادت‌های
                  تازه اضافه می‌شوند و عادت‌های موجود حفظ می‌شوند.
                </p>
                <div className="settings-actions">
                  <button
                    className="button secondary"
                    onClick={exportBackup}
                    disabled={store.loading}
                  >
                    <Download size={17} />
                    دریافت پشتیبان
                  </button>
                  <button
                    className="button secondary"
                    onClick={() => fileInput.current?.click()}
                    disabled={store.saving || store.loading}
                  >
                    <Upload size={17} />
                    بازیابی پشتیبان
                  </button>
                  <input
                    ref={fileInput}
                    type="file"
                    accept="application/json,.json"
                    hidden
                    onChange={(event) => void importBackup(event)}
                  />
                </div>
                <small>این فایل شخصی است؛ در جای مطمئن نگهش دار.</small>
              </section>
              <section className="panel settings-panel">
                <div className="settings-icon peach">
                  <House size={23} />
                </div>
                <h2>یک جای کوچک روی گوشی</h2>
                <p>
                  هبیت را به صفحه اصلی گوشی اضافه کن تا مسیرت فقط یک لمس با تو
                  فاصله داشته باشد.
                </p>
                <button
                  className="button secondary"
                  onClick={() => void install()}
                  disabled={installed}
                >
                  <Plus size={17} />
                  {installed
                    ? "به صفحه اصلی اضافه شد"
                    : installPrompt
                      ? "افزودن به صفحه اصلی"
                      : "راهنمای افزودن به صفحه اصلی"}
                </button>
                <small>
                  روزها از زمان شروع حساب می‌شوند، حتی وقتی اپ بسته است.
                </small>
              </section>
              <section className="panel settings-panel privacy-panel">
                <div className="settings-icon">
                  <ShieldCheck size={23} />
                </div>
                <h2>فضای شخصی، انتخاب شخصی</h2>
                <p>
                  عادت‌ها و دلیل‌هایت فقط برای خودت هستند. هبیت قابلیت هوش
                  مصنوعی و تبلیغات ندارد.
                </p>
                <button className="text-button" onClick={() => setHelp(true)}>
                  هبیت چطور کار می‌کند؟
                  <ArrowLeft size={16} />
                </button>
              </section>
            </div>
          )}
          <footer className="main-footer">
            <span>
              <Sprout size={14} />
              آرام، پیوسته، برای خودت.
            </span>
            <span>
              هبیت<span className="footer-dot">·</span>هر روز، یک قدم
            </span>
          </footer>
        </main>
      </div>
      <nav className="mobile-nav" aria-label="منوی موبایل">
        {views.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            className={view === id ? "active" : ""}
            aria-current={view === id ? "page" : undefined}
            onClick={() => changeView(id)}
          >
            <Icon size={21} strokeWidth={1.7} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      {form && (
        <HabitForm
          key={form.habit?.id ?? "new"}
          habit={form.habit}
          template={form.template}
          onClose={() => setForm(null)}
          onSave={save}
          saving={store.saving}
          now={now}
        />
      )}
      {detail && !form && (
        <Dialog
          title={
            confirm === "restart"
              ? "یک بار دیگر، برای خودت"
              : confirm === "delete"
                ? "حذف این عادت"
                : detail.title
          }
          subtitle={
            confirm
              ? undefined
              : `از ${persianDate(activeRun(detail).startedAt, { year: "numeric" })}`
          }
          onClose={() => {
            setDetailId(null);
            setConfirm(null);
          }}
        >
          {confirm ? (
            <div className="confirm-content">
              <span
                className={`confirm-icon ${confirm === "delete" ? "danger" : ""}`}
              >
                {confirm === "delete" ? (
                  <Trash2 size={28} />
                ) : (
                  <Sprout size={30} />
                )}
              </span>
              <p>
                {confirm === "delete"
                  ? `«${detail.title}» و همه سابقه‌اش از فهرستت حذف می‌شود. قبل از حذف می‌توانی از تنظیمات پشتیبان بگیری.`
                  : "شمارنده از همین حالا دوباره شروع می‌شود. روزهای کامل و تلاش‌های قبلی در سابقه‌ات می‌مانند."}
              </p>
              <div className="form-actions">
                <button
                  className={`button ${confirm === "delete" ? "danger-button" : "primary"}`}
                  disabled={store.saving}
                  onClick={() => void confirmAction()}
                >
                  {store.saving
                    ? "در حال ذخیره…"
                    : confirm === "delete"
                      ? "حذف عادت"
                      : "دوباره شروع می‌کنم"}
                </button>
                <button
                  className="button subtle"
                  onClick={() => setConfirm(null)}
                  disabled={store.saving}
                >
                  برگشت
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className={`detail-counter ${detail.color}`}>
                <HabitSymbol name={detail.icon} size={27} />
                <strong>
                  {fa(elapsed(detail, now).days)}
                  <small>روز</small>
                </strong>
                <span>
                  {padFa(elapsed(detail, now).hours)} ساعت و{" "}
                  {padFa(elapsed(detail, now).minutes)} دقیقه
                </span>
              </div>
              {detail.reason && (
                <div className="my-reason">
                  <span>
                    <Heart size={15} />
                    برای این شروع کردم
                  </span>
                  <p>{detail.reason}</p>
                </div>
              )}
              <div className="detail-stats">
                <div>
                  <strong>{fa(bestDays(detail, now))}</strong>
                  <span>بهترین مسیر، روز</span>
                </div>
                <div>
                  <strong>{fa(totalDays(detail, now))}</strong>
                  <span>روز کامل در مجموع</span>
                </div>
                <div>
                  <strong>{fa(detail.runs.length)}</strong>
                  <span>تلاش برای خودم</span>
                </div>
              </div>
              <h3 className="history-title">سابقه مسیر</h3>
              <div className="run-history">
                {[...detail.runs].reverse().map((run, i) => (
                  <div key={run.id}>
                    <span
                      className={`history-dot ${!run.endedAt ? "active" : ""}`}
                    />
                    <div>
                      <strong>
                        {run.endedAt
                          ? `تلاش ${fa(detail.runs.length - i)}`
                          : "مسیر فعلی"}
                      </strong>
                      <small>
                        {persianDate(run.startedAt)} تا{" "}
                        {run.endedAt ? persianDate(run.endedAt) : "امروز"}
                      </small>
                    </div>
                    <span>{fa(completedDays(run, now))} روز</span>
                  </div>
                ))}
              </div>
              <div className="detail-actions">
                <button
                  className="button secondary"
                  onClick={() => setForm({ habit: detail })}
                >
                  ویرایش عادت
                </button>
                <button
                  className="button secondary"
                  onClick={() => setConfirm("restart")}
                >
                  <RotateCcw size={16} />
                  شروع دوباره
                </button>
                <button
                  className="icon-button delete-button"
                  aria-label="حذف عادت"
                  onClick={() => setConfirm("delete")}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </>
          )}
        </Dialog>
      )}
      {account && <AccountForm onClose={() => setAccount(false)} />}
      {help && (
        <Dialog
          title="هر روز، یک قدم"
          subtitle="هبیت، دفتر کوچک مسیر توست."
          onClose={() => setHelp(false)}
        >
          <div className="help-content">
            <div>
              <span>
                <Plus size={20} />
              </span>
              <p>
                <strong>با یک عادت شروع کن.</strong> اسمش را بنویس، زمان شروع را
                انتخاب کن و یک هدف کوچک بگذار.
              </p>
            </div>
            <div>
              <span>
                <Check size={20} />
              </span>
              <p>
                <strong>روزها خودشان شمرده می‌شوند.</strong> هر ۲۴ ساعت کامل یک
                تیک در تقویم می‌گذارد. دکمه پایبندی فقط همراهی امروزت را ثبت
                می‌کند.
              </p>
            </div>
            <div>
              <span>
                <RotateCcw size={20} />
              </span>
              <p>
                <strong>اگر لازم شد، دوباره شروع کن.</strong> از جزئیات عادت
                «شروع دوباره» را بزن؛ سابقه‌ات حفظ می‌شود.
              </p>
            </div>
            <div>
              <span>
                <House size={20} />
              </span>
              <p>
                <strong>روی صفحه اصلی همراهت باشد.</strong> در آیفون: Share ←
                Add to Home Screen. در اندروید: منوی مرورگر ← نصب برنامه یا
                افزودن به صفحه اصلی.
              </p>
            </div>
            <p className="help-note">
              هبیت زمان را پیگیری می‌کند؛ پایبندی واقعی را خودت ثبت می‌کنی.
            </p>
          </div>
          <button
            className="button primary full"
            onClick={() => setHelp(false)}
          >
            فهمیدم، شروع کنیم
            <ArrowLeft size={17} />
          </button>
        </Dialog>
      )}
      {toast && (
        <div className="toast" role="status">
          <span className="toast-check">
            <Check size={17} />
          </span>
          {toast}
          <button
            className="icon-button"
            aria-label="بستن پیام"
            onClick={() => setToast("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
