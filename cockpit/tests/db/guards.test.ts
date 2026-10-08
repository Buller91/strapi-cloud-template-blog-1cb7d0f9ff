import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type pg from "pg";
import { DB_URL, USER_A, USER_B, asUser, resetDatabase } from "./harness";

// Läuft nur mit TEST_DATABASE_URL (siehe README). Die Datenbank wird geleert.
describe.skipIf(!DB_URL)("Datenbank-Regeln", () => {
  let db: pg.Client;

  beforeAll(async () => {
    db = await resetDatabase();
  });
  afterAll(async () => {
    await db?.end();
  });
  beforeEach(async () => {
    await db.query("truncate auth.users, public.suppressions, public.audit_log cascade");
    await db.query("insert into auth.users (id, email) values ($1, 'a@x.ch'), ($2, 'b@x.ch')", [USER_A, USER_B]);
  });

  async function account(user = USER_A, name = "Elektro Muster AG") {
    return asUser(db, user, async () => {
      const r = await db.query(
        `insert into accounts (name, ort, website, domain, dedupe_key, quelle, quelle_datum)
         values ($1, 'Bern', 'https://muster.ch', 'muster.ch', $2, 'Manuell', current_date) returning id`,
        [name, `muster.ch-${name}`],
      );
      return r.rows[0].id as string;
    });
  }

  async function contact(accountId: string, opts: { gesperrt?: boolean; email?: string } = {}) {
    return asUser(db, USER_A, async () => {
      const r = await db.query(
        `insert into contacts (account_id, name, email_geschaeftlich, quelle, quelle_datum, gesperrt, sperr_grund)
         values ($1, 'Hans Muster', $2, 'Manuell', current_date, $3, $4) returning id, gesperrt`,
        [accountId, opts.email ?? "hans@muster.ch", !!opts.gesperrt, opts.gesperrt ? "kein Interesse" : null],
      );
      return r.rows[0] as { id: string; gesperrt: boolean };
    });
  }

  const insertMessage = (contactId: string) =>
    asUser(db, USER_A, async () => {
      const r = await db.query(
        `insert into messages (contact_id, kanal, entwurf) values ($1, 'email', 'Grüezi') returning id`,
        [contactId],
      );
      return r.rows[0].id as string;
    });

  const setStatus = (id: string, status: string, final?: string) =>
    asUser(db, USER_A, () =>
      db.query(`update messages set status = $2, final = coalesce($3, final) where id = $1`, [id, status, final ?? null]),
    );

  describe("Sperrlogik", () => {
    it("verhindert eine Nachricht an einen gesperrten Kontakt", async () => {
      const c = await contact(await account(), { gesperrt: true });
      await expect(insertMessage(c.id)).rejects.toThrow(/gesperrt/);
    });

    it("verhindert Prüfung und Versand, wenn der Kontakt nach dem Entwurf gesperrt wurde", async () => {
      const c = await contact(await account());
      const m = await insertMessage(c.id);
      await asUser(db, USER_A, () =>
        db.query(`update contacts set gesperrt = true, sperr_grund = 'kein Interesse' where id = $1`, [c.id]),
      );
      await expect(setStatus(m, "geprueft", "Text")).rejects.toThrow(/gesperrt/);
    });

    it("erlaubt nach Versand noch das Markieren der Antwort", async () => {
      const c = await contact(await account());
      const m = await insertMessage(c.id);
      await setStatus(m, "geprueft", "Text");
      await setStatus(m, "gesendet");
      await asUser(db, USER_A, () =>
        db.query(`update contacts set gesperrt = true, sperr_grund = 'kein Interesse' where id = $1`, [c.id]),
      );
      await expect(setStatus(m, "antwort_erhalten")).resolves.toBeDefined();
    });

    it("lässt eine Sperre nicht wieder aufheben", async () => {
      const c = await contact(await account(), { gesperrt: true });
      await expect(
        asUser(db, USER_A, () => db.query(`update contacts set gesperrt = false where id = $1`, [c.id])),
      ).rejects.toThrow(/nicht aufgehoben/);
    });

    it("sperrt einen gelöschten und wieder importierten Kontakt sofort", async () => {
      const acc = await account();
      const c = await contact(acc, { gesperrt: true, email: "Hans@Muster.ch" });
      await asUser(db, USER_A, () => db.query(`delete from contacts where id = $1`, [c.id]));
      const again = await contact(acc, { email: "hans@muster.ch " });
      expect(again.gesperrt).toBe(true);
      await expect(insertMessage(again.id)).rejects.toThrow(/gesperrt/);
    });
  });

  describe("Statusfluss Nachrichten", () => {
    it("führt einen Entwurf über geprüft bis gesendet", async () => {
      const c = await contact(await account());
      const m = await insertMessage(c.id);
      await setStatus(m, "geprueft", "Finaler Text");
      await setStatus(m, "gesendet");
      const r = await asUser(db, USER_A, () => db.query(`select status, gesendet_am from messages where id = $1`, [m]));
      expect(r.rows[0].status).toBe("gesendet");
      expect(r.rows[0].gesendet_am).not.toBeNull();
    });

    it("lässt nicht direkt vom Entwurf auf gesendet springen", async () => {
      const c = await contact(await account());
      const m = await insertMessage(c.id);
      await expect(setStatus(m, "gesendet")).rejects.toThrow(/nicht erlaubt/);
    });

    it("verlangt beim Prüfen einen finalen Text", async () => {
      const c = await contact(await account());
      const m = await insertMessage(c.id);
      await expect(setStatus(m, "geprueft", "   ")).rejects.toThrow(/finalen Text/);
    });

    it("schützt gesendete Nachrichten vor Änderungen", async () => {
      const c = await contact(await account());
      const m = await insertMessage(c.id);
      await setStatus(m, "geprueft", "Text");
      await setStatus(m, "gesendet");
      await expect(
        asUser(db, USER_A, () => db.query(`update messages set final = 'anders' where id = $1`, [m])),
      ).rejects.toThrow(/nicht mehr geändert/);
    });
  });

  describe("Pipeline-Ereignisse", () => {
    it("protokolliert jeden Stufenwechsel", async () => {
      const acc = await account();
      await asUser(db, USER_A, () => db.query(`update accounts set status = 'kontaktiert' where id = $1`, [acc]));
      await asUser(db, USER_A, () => db.query(`update accounts set status = 'gespraech' where id = $1`, [acc]));
      const r = await asUser(db, USER_A, () =>
        db.query(`select von, nach from pipeline_events where account_id = $1 order by zeitpunkt, nach`, [acc]),
      );
      expect(r.rows.map((x) => x.nach).sort()).toEqual(["gespraech", "kontaktiert", "neu"]);
    });
  });

  describe("Veröffentlichen nur bei Freigabe", () => {
    async function item(inhalt: string, status = "entwurf") {
      return asUser(db, USER_A, async () => {
        const c = await db.query(
          `insert into clients (name, domain, ist_eigene_seite) values ('Cybershark', 'cybershark.ch', true)
           on conflict (owner_id, domain) do update set name = excluded.name returning id`,
        );
        const r = await db.query(
          `insert into content_items (client_id, titel, inhalt, status) values ($1, 'Titel', $2, $3) returning id`,
          [c.rows[0].id, inhalt, status],
        );
        return r.rows[0].id as string;
      });
    }
    const publish = (id: string) =>
      asUser(db, USER_A, () => db.query(`update content_items set status = 'publiziert' where id = $1`, [id]));
    const setItem = (id: string, status: string) =>
      asUser(db, USER_A, () => db.query(`update content_items set status = $2 where id = $1`, [id, status]));

    it("veröffentlicht einen freigegebenen Beitrag ohne Platzhalter", async () => {
      const id = await item("Fertiger Text.");
      await setItem(id, "freigegeben");
      await expect(publish(id)).resolves.toBeDefined();
    });

    it("blockiert Beiträge, die nicht freigegeben sind", async () => {
      const id = await item("Fertiger Text.");
      await setItem(id, "ueberarbeitet");
      await expect(publish(id)).rejects.toThrow(/freigegeben/);
    });

    it("blockiert freigegebene Beiträge mit Platzhaltern", async () => {
      const id = await item("Einleitung {{kunde}} folgt.");
      await setItem(id, "freigegeben");
      await expect(publish(id)).rejects.toThrow(/Platzhalter/);
    });

    it("hebt die Freigabe auf, wenn der Inhalt danach geändert wird", async () => {
      const id = await item("Text A");
      await setItem(id, "freigegeben");
      await asUser(db, USER_A, () => db.query(`update content_items set inhalt = 'Text B' where id = $1`, [id]));
      await expect(publish(id)).rejects.toThrow(/freigegeben/);
    });

    it("lässt keine direkt publizierten Beiträge anlegen", async () => {
      await expect(item("x", "publiziert")).rejects.toThrow(/direkt/);
    });
  });

  describe("Row Level Security", () => {
    it("zeigt Daten nur dem Eigentümer", async () => {
      await account(USER_A);
      const r = await asUser(db, USER_B, () => db.query(`select count(*)::int as n from accounts`));
      expect(r.rows[0].n).toBe(0);
    });

    it("liefert ohne zweiten Faktor (aal1) nichts", async () => {
      await account(USER_A);
      const r = await asUser(db, USER_A, () => db.query(`select count(*)::int as n from accounts`), "aal1");
      expect(r.rows[0].n).toBe(0);
    });

    it("lässt die App keine Pipeline-Ereignisse fälschen", async () => {
      const acc = await account();
      await expect(
        asUser(db, USER_A, () =>
          db.query(`insert into pipeline_events (owner_id, account_id, nach) values ($1, $2, 'gewonnen')`, [USER_A, acc]),
        ),
      ).rejects.toThrow(/permission denied/);
    });
  });
});
