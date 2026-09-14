import Link from "next/link";
import { logout } from "@/app/login/actions";

export default function NavBar({ title, back }: { title: string; back?: string }) {
  return (
    <header className="bg-brand-800 text-white sticky top-0 z-30">
      <div className="max-w-4xl mx-auto px-3 py-3 flex items-center gap-3">
        {back && (
          <Link
            href={back}
            aria-label="رجوع"
            className="shrink-0 rounded-lg px-2 py-1 text-xl hover:bg-white/15 transition"
          >
            ←
          </Link>
        )}
        <h1 className="font-bold text-lg grow truncate">{title}</h1>
        <form action={logout}>
          <button
            type="submit"
            className="text-xs rounded-lg bg-white/15 px-2.5 py-1.5 hover:bg-white/25 transition"
          >
            خروج
          </button>
        </form>
      </div>
    </header>
  );
}
