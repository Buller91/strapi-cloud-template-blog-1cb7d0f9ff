export const STAGES = [
  "neu",
  "recherchiert",
  "kontaktiert",
  "antwort",
  "gespraech",
  "offerte",
  "gewonnen",
  "verloren",
] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_LABELS: Record<Stage, string> = {
  neu: "Neu",
  recherchiert: "Recherchiert",
  kontaktiert: "Kontaktiert",
  antwort: "Antwort",
  gespraech: "Gespräch",
  offerte: "Offerte",
  gewonnen: "Gewonnen",
  verloren: "Verloren",
};

export const CHANNELS = ["ausgehend", "seo", "empfehlung", "social", "sonstige"] as const;
export type Channel = (typeof CHANNELS)[number];

export const CHANNEL_LABELS: Record<Channel, string> = {
  ausgehend: "Ausgehend",
  seo: "SEO",
  empfehlung: "Empfehlung",
  social: "Social Media",
  sonstige: "Sonstige",
};

export const MESSAGE_STATUSES = ["entwurf", "geprueft", "gesendet", "antwort_erhalten"] as const;
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];

export const MESSAGE_STATUS_LABELS: Record<MessageStatus, string> = {
  entwurf: "Entwurf",
  geprueft: "Geprüft",
  gesendet: "Gesendet",
  antwort_erhalten: "Antwort erhalten",
};

export const MESSAGE_CHANNELS = ["email", "linkedin", "telefon"] as const;
export type MessageChannel = (typeof MESSAGE_CHANNELS)[number];

export const ACTIVITY_TYPES = ["notiz", "telefonat", "termin", "offerte"] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const KANTONE = [
  "AG", "AI", "AR", "BE", "BL", "BS", "FR", "GE", "GL", "GR", "JU", "LU", "NE",
  "NW", "OW", "SG", "SH", "SO", "SZ", "TG", "TI", "UR", "VD", "VS", "ZG", "ZH",
] as const;

export interface Contact {
  id: string;
  account_id: string;
  name: string;
  funktion: string | null;
  email_geschaeftlich: string | null;
  linkedin_url: string | null;
  quelle: string;
  quelle_datum: string;
  gesperrt: boolean;
  sperr_grund: string | null;
  sperr_datum: string | null;
}
