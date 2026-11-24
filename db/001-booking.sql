CREATE TABLE IF NOT EXISTS seatlock_orders (
  id uuid PRIMARY KEY,
  account_id bigint NOT NULL,
  event_id text NOT NULL,
  receipt jsonb NOT NULL,
  booked_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS seatlock_orders_account_idx
  ON seatlock_orders (account_id, booked_at DESC);

CREATE TABLE IF NOT EXISTS seatlock_seats (
  event_id text NOT NULL,
  seat_id text NOT NULL,
  held_by text,
  expires_at timestamptz,
  order_id uuid REFERENCES seatlock_orders(id),
  PRIMARY KEY (event_id, seat_id),
  CHECK ((held_by IS NULL) = (expires_at IS NULL)),
  CHECK (order_id IS NULL OR held_by IS NULL)
);
