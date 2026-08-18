-- Adds "online_program" as its own opportunity_category value. Until now, a fully-online,
-- structured course (Coursera, Stanford's for-credit ULO courses, live-online AI/finance
-- classes) had no honest home in the enum -- the closest existing value, academic_program,
-- doesn't distinguish "online, from anywhere" from "in-person, on a campus", which is a real
-- practical difference for families weighing cost, travel, and visas. Named explicitly in the
-- product spec's opportunity category list alongside summer_program/internship/etc.
alter type opportunity_category add value if not exists 'online_program';
