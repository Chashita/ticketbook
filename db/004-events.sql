CREATE TABLE IF NOT EXISTS seatlock_events (
  id text PRIMARY KEY,
  listing jsonb NOT NULL,
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS seatlock_listing_requests (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  details jsonb NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now()
);
