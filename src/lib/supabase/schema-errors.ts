import type { PostgrestError } from "@supabase/supabase-js";

/**
 * PostgREST returns this when tables exist in Postgres but are not exposed,
 * or when the table truly does not exist (new project before migrations).
 */
export function augmentMissingTableError(context: string, error: PostgrestError): Error {
  const msg = error.message ?? "";
  if (msg.includes("Could not find the table") || msg.includes("schema cache")) {
    return new Error(
      `${context}: ${msg} — Run Reports and Data Optimization SQL on your Supabase project: open SQL Editor and execute supabase/apply_full_schema.sql (or run supabase db push from this repo).`,
    );
  }
  return new Error(`${context}: ${msg}`);
}
