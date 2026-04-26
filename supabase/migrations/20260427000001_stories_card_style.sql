ALTER TABLE stories
  ADD COLUMN card_style TEXT NOT NULL DEFAULT 'a'
  CHECK (card_style ~ '^[a-z0-9_]{1,32}$');
