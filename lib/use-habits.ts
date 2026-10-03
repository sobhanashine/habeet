"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { GUEST_KEY, Habit, parseHabits } from "./habits";
import { supabase } from "./supabase";

function keyFor(user: User | null) {
  return user ? `habeet:${user.id}:v1` : GUEST_KEY;
}
function readCache(key: string) {
  const raw = localStorage.getItem(key);
  return raw ? parseHabits(JSON.parse(raw)) : [];
}
type HabitRow = {
  id: string;
  title: string;
  reason: string;
  icon: Habit["icon"];
  color: Habit["color"];
  goal_days: number;
  runs: Habit["runs"];
  created_at: string;
  revision: number;
};
function fromRow(row: HabitRow): Habit {
  return {
    id: row.id,
    title: row.title,
    reason: row.reason,
    icon: row.icon,
    color: row.color,
    goalDays: row.goal_days,
    runs: row.runs,
    createdAt: row.created_at,
    revision: row.revision,
  };
}
function toRow(habit: Habit, user: User) {
  return {
    id: habit.id,
    user_id: user.id,
    title: habit.title,
    reason: habit.reason,
    icon: habit.icon,
    color: habit.color,
    goal_days: habit.goalDays,
    runs: habit.runs,
    revision: habit.revision,
    created_at: habit.createdAt,
  };
}

export function useHabits() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [guestCount, setGuestCount] = useState(0);
  const currentUser = useRef<User | null>(null);
  const currentHabits = useRef<Habit[]>([]);
  const loadId = useRef(0);
  const busy = useRef(false);

  const commit = useCallback((items: Habit[], account: User | null) => {
    // Persist before acknowledging a local write: storage failures never appear as saved.
    localStorage.setItem(keyFor(account), JSON.stringify(items));
    currentHabits.current = items;
    setHabits(items);
  }, []);

  const load = useCallback(
    async (account: User | null) => {
      const id = ++loadId.current;
      currentUser.current = account;
      setUser(account);
      setLoading(true);
      setError("");
      let cache: Habit[] = [];
      try {
        cache = readCache(keyFor(account));
        setGuestCount(readCache(GUEST_KEY).length);
      } catch {
        setError(
          "خواندن اطلاعات این دستگاه ممکن نشد. برای بازیابی، فایل پشتیبان را وارد کن.",
        );
      }
      currentHabits.current = cache;
      setHabits(cache);
      try {
        if (supabase && account) {
          const { data, error: fetchError } = await supabase
            .from("habits")
            .select("*")
            .is("deleted_at", null)
            .order("created_at", { ascending: true });
          if (fetchError) throw fetchError;
          if (id !== loadId.current) return;
          const items = parseHabits((data ?? []).map(fromRow));
          try {
            commit(items, account);
          } catch {
            currentHabits.current = items;
            setHabits(items);
            setError(
              "اطلاعات حساب بارگذاری شد؛ ذخیره نسخه آفلاین روی این دستگاه ممکن نشد.",
            );
          }
        }
      } catch {
        if (id === loadId.current)
          setError(
            "اتصال به حساب برقرار نشد. نسخه ذخیره‌شده را می‌بینی؛ دوباره تلاش کن.",
          );
      } finally {
        if (id === loadId.current) setLoading(false);
      }
    },
    [commit],
  );

  useEffect(() => {
    let disposed = false;
    let initialized = false;
    let authVersion = 0;
    if (!supabase) {
      queueMicrotask(() => {
        if (!disposed) void load(null);
      });
      return () => {
        disposed = true;
      };
    }
    void supabase.auth.getSession().then(({ data, error: authError }) => {
      if (disposed || authVersion !== 0) return;
      initialized = true;
      void load(data.session?.user ?? null);
      if (authError) setError("ورود قبلی بازیابی نشد. دوباره وارد حساب شو.");
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        event === "SIGNED_IN" ||
        event === "SIGNED_OUT" ||
        event === "PASSWORD_RECOVERY" ||
        event === "USER_UPDATED"
      ) {
        const account = session?.user ?? null;
        const previous = currentUser.current;
        if (!initialized || account?.id !== previous?.id) {
          initialized = true;
          const version = ++authVersion;
          // Invalidate in-flight reads and writes before another account is rendered.
          ++loadId.current;
          currentUser.current = account;
          currentHabits.current = [];
          setUser(account);
          setHabits([]);
          setLoading(true);
          setError("");
          if (previous) {
            try {
              localStorage.removeItem(keyFor(previous));
            } catch {
              // Storage may be unavailable; the previous account is still removed from memory.
            }
          }
          setTimeout(() => {
            if (!disposed && version === authVersion) void load(account);
          }, 0);
        } else {
          currentUser.current = account;
          setUser(account);
        }
      }
    });
    return () => {
      disposed = true;
      subscription.unsubscribe();
    };
  }, [load]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === keyFor(currentUser.current) && !busy.current)
        void load(currentUser.current);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [load]);

  async function mutate(operation: () => Promise<void>) {
    if (busy.current || loading) return false;
    busy.current = true;
    setSaving(true);
    setError("");
    try {
      await operation();
      return true;
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "ذخیره نشد. اتصال را بررسی کن و دوباره تلاش کن.",
      );
      return false;
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  async function save(habit: Habit) {
    return mutate(async () => {
      const account = currentUser.current;
      const previous = currentHabits.current.find(
        (item) => item.id === habit.id,
      );
      if (previous && habit.revision !== previous.revision)
        throw new Error(
          "این عادت تغییر کرده. پنجره را ببند و با اطلاعات تازه دوباره تلاش کن.",
        );
      let saved = { ...habit, revision: previous ? previous.revision + 1 : 0 };
      if (supabase && account) {
        if (!navigator.onLine)
          throw new Error(
            "برای ذخیره در حساب، به اینترنت وصل شو. اطلاعات قبلی محفوظ است.",
          );
        const query = previous
          ? supabase
              .from("habits")
              .update(
                toRow({ ...habit, revision: previous.revision + 1 }, account),
              )
              .eq("id", habit.id)
              .eq("revision", previous.revision)
              .is("deleted_at", null)
              .select()
              .maybeSingle()
          : supabase
              .from("habits")
              .insert(toRow({ ...habit, revision: 0 }, account))
              .select()
              .single();
        const { data, error: saveError } = await query;
        if (saveError)
          throw new Error(
            "ذخیره در حساب انجام نشد. اتصال را بررسی کن و دوباره تلاش کن.",
          );
        if (!data)
          throw new Error(
            "این عادت در دستگاه دیگری تغییر کرده. اطلاعات را تازه‌سازی کن و دوباره تلاش کن.",
          );
        saved = fromRow(data);
      }
      const items = previous
        ? currentHabits.current.map((item) =>
            item.id === saved.id ? saved : item,
          )
        : [...currentHabits.current, saved];
      if (account?.id !== currentUser.current?.id) return;
      try {
        commit(items, account);
      } catch {
        if (!account)
          throw new Error(
            "ذخیره روی این دستگاه ممکن نشد. فضای مرورگر را بررسی کن.",
          );
        currentHabits.current = items;
        setHabits(items);
        setError("در حساب ذخیره شد؛ تهیه نسخه آفلاین روی این دستگاه ممکن نشد.");
      }
    });
  }

  async function remove(habit: Habit) {
    return mutate(async () => {
      const account = currentUser.current;
      if (supabase && account) {
        const { data, error: deleteError } = await supabase
          .from("habits")
          .update({
            deleted_at: new Date().toISOString(),
            revision: habit.revision + 1,
          })
          .eq("id", habit.id)
          .eq("revision", habit.revision)
          .select("id")
          .maybeSingle();
        if (deleteError || !data)
          throw new Error(
            "حذف انجام نشد. اطلاعات را تازه‌سازی کن و دوباره تلاش کن.",
          );
      }
      const items = currentHabits.current.filter(
        (item) => item.id !== habit.id,
      );
      if (account?.id !== currentUser.current?.id) return;
      try {
        commit(items, account);
      } catch {
        if (!account) throw new Error("حذف از این دستگاه انجام نشد.");
        currentHabits.current = items;
        setHabits(items);
      }
    });
  }

  async function importHabits(items: Habit[]) {
    return mutate(async () => {
      const account = currentUser.current;
      const missing = items
        .filter(
          (item) =>
            !currentHabits.current.some((existing) => existing.id === item.id),
        )
        .map((item) => ({ ...item, revision: 0 }));
      if (!missing.length) return;
      if (supabase && account) {
        if (!navigator.onLine)
          throw new Error("برای انتقال عادت‌ها به حساب، به اینترنت وصل شو.");
        const { error: importError } = await supabase
          .from("habits")
          .insert(missing.map((item) => toRow(item, account)));
        if (importError)
          throw new Error(
            "انتقال عادت‌ها انجام نشد. اتصال را بررسی کن و دوباره تلاش کن.",
          );
      }
      if (account?.id !== currentUser.current?.id) return;
      const merged = [...currentHabits.current, ...missing];
      try {
        commit(merged, account);
      } catch {
        if (!account)
          throw new Error(
            "بازیابی روی این دستگاه انجام نشد. فضای مرورگر را بررسی کن.",
          );
        currentHabits.current = merged;
        setHabits(merged);
        setError("در حساب ذخیره شد؛ تهیه نسخه آفلاین روی این دستگاه ممکن نشد.");
      }
    });
  }

  return {
    habits,
    user,
    loading,
    saving,
    error,
    guestCount,
    cloudEnabled: !!supabase,
    save,
    remove,
    importHabits,
    importGuest: () => importHabits(readCache(GUEST_KEY)),
    reload: () =>
      busy.current ? Promise.resolve() : load(currentUser.current),
    clearError: () => setError(""),
  };
}
