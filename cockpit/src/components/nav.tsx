"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/firmen", label: "Zielfirmen" },
  { href: "/pipeline", label: "Pipeline" },
  { href: "/nachfassen", label: "Nachfassen" },
  { href: "/datenschutz", label: "Datenschutz" },
];

export function NavLinks() {
  const path = usePathname();
  return (
    <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      {LINKS.map((l) => {
        const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm ${
              active ? "bg-accent/15 text-accent" : "text-muted hover:text-fg"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
