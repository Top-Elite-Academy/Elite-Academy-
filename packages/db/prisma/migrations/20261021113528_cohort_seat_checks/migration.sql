-- Seats can never go negative or above capacity.
ALTER TABLE "cohorts"
  ADD CONSTRAINT "cohorts_seats_valid"
  CHECK ("seats_total" > 0 AND "seats_taken" >= 0 AND "seats_taken" <= "seats_total");
