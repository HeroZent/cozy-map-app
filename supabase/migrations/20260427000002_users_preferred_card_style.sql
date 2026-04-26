ALTER TABLE users
  ADD COLUMN preferred_card_style TEXT NOT NULL DEFAULT 'a'
  CHECK (preferred_card_style ~ '^[a-z0-9_]{1,32}$');
