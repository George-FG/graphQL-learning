CREATE TABLE IF NOT EXISTS users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  num_fish INTEGER NOT NULL DEFAULT 0
);

INSERT INTO users (name, num_fish)
VALUES
  ('George', 3),
  ('Alice', 7),
  ('Ben', 1);