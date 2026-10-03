"use client";

import { useState, type FormEvent } from "react";
import {
  Check,
  ChevronRight,
  ChevronLeft,
  CalendarDays,
  ArrowLeft,
} from "lucide-react";
import {
  createHabit,
  dateKey,
  dateFromKey,
  addDays,
  monthDays,
  persianDate,
  fa,
  TIME_ZONE,
  type Habit,
  type HabitIcon,
  type HabitColor,
  type HabitInput,
} from "@/lib/habits";
import { Dialog, HabitSymbol } from "./ui";

const iconOptions: { name: HabitIcon; label: string }[] = [
  { name: "cigarette", label: "سیگار" },
  { name: "phone", label: "گوشی" },
  { name: "moon", label: "خواب" },
  { name: "coffee", label: "قهوه" },
  { name: "heart", label: "سلامت" },
  { name: "leaf", label: "رشد" },
];
const colorOptions: { name: HabitColor; label: string }[] = [
  { name: "green", label: "سبز" },
  { name: "lavender", label: "بنفش" },
  { name: "peach", label: "هلویی" },
  { name: "blue", label: "آبی" },
];
export type Template = { title: string; icon: HabitIcon; color: HabitColor };
export const templates: Template[] = [
  { title: "ترک سیگار", icon: "cigarette", color: "green" },
  { title: "کمتر سر زدن به گوشی", icon: "phone", color: "lavender" },
  { title: "کنار گذاشتن شب‌بیداری", icon: "moon", color: "peach" },
];

export function HabitForm({
  habit,
  template,
  onClose,
  onSave,
  saving,
  now,
}: {
  habit?: Habit;
  template?: Template;
  onClose: () => void;
  onSave: (habit: Habit) => Promise<boolean>;
  saving: boolean;
  now: number;
}) {
  const [title, setTitle] = useState(habit?.title ?? template?.title ?? "");
  const [reason, setReason] = useState(habit?.reason ?? "");
  const [icon, setIcon] = useState<HabitIcon>(
    habit?.icon ?? template?.icon ?? "leaf",
  );
  const [color, setColor] = useState<HabitColor>(
    habit?.color ?? template?.color ?? "green",
  );
  const [goalDays, setGoalDays] = useState(habit?.goalDays ?? 7);
  const [startNow, setStartNow] = useState(true);
  const [selectedDay, setSelectedDay] = useState(() => dateKey(Date.now()));
  const [pivot, setPivot] = useState(selectedDay);
  const [showCalendar, setShowCalendar] = useState(false);
  const [time, setTime] = useState(() =>
    new Intl.DateTimeFormat("en-GB", {
      timeZone: TIME_ZONE,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date()),
  );
  const [error, setError] = useState("");
  const month = monthDays(pivot);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const now = Date.now();
      const input: HabitInput = {
        title,
        reason,
        icon,
        color,
        goalDays,
        startedAt: startNow
          ? new Date(now).toISOString()
          : new Date(`${selectedDay}T${time}:00+03:30`).toISOString(),
      };
      const saved = habit
        ? {
            ...habit,
            title: title.trim(),
            reason: reason.trim(),
            icon,
            color,
            goalDays,
          }
        : createHabit(input, now);
      if (await onSave(saved)) onClose();
      else setError("ذخیره نشد. اتصال اینترنت را بررسی کن و دوباره تلاش کن.");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "زمان شروع را بررسی کن.",
      );
    }
  }

  return (
    <Dialog
      title={habit ? "ویرایش عادت" : "یک شروع تازه"}
      subtitle={
        habit
          ? "جزئیات را تغییر بده؛ مسیرت ادامه دارد."
          : "قدم اول، اسم گذاشتن روی چیزی است که می‌خواهی تغییر کند."
      }
      onClose={onClose}
    >
      <form onSubmit={submit} className="habit-form">
        <label className="field">
          چه عادتی را کنار می‌گذاری؟
          <input
            required
            autoFocus
            data-autofocus
            maxLength={80}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="مثلاً ترک سیگار"
          />
        </label>
        <label className="field">
          برای چه چیزی شروع می‌کنی؟ <span className="optional">اختیاری</span>
          <textarea
            rows={2}
            maxLength={500}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="مثلاً برای نفس‌های راحت‌تر و حال بهتر خودم"
          />
        </label>
        <div className="form-row">
          <fieldset className="icon-field">
            <legend>نشانه عادت</legend>
            <div className="icon-choices">
              {iconOptions.map((option) => (
                <button
                  key={option.name}
                  type="button"
                  aria-label={option.label}
                  aria-pressed={icon === option.name}
                  className={icon === option.name ? "selected" : ""}
                  onClick={() => setIcon(option.name)}
                >
                  <HabitSymbol name={option.name} size={21} />
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="color-field">
            <legend>رنگ</legend>
            <div className="color-choices">
              {colorOptions.map((option) => (
                <button
                  key={option.name}
                  type="button"
                  className={`color-swatch ${option.name} ${color === option.name ? "selected" : ""}`}
                  aria-label={option.label}
                  aria-pressed={color === option.name}
                  onClick={() => setColor(option.name)}
                >
                  {color === option.name && <Check size={15} />}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
        <fieldset>
          <legend>اولین مقصد کوچک</legend>
          <div className="goal-choices">
            {[7, 14, 30, 60, 90].map((days) => (
              <button
                type="button"
                key={days}
                className={goalDays === days ? "selected" : ""}
                onClick={() => setGoalDays(days)}
                aria-pressed={goalDays === days}
              >
                {fa(days)} روز
              </button>
            ))}
          </div>
        </fieldset>
        {!habit && (
          <fieldset>
            <legend>از چه زمانی؟</legend>
            <div className="start-choices">
              <button
                type="button"
                className={startNow ? "selected" : ""}
                onClick={() => setStartNow(true)}
                aria-pressed={startNow}
              >
                همین حالا
              </button>
              <button
                type="button"
                className={!startNow ? "selected" : ""}
                onClick={() => setStartNow(false)}
                aria-pressed={!startNow}
              >
                از قبل شروع کرده‌ام
              </button>
            </div>
            {!startNow && (
              <div className="start-details">
                <div className="form-row">
                  <div className="field">
                    <span>تاریخ شروع</span>
                    <button
                      type="button"
                      className="date-picker-button"
                      onClick={() => setShowCalendar(!showCalendar)}
                    >
                      <CalendarDays size={17} />
                      {persianDate(dateFromKey(selectedDay), {
                        year: "numeric",
                      })}
                    </button>
                  </div>
                  <label className="field">
                    ساعت شروع <span className="optional">تهران</span>
                    <input
                      required
                      type="time"
                      value={time}
                      onChange={(event) => setTime(event.target.value)}
                    />
                  </label>
                </div>
                {showCalendar && (
                  <div className="mini-calendar">
                    <div className="calendar-heading">
                      <button
                        type="button"
                        aria-label="ماه قبل"
                        className="icon-button"
                        onClick={() => setPivot(addDays(month.first, -1))}
                      >
                        <ChevronRight size={18} />
                      </button>
                      <strong>
                        {persianDate(dateFromKey(pivot), {
                          day: undefined,
                          year: "numeric",
                        })}
                      </strong>
                      <button
                        type="button"
                        aria-label="ماه بعد"
                        className="icon-button"
                        disabled={month.last >= dateKey(now)}
                        onClick={() => setPivot(addDays(month.last, 1))}
                      >
                        <ChevronLeft size={18} />
                      </button>
                    </div>
                    <div className="calendar-grid">
                      {["ش", "ی", "د", "س", "چ", "پ", "ج"].map((day) => (
                        <span className="calendar-weekday" key={day}>
                          {day}
                        </span>
                      ))}
                      {Array.from({ length: month.leading }, (_, i) => (
                        <span key={`blank-${i}`} />
                      ))}
                      {month.days.map((day) => (
                        <button
                          type="button"
                          key={day}
                          disabled={day > dateKey(now) || day < "2000-01-01"}
                          className={`calendar-day ${day === selectedDay ? "chosen" : ""}`}
                          onClick={() => {
                            setSelectedDay(day);
                            setShowCalendar(false);
                          }}
                          aria-label={persianDate(dateFromKey(day))}
                          aria-pressed={day === selectedDay}
                        >
                          {persianDate(dateFromKey(day), { month: undefined })}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </fieldset>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button className="button primary" disabled={saving} type="submit">
            {saving
              ? "در حال ذخیره…"
              : habit
                ? "ذخیره تغییرات"
                : "شروع مسیر من"}
            <ArrowLeft size={18} />
          </button>
          <button
            className="button subtle"
            type="button"
            onClick={onClose}
            disabled={saving}
          >
            انصراف
          </button>
        </div>
        <p className="form-footnote">
          قدم‌های کوچک هم قدم‌اند. لازم نیست عالی شروع کنی.
        </p>
      </form>
    </Dialog>
  );
}
