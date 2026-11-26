CREATE TABLE IF NOT EXISTS seatlock_paypal_orders (
  paypal_id text PRIMARY KEY,
  booking_id uuid NOT NULL UNIQUE,
  event_id text NOT NULL,
  account_id bigint NOT NULL REFERENCES seatlock_accounts(id),
  held_by text NOT NULL,
  seats text[] NOT NULL,
  amount numeric(10, 2) NOT NULL CHECK (amount > 0)
);
