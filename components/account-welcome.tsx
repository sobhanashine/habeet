import { ArrowLeft, LockKeyhole, ShieldCheck } from "lucide-react";
import { Brand, GrowingPlant } from "./ui";
import { fa } from "@/lib/habits";

export function AccountWelcome({
  loading,
  guestCount,
  onSignup,
  onLogin,
  onGuest,
}: {
  loading: boolean;
  guestCount: number;
  onSignup: () => void;
  onLogin: () => void;
  onGuest: () => void;
}) {
  return (
    <div className="welcome-page">
      <header className="welcome-header">
        <Brand compact />
        <span>
          <LockKeyhole size={14} /> فضای شخصی تو
        </span>
      </header>
      <main className="welcome-grid">
        <section className="welcome-copy">
          <span className="eyebrow">یک قرار کوچک، برای خودت</span>
          <h1>
            هر روز،
            <br />
            کمی آزادتر.
          </h1>
          <p>
            آنچه می‌خواهی کنار بگذاری را بنویس. روزها را ببین و قدم‌به‌قدم ادامه
            بده؛ در حسابی که فقط برای خودت است.
          </p>
          <div className="welcome-actions">
            <button
              className="button primary"
              disabled={loading}
              onClick={onSignup}
            >
              ساخت حساب <ArrowLeft size={18} />
            </button>
            <button
              className="button secondary"
              disabled={loading}
              onClick={onLogin}
            >
              ورود به حساب
            </button>
          </div>
          <span className="welcome-account-hint">
            با ایمیل و رمز عبورت، روی هر دستگاه ادامه بده.
          </span>
          <button
            className="text-button welcome-guest"
            disabled={loading}
            onClick={onGuest}
          >
            {guestCount > 0
              ? `ادامه ${fa(guestCount)} عادت این دستگاه بدون حساب`
              : "فعلاً بدون حساب، روی این دستگاه شروع می‌کنم"}
          </button>
          {loading ? (
            <p className="welcome-note" role="status">
              در حال بررسی حساب…
            </p>
          ) : (
            guestCount > 0 && (
              <p className="welcome-note">
                عادت‌های قبلی‌ات محفوظ‌اند؛ بعد از ورود می‌توانی آن‌ها را به
                حساب منتقل کنی.
              </p>
            )
          )}
        </section>
        <section
          className="welcome-visual"
          aria-label="یک شروع کوچک، یک مسیر برای خودت"
        >
          <GrowingPlant />
          <h2>
            شروع کوچک تو،
            <br />
            جای خودش را دارد.
          </h2>
          <p>قرار نیست بی‌نقص باشی. فقط امروز، یک قدم.</p>
          <span>
            <ShieldCheck size={18} /> عادت‌های هر حساب فقط برای صاحب آن است.
          </span>
        </section>
      </main>
      <footer className="welcome-footer">هبیت · هر روز، یک قدم</footer>
    </div>
  );
}
