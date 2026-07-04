CREATE TABLE typing_status (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, match_id)
);

ALTER TABLE typing_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can upsert their own typing status"
  ON typing_status FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own typing status"
  ON typing_status FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view typing status in their matches"
  ON typing_status FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = typing_status.match_id
      AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
    )
  );

ALTER PUBLICATION supabase_realtime ADD TABLE typing_status;
