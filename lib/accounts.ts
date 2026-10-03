import type { User } from "@supabase/supabase-js";

export type AccountMode = "login" | "signup" | "forgot" | "reset";

export function accountName(user: Pick<User, "email" | "user_metadata">) {
  const name = user.user_metadata?.display_name;
  return typeof name === "string" && name.trim()
    ? name.trim().slice(0, 40)
    : user.email?.split("@")[0].slice(0, 40) || "دوست من";
}

export function newPasswordError(password: string, confirmation: string) {
  if (password.length < 8 || !password.trim())
    return "رمز عبور باید حداقل ۸ کاراکتر باشد و فقط فاصله نباشد.";
  if (password !== confirmation) return "رمز عبور و تکرار آن یکسان نیستند.";
  return "";
}

export function accountError(cause: unknown) {
  const code =
    cause && typeof cause === "object" && "code" in cause ? cause.code : "";
  switch (code) {
    case "invalid_credentials":
      return "ایمیل یا رمز عبور درست نیست.";
    case "email_not_confirmed":
      return "ابتدا ایمیلت را با لینک تأیید کن، سپس وارد شو.";
    case "email_address_invalid":
      return "یک آدرس ایمیل معتبر بنویس.";
    case "weak_password":
      return "رمز قوی‌تری انتخاب کن؛ حداقل ۸ کاراکتر با ترکیبی از حروف و عدد.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "تعداد درخواست‌ها زیاد شده. چند دقیقه بعد دوباره تلاش کن.";
    case "email_address_not_authorized":
    case "email_provider_disabled":
    case "signup_disabled":
      return "ثبت‌نام فعلاً در دسترس نیست. کمی بعد دوباره تلاش کن.";
    case "otp_expired":
    case "session_not_found":
    case "session_expired":
      return "لینک بازیابی معتبر نیست یا منقضی شده. یک لینک تازه درخواست کن.";
    case "same_password":
      return "رمز تازه باید با رمز قبلی فرق داشته باشد.";
    default:
      return "درخواست انجام نشد. اتصال را بررسی کن و دوباره تلاش کن.";
  }
}
