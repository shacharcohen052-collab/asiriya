-- The youth community gathering is a Thursday recurring event only.
-- Deactivate legacy rows that were created on another weekday.
UPDATE public.schedule_events
SET is_active = false
WHERE is_fixed = true
  AND source = 'fixed_schedule'
  AND title ILIKE '%ערב גיבוש%'
  AND EXTRACT(DOW FROM event_date) <> 4;
