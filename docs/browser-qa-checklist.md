# Browser QA Checklist

Executable checklist for real, two-account, browser-based QA — run after
`docs/founder-environment-unblock-runbook.md`'s step 12. Two accounts (A and B, from the
runbook's step 10), one browser session each (a normal window + a private/incognito
window, or two browser profiles — **not** two tabs of the same session).

**Every row below is currently `BLOCKED`** — nothing in this checklist has been run in a
real browser with real accounts. Do not mark anything PASS from reading the code; PASS
means it was actually clicked through and observed. Fill in the last two columns as you
go; leave PASS/FAIL blank (or BLOCKED) for anything not yet attempted rather than
guessing.

Columns: **Step** | **Expected result** | **Result (PASS/FAIL/BLOCKED)** | **Evidence**
(screenshot filename, or the actual value observed — e.g. an error message, a row count).

---

## 1. Signup & onboarding

| # | Step | Expected result | Result | Evidence |
|---|---|---|---|---|
| 1.1 | Sign up Account A at `/signup` | Redirects to `/onboarding` immediately (confirm-email off) | BLOCKED | |
| 1.2 | Complete onboarding: country, school, graduation year, curriculum | Redirects to `/dashboard`; `profiles.onboarding_completed = true` | BLOCKED | |
| 1.3 | Sign up Account B, complete onboarding | Same as 1.1–1.2 | BLOCKED | |
| 1.4 | Onboarding: upload a CV (PDF/DOCX) | AI-extracted items shown on a review screen; nothing saved until confirmed | BLOCKED | needs `ANTHROPIC_API_KEY` |
| 1.5 | Onboarding: skip CV upload, add profile manually | Manual entry screens work, no AI dependency | BLOCKED | |

## 2. Public / private profile (`/u/[id]`)

| # | Step | Expected result | Result | Evidence |
|---|---|---|---|---|
| 2.1 | As A: Settings → Visibility → Public profile **off** (default) | Toggle off; `/u/<A>` shows locked state to B | BLOCKED | |
| 2.2 | As B: open `/u/<A-id>` while A is private and unconnected | Locked/not-found state, no basic fields shown | BLOCKED | |
| 2.3 | As A: Settings → Visibility → Public profile **on** | `/u/<A-id>` now shows basic fields (name, country, curriculum, grad year) to B | BLOCKED | |
| 2.4 | As A: viewing own profile at `/u/<A-id>` while still private | "Only you can see this" banner + full self-preview (portfolio included) | BLOCKED | |
| 2.5 | As B: open `/u/<A-id>` while A is public | Basic fields + portfolio/skills/sports/achievements all visible | BLOCKED | |
| 2.6 | Achievements visibility specifically: A has ≥1 activity/award/project; confirm it appears in B's view of A's public portfolio | Visible | BLOCKED | |
| 2.7 | Sports visibility specifically: A has ≥1 sports entry; confirm it appears in B's view | Visible, listed under the portfolio's sports category | BLOCKED | |
| 2.8 | A turns public profile back off; B reloads `/u/<A-id>` | Back to locked state — portfolio/basic fields both disappear for B | BLOCKED | |

## 3. Connections

| # | Step | Expected result | Result | Evidence |
|---|---|---|---|---|
| 3.1 | A public again. As B: open `/u/<A-id>`, click Connect | Button flips to "Request sent"; `connections` row `status='pending'` | BLOCKED | |
| 3.2 | As A: `/connections` → Incoming → Accept | Row moves to Accepted; Message button appears on both `/connections` and `/u/<B-id>` | BLOCKED | |
| 3.3 | Re-run 3.1 as a **decline** instead, on a fresh pending request (use a throwaway 3rd scenario or re-request after removing) | Row moves to Declined | BLOCKED | |
| 3.4 | Attempt to accept/decline an already-accepted or already-declined request again (direct action call, e.g. via browser devtools re-invoking the same button state if still rendered, or reloading a stale page) | Rejected with an error — fixed this pass, see `lib/social/connection-transitions.ts` | BLOCKED | |
| 3.5 | As A: private (not public) profile; B (unrelated, no connection) tries to open `/u/<A-id>` and Connect | "This profile isn't public" error, no row created | BLOCKED | |

## 4. Messaging

| # | Step | Expected result | Result | Evidence |
|---|---|---|---|---|
| 4.1 | As A: `/messages` → B → send "hello" | Appears immediately in A's thread | BLOCKED | |
| 4.2 | As B: open `/messages` **without reloading** (leave tab open before A sends) | New message appears without a manual reload — Realtime (migration 0031 required) | BLOCKED | needs 0031 applied |
| 4.3 | As B: open `/messages` | Conversation listed, unread badge = 1 | BLOCKED | |
| 4.4 | As B: open the thread | Unread badge clears; `read_at` set | BLOCKED | |
| 4.5 | As B: reply "hi back" | Sends; appears for A (Realtime, no reload) | BLOCKED | |
| 4.6 | Send 61 messages rapidly as A (over the 60/10min limit) | 61st is rejected with a rate-limit message | BLOCKED | |

## 5. Block / report / disconnect

| # | Step | Expected result | Result | Evidence |
|---|---|---|---|---|
| 5.1 | As B: thread with A → ⋮ → Block A | Composer replaced by "Unblock to send a new message" | BLOCKED | |
| 5.2 | As A (the one who got blocked, not the blocker): open the thread | Header says **"You can't message this student right now"** — NOT "You've blocked this student" (fixed this pass) | BLOCKED | |
| 5.3 | As A: confirm no phantom "Unblock" option is offered | ⋮ menu shows "Block A" (not "Unblock"), since A never blocked B | BLOCKED | |
| 5.4 | As A: try to send anyway (direct action call) | "You can't message this person." — no new row | BLOCKED | |
| 5.5 | As A: hover a message from B → Report → submit a reason | Dialog closes; `message_reports` row created (unreadable from the app until step 6) | BLOCKED | |
| 5.6 | As B: ⋮ → Unblock A | Composer returns for B; A can send again | BLOCKED | |
| 5.7 | As A: `/connections` → Remove the connection with B | Row hard-deleted | BLOCKED | |
| 5.8 | As A: `/messages` — confirm the B thread still appears, marked read-only | "No longer connected — read only" label; history still visible; no composer (fixed this pass) | BLOCKED | |
| 5.9 | As A: navigate directly to `/messages/<B-id>` and try to send via the API/action directly | Rejected — no accepted connection | BLOCKED | |
| 5.10 | SQL-verify: `select count(*) from public.messages where ...` for A/B | All messages from steps 4.1–4.5 still present despite the disconnect | BLOCKED | |

## 6. Moderation (needs `is_admin` + `SUPABASE_SECRET_KEY`)

| # | Step | Expected result | Result | Evidence |
|---|---|---|---|---|
| 6.1 | As admin: open `/admin` | Reports section shows the report from 5.5, with reporter/reported names and the reported message body | BLOCKED | |
| 6.2 | As admin: change the report's status to "Reviewing", add a resolution note, save | Status badge updates; `reviewed_by`/`reviewed_at` set | BLOCKED | |
| 6.3 | As a non-admin: navigate directly to `/admin` | 404 (not a redirect — doesn't reveal the panel exists) | BLOCKED | |
| 6.4 | As B (the reporter from 5.5): `GET /api/export-data`, inspect `message_reports` in the JSON | Own filed report present with `reason`/`status`, but **no** `reviewed_by`/`resolution_note` fields (fixed this pass) | BLOCKED | |

## 7. Sports & achievements (Digital Twin)

| # | Step | Expected result | Result | Evidence |
|---|---|---|---|---|
| 7.1 | As A: `/profile` → add a sports entry | Saves; appears in Sports section | BLOCKED | needs migration 0029 for `story_notes` field specifically, but the base save should work regardless |
| 7.2 | As A: add an activity, award, project | Each saves; profile score recomputes | BLOCKED | |
| 7.3 | As A: edit an existing achievement, including the story-notes field | Saves without a raw database error (was broken pre-0029; now degrades to a friendly retryable-looking error until 0029 is applied) | BLOCKED | needs 0029 applied for this to actually persist |

## 8. Essay Story Bank

| # | Step | Expected result | Result | Evidence |
|---|---|---|---|---|
| 8.1 | As A (with ≥1 achievement that has story notes): `/profile/story-bank` | Lists candidate experiences | BLOCKED | needs 0029 applied |
| 8.2 | Paste an essay prompt, select experiences, generate outlines | Real AI-generated outlines, organizing only what was actually recorded | BLOCKED | needs `ANTHROPIC_API_KEY` + 0029 |

## 9. AI Advisor

| # | Step | Expected result | Result | Evidence |
|---|---|---|---|---|
| 9.1 | As A: `/advisor`, ask a question | Real response from the live model, specific to A's actual profile | BLOCKED | needs `ANTHROPIC_API_KEY` |
| 9.2 | Continue the same conversation with a follow-up | Prior context is used (history round-trips correctly) | BLOCKED | |
| 9.3 | Attempt to pass another user's conversation id directly (devtools/direct call) | Rejected with "Conversation not found" (fixed this pass) | BLOCKED | |

## 10. University discovery & detail

| # | Step | Expected result | Result | Evidence |
|---|---|---|---|---|
| 10.1 | As A: `/universities`, browse World → Europe → country | Universities from the seed batch (step 8 of the runbook) appear | BLOCKED | needs seed batch applied |
| 10.2 | Open a university detail page | Programs, requirements, sources with retrieval dates shown | BLOCKED | |
| 10.3 | Save a target university | Appears under `/applications` or target list | BLOCKED | |
| 10.4 | Admission outlook for a saved target | Shows Reach/Competitive/Strong classification with an explicit "why" — never a bare percentage claiming false precision | BLOCKED | |

## 11. Opportunities

| # | Step | Expected result | Result | Evidence |
|---|---|---|---|---|
| 11.1 | As A: `/opportunities` | Matches from the seed batch, with match rationale shown | BLOCKED | needs seed batch |
| 11.2 | Save an opportunity, mark another "Not interested" with a reason | Both persist; feedback used for future matching | BLOCKED | |

## 12. Data export & settings/privacy

| # | Step | Expected result | Result | Evidence |
|---|---|---|---|---|
| 12.1 | As A: Settings → export data | Downloads a JSON file | BLOCKED | |
| 12.2 | Inspect the JSON: `messages` | Only rows where A is sender or recipient | BLOCKED | |
| 12.3 | Inspect: `connections` | Only rows where A is requester or recipient | BLOCKED | |
| 12.4 | Inspect: `blocked_users` | Only rows where A is the blocker (never rows where A is blocked) | BLOCKED | |
| 12.5 | Inspect: `sports_experiences`, `notifications` | Present, all rows `user_id = A` | BLOCKED | |
| 12.6 | Trigger export 6 times within an hour | 6th request rejected with a rate-limit error | BLOCKED | |
| 12.7 | As A: Settings → change display name, weekly capacity, busy mode | Each persists and reflects immediately | BLOCKED | |

## 13. Account deletion (do this last — destroys the account)

| # | Step | Expected result | Result | Evidence |
|---|---|---|---|---|
| 13.1 | As a throwaway account (not A or B, if you want to keep those for future QA): Settings → Delete account, confirm | Account and all owned rows removed (cascade); can no longer log in | BLOCKED | needs `SUPABASE_SECRET_KEY` |

---

## After completing this checklist

Update the "Result" column for every row actually attempted. Anything still `BLOCKED`
after the runbook's steps 1–11 are done means a genuine bug was found, not a missing
credential — file it before the next work session rather than leaving it silent in this
table.
