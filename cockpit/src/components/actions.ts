export type ActionResult = { ok?: string; error?: string; data?: unknown } | null;

export function errorMessage(e: unknown): string {
  if (e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string") {
    return (e as { message: string }).message;
  }
  return "Unbekannter Fehler.";
}
