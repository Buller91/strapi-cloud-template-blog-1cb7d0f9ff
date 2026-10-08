import { CHANNEL_LABELS, MESSAGE_STATUS_LABELS, STAGE_LABELS, type Channel, type MessageStatus, type Stage } from "@/lib/domain/types";

export function PageHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
      {children ? <div className="flex flex-wrap gap-2">{children}</div> : null}
    </div>
  );
}

export function StageBadge({ stage }: { stage: Stage }) {
  const strong = stage === "gespraech" || stage === "offerte" || stage === "gewonnen";
  return (
    <span
      className={`label rounded border px-1.5 py-0.5 ${
        strong ? "border-accent/50 text-accent" : stage === "verloren" ? "border-line text-muted/60" : "border-line"
      }`}
    >
      {STAGE_LABELS[stage]}
    </span>
  );
}

export function ChannelBadge({ channel }: { channel: Channel }) {
  return <span className="label">{CHANNEL_LABELS[channel]}</span>;
}

export function MessageStatusBadge({ status }: { status: MessageStatus }) {
  const color =
    status === "gesendet" || status === "antwort_erhalten"
      ? "border-accent/50 text-accent"
      : status === "geprueft"
        ? "border-warn/50 text-warn"
        : "border-line";
  return <span className={`label rounded border px-1.5 py-0.5 ${color}`}>{MESSAGE_STATUS_LABELS[status]}</span>;
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block space-y-1">
      <span className="label">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export function formatDate(d: string | null | undefined): string {
  if (!d) return "–";
  const date = d.length === 10 ? new Date(`${d}T12:00:00Z`) : new Date(d);
  return new Intl.DateTimeFormat("de-CH", { timeZone: "Europe/Zurich", day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

export function formatDateTime(d: string | null | undefined): string {
  if (!d) return "–";
  return new Intl.DateTimeFormat("de-CH", {
    timeZone: "Europe/Zurich", day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit",
  }).format(new Date(d));
}
