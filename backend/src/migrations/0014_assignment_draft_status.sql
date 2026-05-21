-- Draft assignments: visible to assignors on the board, not to officials until published.

alter table public.assignments
  drop constraint if exists assignments_status_check;

alter table public.assignments
  add constraint assignments_status_check
  check (status in ('DRAFT', 'PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED'));
