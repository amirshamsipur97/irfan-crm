-- The ONLY query the case study runs against the live CRM.
--
-- It selects counts, roles and dates. It selects no name, no telephone number,
-- no email address, no note and no money: the permission in
-- docs/CASE-STUDY-PERMISSION.md rules those out, and this file is kept in the
-- repository so the client can read exactly what is taken.
--
-- Run it read-only, save the output beside this file as metrics-<date>.md.

select
  -- who uses the system, by role only
  (select json_agg(t) from (
     select role, count(*) as members, count(*) filter (where is_active) as active
       from crm_users group by role order by count(*) desc) t) as team_by_role,

  -- how much it holds
  (select count(*) from crm_leads where not is_archived)  as leads,
  (select count(*) from crm_contacts)                     as contacts,
  (select count(*) from crm_accounts)                     as developer_accounts,
  (select count(*) from crm_developments)                 as projects,
  (select count(*) from crm_deals)                        as offers,

  -- how much it is used
  (select count(*) from crm_lead_history)                 as trail_entries,
  (select count(*) from crm_contact_negotiations)         as negotiation_rounds,
  (select count(*) from crm_collaborations)               as collaboration_requests,
  (select count(*) from crm_custom_columns)               as custom_columns,
  (select count(*) from crm_notifications)                as notifications,
  (select count(*) from crm_lead_history where remind_at is not null)                        as reminders_set,
  (select count(*) from crm_lead_history where remind_at is not null and reminder_done)      as reminders_completed,

  -- adoption over time
  (select json_agg(t) from (
     select to_char(date_trunc('month', lead_date), 'YYYY-MM') as month,
            count(*) as leads, count(distinct created_by) as agents_entering
       from crm_leads
      where not is_archived and lead_date >= date_trunc('month', now()) - interval '5 months'
      group by 1 order by 1) t) as leads_by_month,

  -- where the work comes from (channel names, not client data)
  (select json_agg(t) from (
     select source, count(*) as n from crm_leads where not is_archived
      group by 1 order by 2 desc limit 8) t) as lead_sources,

  -- speed
  (select round(avg(extract(epoch from (converted_at - created_at))/86400)::numeric, 1)
     from crm_leads where converted_at is not null) as avg_days_lead_to_contact;
