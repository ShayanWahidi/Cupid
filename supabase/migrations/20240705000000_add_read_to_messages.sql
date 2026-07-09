ALTER TABLE messages ADD COLUMN read BOOLEAN DEFAULT FALSE;

CREATE POLICY "Users can update read status on messages in their matches"
  ON messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = messages.match_id
      AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
    )
  );

ALTER PUBLICATION supabase_realtime ADD TABLE messages;
