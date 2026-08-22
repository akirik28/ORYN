-- DLOPP batch: deadline / cycle_status / current_cycle_label updates for 51 opportunities
-- (52 including the Concord Review follow-up below), applied and verified 2026-08-22.
-- Source: RES-R2's dlopp_batch1-5.jsonl (74 records) + dlopp_rcheck1.jsonl (3 recovered
-- records superseding B1-03/B4-10/B4-12). Cleared for ingestion by ORYN-BASORG after
-- RES-V1 (contract/ID/monotonicity, PASS) and RES-V2 (source, PASS) verdicts.
--
-- Every field written here passed lib/opportunities/monotonic-guard.ts's RULE-INGEST-003
-- check (never replace a populated field with a less-informative one) — mechanically for
-- most records, or via an explicit BASORG ruling backed by independent source evidence for
-- SIP, Ron Brown, and Conrad Challenge (see docs/handoffs/i2_dlopp_ingest-report.md for the
-- full per-record reasoning and the outcome breakdown: 82 written / 65 skipped-as-
-- destructive / 34 held-pending-source-verification / 39 deferred-by-policy (free-text
-- current_cycle_label, out of the guard's domain per RULE-INGEST-004) / 2
-- refused-inadmissible-source (CyberPatriot — RULE-FETCH-005)).
--
-- Idempotent by construction — every UPDATE guarded by id AND each written field's
-- exact prior live value, so re-running is a safe no-op once applied. Dry-run confirmed
-- via last_verified_at-bump check (not mere row existence — a weaker check that would
-- have masked a real bug caught before this ran: guard predicates on a null live value
-- must use IS NULL, since `field = null` is never TRUE in Postgres).

begin;

update opportunities set cycle_status = 'closed', last_verified_at = now() where id = 'c00e6c34-e5a7-4013-be39-882cff33ca7a' and cycle_status = 'closed';
update opportunities set current_cycle_label = 'Battlecode 2026 (ended)', last_verified_at = now() where id = '7997f38c-0d5d-47fb-9288-839621268ec6' and current_cycle_label is null;
update opportunities set deadline = '2027-02-21', last_verified_at = now() where id = 'cb4a1030-d035-4c1f-8579-37c458a88b0e' and deadline = '2027-02-21';
update opportunities set deadline = '2026-09-15', last_verified_at = now() where id = '0412d94f-8b28-4f37-933c-cf6198914c12' and deadline = '2026-09-15';
update opportunities set deadline = '2026-02-15', cycle_status = 'closed', current_cycle_label = 'BrUMO 2026 Online (closed)', last_verified_at = now() where id = '6f0daac1-7f07-45da-a330-dc900be73ab9' and deadline is null and cycle_status = 'unverified' and current_cycle_label is null;
update opportunities set deadline = '2026-10-26', cycle_status = 'open', current_cycle_label = '2026 Congressional App Challenge', last_verified_at = now() where id = '10b69474-db59-4b4d-8a48-11526e7220a7' and deadline = '2026-10-26' and cycle_status = 'open' and current_cycle_label = '2026 Congressional App Challenge';
update opportunities set cycle_status = 'upcoming', current_cycle_label = '2026-2027 season', deadline = '2026-10-30', last_verified_at = now() where id = '1f7b2e52-1900-4953-8271-63224c9e1fc0' and cycle_status = 'upcoming' and current_cycle_label is null and deadline = '2026-10-29';
update opportunities set deadline = '2026-03-04', current_cycle_label = '2026 contest (concluded; results announced April 24, 2026)', last_verified_at = now() where id = 'd3dc512f-ed1e-43f6-a85b-294a599df0da' and deadline = '2026-03-04' and current_cycle_label is null;
update opportunities set cycle_status = 'upcoming', last_verified_at = now() where id = '40c69cc2-0567-4ac7-bcb0-553dc63770f7' and cycle_status = 'upcoming';
update opportunities set deadline = '2026-11-17', cycle_status = 'upcoming', last_verified_at = now() where id = 'db25d327-ee37-4414-9003-f5654f64d3aa' and deadline = '2026-11-17' and cycle_status = 'upcoming';
update opportunities set deadline = '2026-03-07', last_verified_at = now() where id = '27274e04-50f4-4e82-9b7e-c5dbaace4bbe' and deadline is null;
update opportunities set cycle_status = 'date_not_announced', current_cycle_label = '2026-27 cycle (event "spring 2027", tentative)', last_verified_at = now() where id = 'a4a24425-2a6f-4902-99a4-4fb43dc110dd' and cycle_status = 'date_not_announced' and current_cycle_label is null;
update opportunities set cycle_status = 'upcoming', last_verified_at = now() where id = 'b41bf5f5-d2cb-4f5d-84e5-8d9e8630af07' and cycle_status = 'upcoming';
update opportunities set deadline = '2026-05-31', cycle_status = 'closed', last_verified_at = now() where id = '104c940f-f3fa-46c9-9e52-2abf69e360d4' and deadline = '2026-05-31' and cycle_status = 'closed';
update opportunities set cycle_status = 'closed', last_verified_at = now() where id = '95b59593-14ce-4d3d-94d9-9b16b5d25675' and cycle_status = 'closed';
update opportunities set cycle_status = 'date_not_announced', current_cycle_label = 'page still shows the 2025-2026 season (nationals April 10-12, 2026, Duke University — concluded)', last_verified_at = now() where id = 'ce587c91-a21f-4359-a535-70a9736494f0' and cycle_status = 'date_not_announced' and current_cycle_label is null;
update opportunities set cycle_status = 'upcoming', last_verified_at = now() where id = 'c2c3e0e3-9c9a-4d8f-ae67-54b37e4cdd85' and cycle_status = 'upcoming';
update opportunities set cycle_status = 'upcoming', last_verified_at = now() where id = '718cc3c4-2165-49c2-9716-e1be2a0be482' and cycle_status = 'upcoming';
update opportunities set cycle_status = 'date_not_announced', current_cycle_label = 'next edition (page gives no edition number; describes a Spring-semester event)', last_verified_at = now() where id = '97da3310-d517-4fea-bdec-2adeb92d3515' and cycle_status = 'date_not_announced' and current_cycle_label is null;
update opportunities set cycle_status = 'upcoming', last_verified_at = now() where id = '4a6c3f9a-bb11-4eb2-b304-f832aeb3799a' and cycle_status = 'upcoming';
update opportunities set deadline = '2027-01-14', cycle_status = 'upcoming', last_verified_at = now() where id = '30a605ab-8c51-4f06-9e66-60cc7347c5df' and deadline = '2027-01-14' and cycle_status = 'upcoming';
update opportunities set cycle_status = 'open', last_verified_at = now() where id = '00aaf965-016f-42ef-a4a1-3a825f104a6d' and cycle_status = 'open';
update opportunities set deadline = '2027-01-11', cycle_status = 'upcoming', last_verified_at = now() where id = '96a437a7-781b-4046-b7ad-baf0069be8e5' and deadline is null and cycle_status = 'upcoming';
update opportunities set deadline = '2027-04-01', cycle_status = 'upcoming', last_verified_at = now() where id = '724a375c-fa54-439c-b8d2-c86869fed88d' and deadline = '2027-04-01' and cycle_status = 'upcoming';
update opportunities set cycle_status = 'upcoming', current_cycle_label = '2026/27 contest year (orders accepted from September 2026)', last_verified_at = now() where id = '51c4b57b-7ea1-4503-b9e6-f1468dc9f3f8' and cycle_status = 'upcoming' and current_cycle_label is null;
update opportunities set cycle_status = 'date_not_announced', last_verified_at = now() where id = '59998106-2a2c-4e35-ba9b-0bdcd5ca586d' and cycle_status = 'date_not_announced';
update opportunities set deadline = '2026-09-11', cycle_status = 'open', last_verified_at = now() where id = '2e2f995a-2ac3-4138-a3df-ca4e4033aa36' and deadline = '2026-09-11' and cycle_status = 'open';
update opportunities set cycle_status = 'open', last_verified_at = now() where id = '89fa66fc-c7cf-4fa6-8b28-1a016e860484' and cycle_status = 'open';
update opportunities set deadline = '2026-02-01', cycle_status = 'closed', last_verified_at = now() where id = '13d9416e-d2a7-4f55-b851-7d76acab2cb3' and deadline is null and cycle_status = 'closed';
update opportunities set deadline = '2026-02-20', cycle_status = 'closed', last_verified_at = now() where id = 'd9b1f04e-5be4-44c1-9d34-c5979ad57689' and deadline = '2026-02-20' and cycle_status = 'closed';
update opportunities set deadline = '2026-05-22', cycle_status = 'closed', current_cycle_label = '2026 Middle School Summer Program (concluded; finals August 7, 2026)', last_verified_at = now() where id = '8bb401fa-d53f-45ae-8968-241ef641ccf4' and deadline is null and cycle_status = 'closed' and current_cycle_label is null;
update opportunities set cycle_status = 'open', current_cycle_label = 'no cycles — journal submission model', last_verified_at = now() where id = '19ebc71c-1997-41aa-aeb1-728ec5be176c' and cycle_status = 'unverified' and current_cycle_label is null;
update opportunities set cycle_status = 'open', last_verified_at = now() where id = '61558e02-0b11-4221-bbbb-fc98bc765da8' and cycle_status = 'open';
update opportunities set cycle_status = 'open', last_verified_at = now() where id = '51ea0b34-7396-4a4b-89e7-fd4b776b79fa' and cycle_status = 'open';
update opportunities set cycle_status = 'open', last_verified_at = now() where id = 'bdc4bdb5-5893-4e05-bf9c-e520d7da2817' and cycle_status = 'open';
update opportunities set cycle_status = 'closed', current_cycle_label = 'SIP 2026 (concluded — "SIP 2026 Has Officially Concluded")', last_verified_at = now() where id = '7aa518f8-3ba5-4de9-b61c-7538fc41957b' and cycle_status = 'upcoming' and current_cycle_label = '2026';
update opportunities set deadline = '2026-02-22', cycle_status = 'closed', last_verified_at = now() where id = 'ad0ef06f-4205-4300-a994-800b80c40a8c' and deadline = '2026-02-22' and cycle_status = 'closed';
update opportunities set cycle_status = 'date_not_announced', current_cycle_label = 'page''s newest cohort references are 2025 ("three-dot-dash-global-teen-leaders-2025" navigation)', last_verified_at = now() where id = '4e17909d-ee0f-47c4-a901-44dda548fb9c' and cycle_status = 'date_not_announced' and current_cycle_label is null;
update opportunities set cycle_status = 'closed', last_verified_at = now() where id = '7a0b2b4e-189d-4e7b-b4a1-ef8886e3a23d' and cycle_status = 'closed';
update opportunities set current_cycle_label = 'no central cycle — per-city application model', last_verified_at = now() where id = '4a1ef2dd-ab26-44e0-b6a5-2e49aca13dc0' and current_cycle_label is null;
update opportunities set cycle_status = 'open', last_verified_at = now() where id = '8a7c89e4-e63a-4f64-a76d-4bae1b31e889' and cycle_status = 'open';
update opportunities set cycle_status = 'date_not_announced', last_verified_at = now() where id = 'c64b7050-75f9-45f8-b2ab-5b6ff14953dc' and cycle_status = 'date_not_announced';
update opportunities set cycle_status = 'closed', last_verified_at = now() where id = 'b1e010e6-3bef-4742-8b09-ceaf7801f104' and cycle_status = 'closed';
update opportunities set deadline = '2026-09-30', cycle_status = 'open', last_verified_at = now() where id = '690eba7f-0de9-4298-b746-c3456391b9b5' and deadline = '2026-09-30' and cycle_status = 'open';
update opportunities set deadline = '2026-11-11', cycle_status = 'open', last_verified_at = now() where id = 'b0ba4e37-5665-4ed2-b20c-997d3b09cb6e' and deadline = '2026-11-11' and cycle_status = 'open';
update opportunities set cycle_status = 'date_not_announced', last_verified_at = now() where id = 'bc729c68-0511-40bb-a590-e2fbaa277a56' and cycle_status = 'date_not_announced';
update opportunities set cycle_status = 'date_not_announced', last_verified_at = now() where id = '5589e4c8-181a-4a2e-bf16-edd13b274846' and cycle_status = 'date_not_announced';
update opportunities set deadline = '2026-10-01', cycle_status = 'open', last_verified_at = now() where id = 'a2c63505-1481-4a1f-94cc-6ab86dc35405' and deadline = '2026-10-01' and cycle_status = 'open';
update opportunities set deadline = null, cycle_status = 'date_not_announced', last_verified_at = now() where id = 'abe62a46-56f4-449a-b008-d072b1be5dc4' and deadline = '2026-12-01' and cycle_status = 'upcoming';
update opportunities set deadline = '2026-09-15', cycle_status = 'open', last_verified_at = now() where id = '7a422fba-db1a-42a1-b96f-d3bcdf6afa56' and deadline = '2026-09-15' and cycle_status = 'open';
update opportunities set cycle_status = 'closed', last_verified_at = now() where id = '34033f8a-51e1-4c73-9b7e-2e3819a348dc' and cycle_status = 'unverified';

commit;

-- Follow-up, applied separately after BASORG's ruling landed (RES-V2 confirmed the
-- Concord Review Emerson Prize's quarterly dates are issue-batching cutoffs on a rolling
-- model, not an application gate — consistent with two same-shape rolling journals
-- (IJHSR, JRHS) already `open` elsewhere). Its current_cycle_label was deliberately NOT
-- written here: unlike SIP/Ron Brown, the proposed label names different months
-- ("publication" Sept/Dec/Mar/June) than the live one ("deadlines" Aug/Nov/Feb/May) — two
-- calendar claims that may both be true, not one fact in two phrasings. Left held.
update opportunities set cycle_status = 'open', last_verified_at = now()
where id = '93d45f34-4078-4d15-be6f-d6e157a21943' and cycle_status = 'upcoming';
