# Can Proxola send commercial/product email to a 14-18 year old user?

**Status: research input to A4, not A4 itself.** A4 (the founder's own legal decision,
`docs/PROXOLA-PLAN.md`) is his to make. This document exists to give him a decidable
recommendation to make it from — not to make it for him. **Nothing here is a final
compliance claim.** Every place a real lawyer's confirmation matters more than this
document's own reading is marked explicitly, not buried. No email has been sent, and
nothing here grants authority to send one — that stays with the founder.

## The one-line answer

**Transactional/service email to the student — send it now, all four jurisdictions
already permit it.** **Marketing/commercial email to the student — build an opt-in
consent step before sending anything, and in Turkey specifically, get local counsel
to confirm the age question below before relying on self-consent.** **Anything to a
parent's own inbox is a different, easier question** — the recipient is an adult;
what needs care there is the *data* the email is built from, not who it's addressed to.

## Recommendation, stated so it's one choice

**Adopt a single internal rule rather than branching logic per country:** treat every
Proxola account holder aged 14-17 as *able to self-consent* to marketing email, with
a working, honored opt-out on every message, an explicit right-to-object notice on
the first message, and (UK/EU specifically) a completed DPIA before the first send.
**The one exception to build for, not route around: Turkey.** Turkish law has no
bright-line age (see below) — either (a) get a Turkish lawyer to confirm 14+
self-consent is safe before relying on it, or (b) as the safer default until that
confirmation exists, require the *parent's* İYS consent for any Turkish account
holder under 18. Recommend (b) as the starting posture, switchable to (a) once
confirmed, because getting this wrong in Turkey carries real per-message
administrative fines (see below), and the cost of waiting for one lawyer
conversation is small next to that.

This is the decidable version of a genuinely uneven legal picture — the four
jurisdictions actually disagree with each other on the self-consent age, sometimes
by a lot, and Turkey doesn't give a number at all. Uniform 14+ self-consent
(default), Turkey held back pending confirmation, is the version of "one rule" that
doesn't quietly assume away the one jurisdiction where the assumption is riskiest.

---

## What "commercial email to a minor" actually breaks into

Two different legal questions get run together if this is treated as one problem:

1. **Can this specific *type* of email be sent under a lighter "transactional/
   service" rule at all** — most of these regimes only require opt-in *marketing*
   consent; a message that's part of delivering a feature the account already has
   (a deadline reminder, a password reset, an already-requested digest) is usually
   not "marketing" in the first place.
2. **For the emails that *are* marketing — whose consent makes it valid**, the
   student's own, or a parent's, and at what age does that switch.

Proxola's actual planned emails split across this line differently, which is why
the "product-translatable breakdown" below matters more than a single yes/no.

## Jurisdiction findings, sourced

### EU / GDPR

**The rule that actually governs *email* marketing is the ePrivacy Directive, not
GDPR itself** — Article 13(1) requires prior opt-in consent before any unsolicited
commercial email; a narrow "soft opt-in" exception exists only for an *existing
customer* being offered *similar* products/services by the *same* company, with an
easy opt-out disclosed at collection.
Source: [Freshfields, "Consent required? CJEU issues landmark ruling on requirements
for marketing emails"](https://www.freshfields.com/en/our-thinking/blogs/technology-quotient/consent-required-cjeu-issues-landmark-ruling-on-requirements-for-marketing-email-102mgiz);
[ePrivacy Regulation project, Art. 16 commentary](https://eprivacy-regulation.org/articles/chapter-iii/article-16-eprivacy-regulation-unsolicited-and-direct-marketing-communications) — both retrieved 2026-09-04.

**GDPR Article 8 governs whether a minor's *own* consent (to that opt-in, or to data
processing generally) is legally valid.** Exact text, retrieved 2026-09-04 from
[gdpr-info.eu](https://gdpr-info.eu/art-8-gdpr/) (a full-text mirror; the
authoritative text is Regulation (EU) 2016/679 itself): *"the processing of the
personal data of a child shall be lawful where the child is at least 16 years old.
Where the child is below the age of 16 years, such processing shall be lawful only
if and to the extent that consent is given or authorised by the holder of parental
responsibility over the child."* Member states may set their own floor as low as 13.

**The exact age each member state chose is where this gets genuinely uncertain —
flagging rather than forcing a number.** Two searches for a consolidated table
disagreed on 5 of 13 target countries (Italy, Spain, Poland, Ireland, Czechia) —
[euCONSENT's table](https://euconsent.eu/digital-age-of-consent-under-the-gdpr/)
(retrieved 2026-09-04) gives Germany 16, France 15, Netherlands 16, Italy 14, Spain
14, Austria 14, Belgium 13, Poland 16, Finland 13, Portugal 13, Ireland 16, Czechia
15, Sweden 13 — a second search's synthesis gave different numbers for the same five.
**Not resolved here; every number in that range is 13-16, so treating 16 as the safe
internal ceiling (see recommendation above) is correct regardless of which table is
right for any one country** — but if the founder ever wants to rely on a
*lower*, country-specific number for a specific market, that needs a lawyer
confirming the current national implementing legislation directly, not this table.

### United Kingdom

Directly sourced from the ICO (UK's regulator) — both pages fetched live,
2026-09-04, `ico.org.uk`:

**Self-consent age: 13**, not 16 — the UK set its own post-Brexit floor. Exact text:
*"Article 8 of the UK GDPR sets the age at which children can consent to the
processing of their personal data in the context of an ISS at 13 years old."*
[Source](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/children-and-the-uk-gdpr-old/what-are-the-rules-about-an-iss-and-consent/).
**Every Proxola user in the 14-18 range is already above this** — no parental
consent needed for a UK 14-18 year old's own data-processing consent.

**Marketing specifically still needs its own opt-in under PECR** (the UK's
retained version of the ePrivacy Directive) — the ICO's own page: *"If you intend
to send electronic marketing messages to children then you need to comply with the
[PECR]... In many circumstances under PECR you need to ask for consent for direct
marketing."* [Source](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/children-and-the-uk-gdpr/what-if-we-want-to-target-children-with-marketing/), retrieved 2026-09-04.

**Two real operational requirements, not just a consent flag:** (1) a **DPIA is
mandatory** before marketing to children — the ICO names this explicitly as one of
the processing types it considers automatically high-risk; (2) children have the
**same right to object** as adults, and that right must be **disclosed at or before
the first marketing message**, not just technically honored.

**One live caveat, dated in the source itself:** the ICO's own page notes PECR's
underlying directive "is currently under review and the rules may be subject to
change" — worth a lawyer's confirmation of current status before this is load-
bearing, not treated as permanently fixed.

### Turkey

**No bright-line age exists in Turkish law for this — a materially different
situation from the EU/UK, not a gap in this research.** Turkish data law (KVKK, Law
No. 6698) doesn't set a number the way GDPR's Article 8 does. Instead it runs on the
Turkish Civil Code's "ayırt etme gücü" (capacity to understand/discernment)
doctrine — a case-by-case standard, not an age. Per legal-commentary synthesis of
that doctrine (KVKK's own dedicated page on this returned a homepage redirect rather
than the article when fetched live, 2026-09-04 — noted as a real access gap, not
silently worked around): a minor found to have "ayırt etme gücü" for a given
processing activity can consent to it themselves under Civil Code Article 16
(rights closely tied to the person don't need a legal representative's consent); a
minor found to lack it cannot, and a parent/guardian must consent instead. **This is
a fact-specific determination in Turkish law, not a number this document can supply.**

**Commercial email specifically is separately, strictly regulated** under Law No.
6563 and the resulting "İYS" (İleti Yönetim Sistemi) national consent registry —
senders must register, and *every* recipient's prior opt-in must be verified through
İYS before a commercial email is sent, with **administrative fines reported in the
hundreds of thousands of lira per unauthorized message** as of 2026.
[Source](https://www.cenuta.com/blog/6563-sayili-kanun-ve-iys-nedir-ticari-elektronik-ileti-yukumlulukleri-ve-ceza-rehberi-2026/), retrieved 2026-09-04 — a law-firm/compliance-vendor summary, not the primary regulation text; treat the fine figure as directionally real, not exact, without a primary-source check.
No age-specific carve-out was found within İYS's own rules — a minor's İYS consent
would fall back to the same ayırt-etme-gücü question above.

**This is the one jurisdiction in this brief where "get a lawyer to confirm" isn't
a formality — it's the actual missing piece**, and it's also the jurisdiction with
real, cited financial penalties for guessing wrong.

### United States

**COPPA does not apply to Proxola's 14-18 target range today.** Directly from the
FTC: COPPA's scope is children *under 13*; *"COPPA does not apply [to teens]."*
[Source: FTC, "Complying with COPPA: Frequently Asked Questions"](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions), synthesized 2026-09-04.

**Worth flagging as a live, dated regulatory-risk item, not current law:** a bill
("COPPA 2.0" / KIDS Act) that would extend COPPA-like protections to teens up to 17
**passed the US House on 2026-06-29** but has **not been enacted** — current
obligations are still the existing, under-13-only COPPA. If this becomes law, the US
answer for Proxola's actual age range changes; worth a standing note to revisit, not
something to build against today.

**For commercial email generally, CAN-SPAM applies** — and it has **no age-of-
recipient provision at all**. It's an **opt-out** regime, not opt-in: accurate
headers, a non-deceptive subject line, clear "this is an ad" labeling, a real postal
address, and a working, honored opt-out are the requirements — not prior consent.
[Source: FTC, CAN-SPAM Act compliance guide](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business), synthesized 2026-09-04. This is
genuinely more permissive than the EU/UK/Turkey's opt-in regimes for the same email.

**Not researched here, flagged rather than skipped silently:** US state law. Several
states (California notably) have their own minor-specific privacy statutes that can
be stricter than federal law for data *processing* (distinct from the email-sending
question CAN-SPAM covers). Out of scope for this pass — a real gap, not an
oversight — worth a lawyer's read once the founder knows which states carry
meaningful US traffic.

---

## Product-translatable breakdown

| Email type | Recipient | Classification | Consent needed from | Status |
|---|---|---|---|---|
| Deadline reminder (student's own saved deadline) | Student | Transactional/service — tied to a feature already in use | None beyond account signup | **Send now**, all 4 jurisdictions |
| Parent invite (inviting a parent to link an account) | Parent (address supplied by the student at setup) | Transactional/relationship, likely — recipient is an adult, message doesn't advertise anything to them | None beyond the student initiating it | **Send now** — but flag: if Turkey's İYS treats this as "ticari" regardless of framing, it may still need registration; a real, if narrow, open question worth one lawyer confirmation, not a blocker to everything else |
| B3b's parent monthly AI summary | Parent | Transactional/service to an adult recipient — the *minor-consent* question here is about processing the child's data to build the summary, not about marketing to a minor | Parent's own signup consent covers receipt; the underlying data-processing consent for the child is a separate, already-existing question (parent-link flow) | **Send now** on the email-recipient question; don't let this block on the marketing-consent research above — it was never gated on it |
| Upgrade/Ultra promotional email | Student | Marketing/commercial | Student's own opt-in (14-17 UK/EU-ceiling default), parent's opt-in in Turkey until confirmed otherwise | **Build the opt-in step and DPIA (UK/EU) before sending** |
| Upgrade/Ultra promotional email | Parent | Marketing/commercial, but recipient is an adult | Parent's own standard adult opt-in | **Send once a normal adult marketing-consent flow exists** — no minor-specific question at all |

The practical read: **most of what's actually blocked right now (B3b, parent
invites, deadline reminders) doesn't need this research to resolve — none of them
are commercial/marketing email to a minor.** The one real gate this research
produces is on *marketing* email *to the student*, which is a smaller slice of the
current backlog than "all mail sending" suggested.

## What still needs a real lawyer, named plainly

1. **Turkey's actual age threshold for a 14-17 year old's own consent validity** —
   this document found the doctrine, not a number, because Turkish law doesn't have
   one. A Turkish lawyer's read is the only way to responsibly move off the
   conservative parent-consent default above.
2. **Whether "parent invite" and "B3b's summary" survive Turkey's İYS as non-
   commercial** — likely yes, not confirmed.
3. **US state law** for minor-specific rules beyond COPPA/CAN-SPAM, once the
   founder knows which states matter.
4. **Current status of the UK's PECR review** the ICO's own page flags as ongoing.
5. **The exact EU per-country self-consent age**, if the founder ever wants a
   lower, country-specific number instead of the uniform-16-ceiling default.
