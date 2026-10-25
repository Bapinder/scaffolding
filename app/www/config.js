/* From the Supabase project: Settings → Data API.
   The publishable key is meant to be public — it ships inside every copy of the app on
   every phone. It grants nothing on its own: see supabase/schema.sql, where the table is
   locked by RLS with no policies, and the only way in is a function that demands the
   join code.

   SUPABASE_URL is the project base only — sync.js appends /rest/v1/rpc/… itself. */
window.SUPABASE_URL = '';
window.SUPABASE_ANON_KEY = '';
