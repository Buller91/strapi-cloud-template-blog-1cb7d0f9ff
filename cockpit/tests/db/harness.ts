// Testumgebung für die SQL-Migrationen gegen ein lokales Postgres.
// Bildet die nötigen Teile von Supabase nach (auth.users, auth.uid(), auth.jwt(), Rollen).
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";

export const DB_URL = process.env.TEST_DATABASE_URL;

const SUPABASE_STUB = `
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
drop schema if exists public cascade;
drop schema if exists app_private cascade;
drop schema if exists auth cascade;
create schema public;
grant usage on schema public to anon, authenticated, service_role;
create schema auth;
grant usage on schema auth to anon, authenticated;
create table auth.users (id uuid primary key, email text);
create function auth.jwt() returns jsonb language sql stable as $f$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$f$;
create function auth.uid() returns uuid language sql stable as $f$
  select nullif(auth.jwt() ->> 'sub', '')::uuid
$f$;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated, service_role;
`;

export async function resetDatabase(): Promise<pg.Client> {
  const client = new pg.Client({ connectionString: DB_URL });
  await client.connect();
  await client.query(SUPABASE_STUB);
  const dir = path.resolve(import.meta.dirname, "../../supabase/migrations");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    await client.query(readFileSync(path.join(dir, file), "utf8"));
  }
  return client;
}

export const USER_A = "00000000-0000-4000-8000-00000000000a";
export const USER_B = "00000000-0000-4000-8000-00000000000b";

/** Führt fn als angemeldeter Nutzer aus (Rolle authenticated, RLS aktiv). */
export async function asUser<T>(
  client: pg.Client,
  userId: string,
  fn: () => Promise<T>,
  aal: "aal1" | "aal2" = "aal2",
): Promise<T> {
  await client.query("begin");
  try {
    await client.query("set local role authenticated");
    await client.query("select set_config('request.jwt.claims', $1, true)", [
      JSON.stringify({ sub: userId, aal, role: "authenticated" }),
    ]);
    const result = await fn();
    await client.query("commit");
    return result;
  } catch (e) {
    await client.query("rollback");
    throw e;
  }
}
