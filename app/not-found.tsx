import { Sprout } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="not-found-page">
      <Sprout size={48} strokeWidth={1.4} aria-hidden="true" />
      <span className="muted">۴۰۴</span>
      <h1>این صفحه پیدا نشد.</h1>
      <p>مسیرت از صفحه اصلی ادامه دارد.</p>
      <Link className="button primary" href="/">
        بازگشت به هبیت
      </Link>
    </main>
  );
}
