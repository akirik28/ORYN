# What Oryn actually sends by email today — measured against the İYS line

**Status: research and classification, no build, no recommendation.** Third pass applying the
transactional/commercial distinction `docs/hukuki-ek-2-ticari-ileti-onayi-2026-09-03.md` set up
for the waitlist question, this time against something live rather than hypothetical. Checked
against `origin/main`@`ae750ba9`.

## The clean result, stated first

**Everything that leaves the product as email today is unambiguously transactional. Nothing
commercial ships.** And the one genuinely interesting case — deadline reminders — already
exists as a live feature, but has never sent an email: it's in-app only. That's a real,
checked finding, not an assumption that nothing needed checking.

## What actually sends email — read from the code, not inferred

Grepped for every email-sending mechanism in the codebase (Resend, SendGrid, Nodemailer, SMTP,
Mailgun, Postmark, or any raw `fetch` to an email API) — **zero hits, anywhere.** Oryn has no
custom email-sending code at all. The only outbound email is Supabase Auth's own built-in
mechanism, reached from exactly two call sites in `app/(auth)/actions.ts`:

1. **`supabase.auth.signUp()`** — sends a signup-confirmation email, but only *if* email
   confirmation is enabled on the live Supabase project's own Auth settings. The code handles
   both states (`if (data.session) redirect("/onboarding")` — a session comes back immediately
   when confirmation is off, so no email step exists in the flow at all). **Which state the live
   project is actually in wasn't confirmed this pass** — that's a project dashboard setting, not
   something visible in the repository.
2. **`supabase.auth.resetPasswordForEmail()`** — sends a password-reset email. This one is
   reachable whenever a user requests a reset, regardless of the signup-confirmation toggle.

**Both are core account-security mail — a signup confirmation and a password reset — the
textbook transactional case in every framework this kind of question comes up in.** 6563 sayılı
Kanun's own stated scope (per the research behind the earlier addendum) is "tanıtım, indirim,
hediye, kampanya veya reklam içeriği" (promotional, discount, gift, campaign, or advertising
content) — neither message contains any of that; both exist purely to let the account holder
complete an action they themselves initiated (creating the account, recovering access to it).

## The notification system — confirmed to send no email at all, today

`lib/notifications/create.ts`'s `createNotification()` is the single function every
notification category in the product goes through (Phase 24's own design — see that file's own
comment). **Read in full: it does exactly one thing after checking the student's mute
preference — `supabase.from("notifications").insert(...)`.** No email call, no external API, no
`fetch`. Every one of the seven categories (`deadline`, `new_opportunity`, `weekly_plan`,
`profile_update`, `university_data_changed`, `connection`, `message`) lands in the same
database-backed in-app list, read via the notification bell — none of them reach a student who
isn't currently looking at the product.

**This includes the deadline-reminder feature specifically, and it's live, not hypothetical.**
`lib/deadlines/scan.ts` is a real, running job (Phase 23/24) that calls `createNotification({
category: "deadline", ... })` when a saved deadline crosses a reminder threshold — the exact
"your application closes in 3 days" case. **It has never sent an email.** In-app notifications
sit outside 6563's scope as commonly described (the law governs messages sent via
"elektronik posta, kısa mesaj ve benzer elektronik iletişim araçları" — channels that reach
someone outside the product; an in-app list a logged-in user checks isn't that) — this pass
didn't find anything suggesting otherwise, though that reading wasn't independently confirmed
against the statute's own scope article this pass either.

## The prospective question — worth answering before, not after, an email channel is added

**If a future pass adds email delivery to the notification system — the architecture (one
category, one preference column, one function) would make this a small change — the deadline
category is the one CEO flagged, and it's a real judgment call, not a clean transactional case
the way password reset is.**

Read both ways, hedged, not resolved:

- **Reads as transactional:** the student themselves saved this specific deadline; the message
  is purely informational about something already in their own account, with no promotional,
  discount, or campaign content — the same shape 6563's own definition names. Functionally
  closer to a calendar reminder or a shipping notification than to marketing.
- **Reads as closer to the line:** it's an engagement/retention message in a broader sense —
  it's part of what keeps a student opening the product regularly, even though its specific
  content is service information, not an offer.

**This document's own lean, not a settled answer: closer to transactional, on 6563's own stated
definition — but this is exactly the kind of borderline case worth a specific, direct question
to counsel before the feature ships, not after, given the lawyer is already engaged on the
adjacent questions this week.**

## The minor angle — and why it reads differently here than in the last two addenda

**Checked specifically, not skipped: TMK Article 16's "borç altına girme" (incurring an
obligation) framing, which drove the finding in both prior addenda, likely does not
independently apply to transactional service mail.** A password-reset email, a signup
confirmation, or even a hypothetical deadline-reminder email creates no new obligation for the
recipient — they're operational to a relationship (the account itself) that already exists, and
whose own minor-consent question is already the open item in `LEGAL_REVIEW.md` §3/§6. That's a
meaningfully different shape from the prior two findings: a paid subscription (addendum 1) and
a commercial marketing message (addendum 2) both create or promote something new for the minor
to agree to; a password-reset email does not. **This is this document's own reasoning by
analogy, not an independently sourced legal conclusion** — flagged the same way the prior two
addenda flagged their own TMK readings, and worth counsel confirming rather than assuming settled.

## Packaging — not addendum 3, and here's why

Addenda 1 and 2 existed because a live gap needed a counsel answer before a real decision could
be made (can the product ever bill a minor; can the product ever email the waitlist). **Nothing
here is live and blocked the same way — both real emails today are clean transactional cases,
and the one ambiguous case isn't shipping as email at all.** Making this a third urgent addendum
would overstate today's actual exposure. The one genuinely open question — the deadline-reminder
classification, if email delivery is ever added — is real and worth asking while the lawyer is
engaged this week (asking now is cheap; asking after the feature ships and needs to be pulled
back is not), but it's a "worth including in the batch of questions this week" note, not a
same-urgency fourth document. Leaving that call explicitly to whoever's coordinating the
counsel conversation, rather than deciding it here.

## Sources

- Direct reading: `app/(auth)/actions.ts` (both Supabase Auth call sites), `lib/notifications/
  create.ts` (in full), `lib/deadlines/scan.ts` (the live deadline-reminder job), `lib/env.ts`
  (`NEXT_PUBLIC_APP_URL`'s actual, general-purpose usage — not email-specific, contrary to what
  might be assumed from its relevance to auth redirect links specifically).
- `docs/hukuki-ek-2-ticari-ileti-onayi-2026-09-03.md` — source of the 6563/İYS scope research
  this document applies rather than re-derives.
- Codebase-wide grep for any custom email-sending mechanism — none found, not assumed absent.

## Unresolved questions

Whether email confirmation is currently enabled on the live Supabase project (a dashboard
setting, not visible in the repository) — doesn't change the classification (confirmation mail
is transactional either way), only whether it's currently firing at all. Whether 6563's own
statute text explicitly scopes itself to messages reaching a recipient outside the product,
the way this document assumed for in-app notifications — read from secondary description, not
independently confirmed against the statute's own scope article. The deadline-reminder
classification itself, deliberately left open for counsel rather than resolved here.
