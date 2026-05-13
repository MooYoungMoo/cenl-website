create or replace function public.get_funding_source_status_summary()
returns table (
  funding_source_id uuid,
  funding_source_name text,
  currency text,
  materials_budget numeric,
  materials_paid numeric,
  materials_pending numeric,
  materials_remaining numeric,
  activities_budget numeric,
  activities_paid numeric,
  activities_pending numeric,
  activities_remaining numeric
)
language sql
security definer
set search_path = public
as $$
  with active_sources as (
    select
      fs.id,
      fs.name,
      fs.currency,
      coalesce(fs.materials_budget, 0)::numeric as materials_budget,
      coalesce(fs.activities_budget, 0)::numeric as activities_budget,
      fs.created_at
    from public.funding_sources fs
    where fs.is_active is distinct from false
      and fs.finished_at is null
    order by fs.created_at desc nulls last, fs.name asc
    limit 5
  ),
  classified_requests as (
    select
      pr.funding_source_id,
      case
        when pr.request_kind in ('activities', 'activity')
          or pr.cost_category = 'activities'
        then 'activities'
        else 'materials'
      end as request_category,
      pr.status,
      coalesce(pr.estimated_cost, 0)::numeric as amount
    from public.purchase_requests pr
    where pr.funding_source_id in (select active_sources.id from active_sources)
      and pr.status in ('paid', 'pending_payment')
  ),
  totals as (
    select
      funding_source_id,
      coalesce(sum(amount) filter (
        where request_category = 'materials' and status = 'paid'
      ), 0)::numeric as materials_paid,
      coalesce(sum(amount) filter (
        where request_category = 'materials' and status = 'pending_payment'
      ), 0)::numeric as materials_pending,
      coalesce(sum(amount) filter (
        where request_category = 'activities' and status = 'paid'
      ), 0)::numeric as activities_paid,
      coalesce(sum(amount) filter (
        where request_category = 'activities' and status = 'pending_payment'
      ), 0)::numeric as activities_pending
    from classified_requests
    group by funding_source_id
  )
  select
    active_sources.id as funding_source_id,
    active_sources.name as funding_source_name,
    active_sources.currency,
    active_sources.materials_budget,
    coalesce(totals.materials_paid, 0)::numeric as materials_paid,
    coalesce(totals.materials_pending, 0)::numeric as materials_pending,
    (
      active_sources.materials_budget
      - coalesce(totals.materials_paid, 0)
      - coalesce(totals.materials_pending, 0)
    )::numeric as materials_remaining,
    active_sources.activities_budget,
    coalesce(totals.activities_paid, 0)::numeric as activities_paid,
    coalesce(totals.activities_pending, 0)::numeric as activities_pending,
    (
      active_sources.activities_budget
      - coalesce(totals.activities_paid, 0)
      - coalesce(totals.activities_pending, 0)
    )::numeric as activities_remaining
  from active_sources
  left join totals on totals.funding_source_id = active_sources.id
  order by active_sources.created_at desc nulls last, active_sources.name asc;
$$;

revoke all on function public.get_funding_source_status_summary() from public;
grant execute on function public.get_funding_source_status_summary() to authenticated;
