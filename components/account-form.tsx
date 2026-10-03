"use client";

import { useState, type FormEvent } from "react";
import {
  ArrowLeft,
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
  UserRound,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  accountError,
  newPasswordError,
  type AccountMode,
} from "@/lib/accounts";
import { Dialog } from "./ui";

export function AccountForm({
  onClose,
  initialMode = "login",
}: {
  onClose: () => void;
  initialMode?: AccountMode;
}) {
  const [mode, setMode] = useState<AccountMode>(() =>
    window.location.hash.includes("type=recovery") ||
    new URLSearchParams(window.location.search).get("recovery") === "1"
      ? "reset"
      : initialMode,
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (mode === "signup" || mode === "reset") {
      const validation = newPasswordError(password, confirmation);
      if (validation) {
        setError(validation);
        return;
      }
    }
    if (!supabase) {
      setError(
        "اتصال حساب هنوز آماده نیست. می‌توانی روی همین دستگاه شروع کنی.",
      );
      return;
    }
    setBusy(true);
    try {
      if (mode === "login") {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (authError) throw authError;
        onClose();
      } else if (mode === "signup") {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { display_name: name.trim() },
          },
        });
        if (authError) throw authError;
        if (data.session) onClose();
        else
          setMessage(
            "اگر این ایمیل قابل ثبت باشد، لینک تأیید برایش فرستاده می‌شود. ایمیل را باز کن و بعد از تأیید وارد شو. اگر قبلاً حساب داری، از بخش ورود ادامه بده.",
          );
      } else if (mode === "forgot") {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(
          email.trim(),
          { redirectTo: `${window.location.origin}/?recovery=1` },
        );
        if (authError) throw authError;
        setMessage(
          "اگر این ایمیل حسابی داشته باشد، لینک تغییر رمز برایت فرستاده می‌شود.",
        );
      } else {
        const { error: authError } = await supabase.auth.updateUser({
          password,
        });
        if (authError) throw authError;
        window.history.replaceState(null, "", "/");
        onClose();
      }
    } catch (cause) {
      setError(accountError(cause));
    } finally {
      setBusy(false);
    }
  }

  const heading = {
    login: "مسیرت، همراه تو",
    signup: "یک حساب برای مسیرت",
    forgot: "بازیابی رمز عبور",
    reset: "رمز تازه‌ات را بنویس",
  }[mode];
  return (
    <Dialog
      title={heading}
      subtitle="با یک حساب، روی گوشی و دستگاه‌های دیگر هم ادامه بده."
      onClose={onClose}
    >
      <form className="habit-form" onSubmit={submit}>
        {(mode === "login" || mode === "signup") && (
          <div className="auth-tabs">
            <button
              type="button"
              disabled={busy}
              aria-pressed={mode === "login"}
              className={mode === "login" ? "selected" : ""}
              onClick={() => {
                setMode("login");
                setPassword("");
                setConfirmation("");
                setError("");
                setMessage("");
              }}
            >
              ورود
            </button>
            <button
              type="button"
              disabled={busy}
              aria-pressed={mode === "signup"}
              className={mode === "signup" ? "selected" : ""}
              onClick={() => {
                setMode("signup");
                setPassword("");
                setConfirmation("");
                setError("");
                setMessage("");
              }}
            >
              ساخت حساب
            </button>
          </div>
        )}
        {mode === "signup" && (
          <label className="field">
            نامی که دوست داری صدایت کنیم{" "}
            <small className="muted">اختیاری</small>
            <div className="input-with-icon">
              <UserRound size={18} />
              <input
                type="text"
                autoComplete="nickname"
                maxLength={40}
                placeholder="مثلاً سارا"
                disabled={busy}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
          </label>
        )}
        {mode !== "reset" && (
          <label className="field">
            ایمیل
            <div className="input-with-icon">
              <Mail size={18} />
              <input
                required
                type="email"
                autoComplete="email"
                disabled={busy}
                autoCapitalize="none"
                spellCheck={false}
                data-autofocus
                dir="ltr"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
          </label>
        )}
        {mode !== "forgot" && (
          <label className="field">
            رمز عبور
            <div className="input-with-icon">
              <LockKeyhole size={18} />
              <input
                required
                minLength={mode === "login" ? 1 : 8}
                maxLength={128}
                disabled={busy}
                type={show ? "text" : "password"}
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                dir="ltr"
                placeholder={mode === "login" ? "رمز عبورت" : "حداقل ۸ کاراکتر"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                type="button"
                aria-label={show ? "پنهان کردن رمز" : "نمایش رمز"}
                className="icon-button"
                onClick={() => setShow(!show)}
              >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>
        )}
        {(mode === "signup" || mode === "reset") && (
          <label className="field">
            تکرار رمز عبور
            <div className="input-with-icon">
              <LockKeyhole size={18} />
              <input
                required
                minLength={8}
                maxLength={128}
                disabled={busy}
                type={show ? "text" : "password"}
                autoComplete="new-password"
                dir="ltr"
                placeholder="همان رمز را دوباره بنویس"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
              />
            </div>
          </label>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="form-success" role="status">
            {message}
          </p>
        )}
        <button className="button primary full" disabled={busy} type="submit">
          {busy
            ? "چند لحظه…"
            : mode === "signup"
              ? "ساخت حساب"
              : mode === "forgot"
                ? "فرستادن لینک بازیابی"
                : mode === "reset"
                  ? "ذخیره رمز تازه"
                  : "ورود به حساب"}
          <ArrowLeft size={18} />
        </button>
        {mode === "login" && (
          <button
            type="button"
            disabled={busy}
            className="text-button"
            onClick={() => {
              setMode("forgot");
              setError("");
              setPassword("");
              setConfirmation("");
              setMessage("");
            }}
          >
            رمز عبورم را فراموش کرده‌ام
          </button>
        )}
        {mode === "forgot" && (
          <button
            type="button"
            disabled={busy}
            className="text-button"
            onClick={() => {
              setMode("login");
              setError("");
              setMessage("");
            }}
          >
            بازگشت به ورود
          </button>
        )}
        {mode === "reset" && error && (
          <button
            type="button"
            className="text-button"
            disabled={busy}
            onClick={() => {
              setMode("forgot");
              setError("");
              setMessage("");
              setPassword("");
              setConfirmation("");
            }}
          >
            درخواست لینک بازیابی تازه
          </button>
        )}
        <p className="form-footnote">
          عادت‌های این دستگاه را بعد از ورود، از تنظیمات به حساب منتقل کن.
        </p>
      </form>
    </Dialog>
  );
}
