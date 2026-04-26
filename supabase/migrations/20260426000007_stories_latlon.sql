-- Add lat/lng as generated columns so clients never need to cast geography->json
alter table public.stories
  add column lat double precision generated always as (st_y(location::geometry)) stored,
  add column lng double precision generated always as (st_x(location::geometry)) stored;
