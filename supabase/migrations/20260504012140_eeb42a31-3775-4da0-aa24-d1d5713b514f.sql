-- Tighten realtime channel access: deny broadcast/presence by default,
-- since the app only uses postgres_changes (governed by RLS on the underlying tables).
DROP POLICY IF EXISTS "Authenticated can read realtime" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated can write realtime" ON realtime.messages;

CREATE POLICY "Deny direct broadcast read"
ON realtime.messages
FOR SELECT
TO authenticated
USING (false);

CREATE POLICY "Deny direct broadcast write"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (false);