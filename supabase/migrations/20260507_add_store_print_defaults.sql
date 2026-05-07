alter table public.stores
  add column if not exists print_paper text not null default 'A5',
  add column if not exists print_orientation text not null default 'landscape',
  add column if not exists print_density text not null default 'normal',
  add column if not exists print_margin_mm integer not null default 5;

alter table public.stores
  drop constraint if exists stores_print_paper_check;
alter table public.stores
  add constraint stores_print_paper_check
  check (print_paper in ('A5', 'A4'));

alter table public.stores
  drop constraint if exists stores_print_orientation_check;
alter table public.stores
  add constraint stores_print_orientation_check
  check (print_orientation in ('landscape', 'portrait'));

alter table public.stores
  drop constraint if exists stores_print_density_check;
alter table public.stores
  add constraint stores_print_density_check
  check (print_density in ('compact', 'normal', 'relaxed'));

alter table public.stores
  drop constraint if exists stores_print_margin_mm_check;
alter table public.stores
  add constraint stores_print_margin_mm_check
  check (print_margin_mm in (3, 5, 8));
