-- Preserve exact half-room counts (for example 4.5) in the public catalogue.
-- Existing integer values cast losslessly to numeric; no row values are changed.
alter table public.properties
  alter column rooms type numeric
  using rooms::numeric;
