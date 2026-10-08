// Alle Seiten benutzerspezifisch und mit aktuellem Datum rendern
export const dynamic = "force-dynamic";

import Link from "next/link";
import { NavLinks } from "@/components/nav";
import { signOut } from "../login/actions";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-7xl px-4 pb-16">
      <header className="sticky top-0 z-10 -mx-4 mb-6 border-b border-line bg-bg/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" aria-label="Startseite">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="Cybershark" className="h-7 w-auto" />
          </Link>
          <form action={signOut}>
            <button className="text-xs text-muted hover:text-fg">Abmelden</button>
          </form>
        </div>
        <div className="mt-3">
          <NavLinks />
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
