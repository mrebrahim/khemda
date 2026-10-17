-- المهمات بقت بتفتح ٧ الصبح، فميعاد التذكير بقى: الصبح أول ما تفتح، أو بالليل
alter table public.reminder_prefs drop constraint if exists reminder_prefs_slot_check;
update public.reminder_prefs set slot = 'morning' where slot = 'evening';
alter table public.reminder_prefs alter column slot set default 'morning';
alter table public.reminder_prefs
  add constraint reminder_prefs_slot_check check (slot in ('morning', 'night'));
