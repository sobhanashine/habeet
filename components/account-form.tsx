"use client";

import { useState, type FormEvent } from "react";
import { ArrowLeft, Mail, LockKeyhole, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Dialog } from "./ui";

export function AccountForm({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<"login" | "signup" | "forgot" | "reset">(
    () =>
      window.location.hash.includes("type=recovery") ||
      new URLSearchParams(window.location.search).get("recovery") === "1"
        ? "reset"
        : "login",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
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
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (authError) throw authError;
        if (data.session) onClose();
        else
          setMessage(
            "لینک تأیید به ایمیلت فرستاده شد. ایمیل را باز کن و روی لینک بزن، سپس وارد شو.",
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
      const code =
        cause && typeof cause === "object" && "code" in cause ? cause.code : "";
      setError(
        code === "invalid_credentials"
          ? "ایمیل یا رمز عبور درست نیست."
          : code === "email_not_confirmed"
            ? "ابتدا ایمیلت را با لینک تأیید کن."
            : code === "over_email_send_rate_limit" ||
                code === "over_request_rate_limit"
              ? "تعداد درخواست‌ها زیاد شده. چند دقیقه بعد دوباره تلاش کن."
              : "درخواست انجام نشد. اتصال و اطلاعات را بررسی کن و دوباره تلاش کن.",
      );
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
              className={mode === "login" ? "selected" : ""}
              onClick={() => {
                setMode("login");
                setError("");
                setMessage("");
              }}
            >
              ورود
            </button>
            <button
              type="button"
              className={mode === "signup" ? "selected" : ""}
              onClick={() => {
                setMode("signup");
                setError("");
                setMessage("");
              }}
            >
              ساخت حساب
            </button>
          </div>
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
            className="text-button"
            onClick={() => {
              setMode("forgot");
              setError("");
            }}
          >
            رمز عبورم را فراموش کرده‌ام
          </button>
        )}
        {mode === "forgot" && (
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setMode("login");
              setError("");
            }}
          >
            بازگشت به ورود
          </button>
        )}
        <p className="form-footnote">
          عادت‌های این دستگاه را بعد از ورود، از تنظیمات به حساب منتقل کن.
        </p>
      </form>
    </Dialog>
  );
}
