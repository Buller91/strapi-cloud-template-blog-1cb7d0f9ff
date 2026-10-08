export const APP_NAME = "Cybershark Super Intelligence";

/** Logo mit Name. size="lg" für die Login-Seite. */
export function Brand({ size = "sm" }: { size?: "sm" | "lg" }) {
  const lg = size === "lg";
  return (
    <span className="flex items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="" className={lg ? "h-12 w-auto" : "h-8 w-auto"} />
      <span className={`font-display font-extrabold leading-tight tracking-tight ${lg ? "text-xl" : "text-sm sm:text-base"}`}>
        <span className="block">Cybershark</span>
        <span className="block whitespace-nowrap text-accent">Super Intelligence</span>
      </span>
    </span>
  );
}
