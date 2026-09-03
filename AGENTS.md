<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Product build specification

The original founder prompt this product was built against, verbatim except for two
documented product-name changes — nothing else has been altered. First: the prompt said
"Career AI" throughout; it was renamed to "Oryn" for consistency with the rest of the
codebase. Second, disclosed here rather than applied silently: renamed from "Oryn" to
"Proxola" on 2026-09-03, per the founder's own go-ahead on a full product rename that
night, applied everywhere else in the codebase this same night. `PRODUCT_SPEC.md` is a
short orientation summary of this document; when the two disagree, this file wins.

---

PROXOLA — MASTER BUILD PROMPT
You are the lead product engineer, AI architect, data engineer, UX designer, and technical product manager responsible for building Proxola from zero into a polished, working web application.
You are not here to only write a product plan, mockup, prototype, or architecture document.
You must build the actual product.
Do not continuously ask me for decisions.
When something is ambiguous:

1. choose the most sensible product decision,
2. document the assumption,
3. implement it,
4. keep the architecture reversible,
5. continue.

Only stop if continuing would literally be impossible because of a missing credential, inaccessible external service, or destructive action requiring explicit human approval.
Even when an API credential is missing, continue building everything else and create the correct integration, environment variable, error states, tests, setup instructions, and developer fallback.
Do not replace a real integration with fake data just because setup is inconvenient.
0. PRODUCT NAME
Working name:
Proxola
Product category:
Personal Career Operating System for Students
Initial target user:
Students aged approximately 14–18 who are preparing themselves for competitive universities and future careers.
Initial geographic focus:

* United States
* United Kingdom
* Europe
* Turkey
* international students applying abroad

The architecture must be global from day one.
1. PRODUCT VISION
Proxola should become the central place where a student manages:

* academic history
* grades
* standardized tests
* AP / IB / A-Level coursework
* extracurricular activities
* leadership
* competitions
* awards
* certificates
* projects
* entrepreneurship
* research
* volunteering
* work experience
* internships
* summer programs
* career goals
* university goals
* university applications
* application deadlines
* supporting evidence
* achievements
* personal development
* opportunity discovery
* AI-generated recommendations

The product should answer one central question extremely well:
What should I do next to improve my future opportunities?
Proxola should not merely store a student's CV.
It should continuously:
Capture → Verify → Organize → Analyze → Benchmark → Discover → Plan → Act → Reflect → Update → Repeat
2. CORE PRODUCT PRINCIPLE
Proxola must behave more like an intelligent career advisor than a generic chatbot.
A generic chatbot says:
You could try doing research.
Proxola should say:
Leadership is already one of the strongest areas of your profile. Starting another school club is unlikely to materially improve your profile. Your largest current gap is research exposure. I recommend spending the next four weeks completing one small economics research project instead.
The system must understand opportunity cost.
It must sometimes explicitly tell the student:
Do not do this.
or:
This is currently a low-priority activity for you.
The goal is not maximum activity.
The goal is maximum development per unit of student time.
3. PRODUCT POSITIONING
Proxola is NOT primarily:

* a CV builder
* a university ranking website
* an admissions calculator
* a task manager
* an opportunity directory
* a certificate wallet
* a chatbot
* a social network

It combines these capabilities into:
A Personal Career Operating System
The AI advisor is the intelligence layer connecting everything.
4. EXECUTION RULES
Follow these rules during the entire build.
Rule 1 — Do not ask unnecessary questions
Do not ask me:

* what button color I prefer
* what database field name I prefer
* whether a modal or page is better
* whether a score should appear on the left or right
* whether a field should be nullable
* what default sorting method to use
* what empty state copy should say

Make sensible product decisions yourself.
Rule 2 — Build in phases
Complete each phase before advancing.
For every phase:

1. implement
2. run lint
3. run type checks
4. run relevant tests
5. test major user flow
6. fix errors
7. update `PHASE_STATUS.md`
8. continue

Do not merely describe what should be built.
Build it.
Rule 3 — Never knowingly leave broken code
Do not move to the next phase with:

* unresolved TypeScript errors
* broken imports
* missing migrations
* invalid database references
* obvious console errors
* broken navigation
* failed build
* API keys accidentally exposed
* fake buttons that do nothing

Rule 4 — No fake production behavior
Placeholder content is allowed only for development fixtures.
Never make production functionality silently return fabricated data.
If an external API is unavailable:
show:
Data temporarily unavailable.
Do NOT generate imaginary university statistics.
Rule 5 — Prefer official sources
For university requirements, admission information, eligibility, deadlines, and similar high-impact information:
Priority order:

1. official university website
2. official government dataset
3. official application platform
4. recognized academic/public dataset
5. secondary data source

Store source URLs and retrieval dates.
5. TECHNOLOGY STACK
Use this stack unless a genuine technical incompatibility requires changing something.
Frontend

* Next.js
* App Router
* TypeScript strict mode
* React
* Tailwind CSS
* shadcn/ui
* Lucide icons

Backend

* Supabase
* PostgreSQL
* Supabase Auth
* Supabase Storage
* Supabase Edge Functions where appropriate
* Supabase scheduled jobs / cron where appropriate

AI
Primary AI provider:
Anthropic Claude API
Do not expose API credentials in the browser.
All model calls must happen server-side.
Create an abstraction:

```ts
interface AIProvider {
  generateStructured<T>(request: AIRequest): Promise<T>
  generateText(request: AIRequest): Promise<string>
}

```

The application must not be deeply coupled to one specific model identifier.
Use an environment variable such as:

```env
ANTHROPIC_MODEL=

```

Provide a sensible default only when confirmed available.
Allow changing the model without editing business logic.
6. EXTERNAL DATA PROVIDERS
Create a provider architecture instead of scattering fetch requests across the application.
Use interfaces such as:

```ts
interface UniversityDataProvider
interface OpportunityProvider
interface ResearchProvider
interface AIProvider

```

Each provider must:

* normalize responses
* handle rate limits
* handle API failures
* provide source metadata
* provide last-updated timestamps
* validate responses
* avoid corrupting existing good data after failed refreshes

7. UNITED STATES UNIVERSITY DATA
Use the official U.S. Department of Education College Scorecard as the primary structured source for U.S. institutions where suitable.
Create:

```ts
CollegeScorecardProvider

```

Use it for data such as:

* institution identity
* location
* institution type
* admission statistics where available
* standardized test data where available
* student size
* cost
* graduation information
* fields of study
* other appropriate official institution statistics

Store the raw source reference and normalized fields separately.
Never treat a general institutional acceptance rate as an individual student's probability of acceptance.
8. EUROPEAN UNIVERSITY DATA
European admissions systems vary heavily by country.
Do NOT pretend there is a single European admissions API.
Create a country-aware data system.
Architecture:

```text
University
    ↓
Country
    ↓
CountryAdmissionProvider

```

Support initially:

* USA
* UK
* France
* Netherlands
* Germany
* Italy
* Switzerland
* Turkey
* generic Europe fallback

For European institution-level master data, design support for sources such as ETER / European higher education datasets where appropriate.
For France, create an ingestion pathway capable of handling official Parcoursup open-data datasets.
For countries without reliable structured admission datasets:
use official university/program pages and provide:

* entry requirements
* academic prerequisites
* language requirements
* tests
* important dates
* program-specific requirements
* selectivity classification where defensible

Do not invent individualized acceptance probabilities where reliable calibration data does not exist.
9. LIVE WEB INFORMATION
Use Tavily through the backend for:

* discovering opportunities
* finding official competition pages
* locating application deadlines
* locating summer programs
* locating university requirement pages
* retrieving current information
* updating stale records

Create:

```ts
TavilySearchProvider

```

Use a search-then-extract workflow where appropriate.
For important student-facing facts, store:

```text
source_url
source_domain
retrieved_at
source_type
confidence
raw_excerpt_or_structured_evidence

```

Prefer official domains.
10. RESEARCH DATA
Create:

```ts
OpenAlexResearchProvider

```

Use OpenAlex for academic discovery, including:

* papers
* topics
* authors
* institutions
* research directions

Proxola should use research literature to help generate realistic student-level research ideas.
Example:
Student interest:

```text
Economics
Artificial Intelligence
Youth Employment

```

Proxola can identify current research themes and generate an achievable project such as:
Analyze whether youth unemployment differs by educational attainment across selected OECD countries.
The system should scale the difficulty to the student's age and experience.
11. PRIVACY-FIRST EVIDENCE SYSTEM
Students may add evidence for an achievement.
Evidence must initially be optional.
Example achievement:

```text
International Competition
Bronze Medal
2026

```

Status:

```text
Self Reported

```

If document added:

```text
Evidence Added

```

Future status:

```text
Verified

```

Do NOT label something as independently verified merely because a file was uploaded.
Use:

```text
self_reported
evidence_added
verified
verification_rejected

```

Create private storage buckets for evidence.
Users must only access their own private documents unless explicit sharing permissions exist.
Use signed access mechanisms where needed.
Do not make certificates publicly addressable by default.
12. MINOR-SAFE PRODUCT DESIGN
Because many users may be minors:

* minimize data collection
* do not request unnecessary identification documents
* make evidence optional
* provide account deletion
* provide document deletion
* provide data export
* provide privacy controls
* avoid public-by-default profiles
* avoid exposing school/student information
* avoid unnecessary precise location collection
* do not build public student messaging in V1

Add suitable consent/data-processing fields in the architecture, but do not pretend to provide final jurisdiction-specific legal compliance.
Document where professional legal review is required before public launch.
13. DESIGN PHILOSOPHY
The UI must feel:

* premium
* modern
* calm
* intelligent
* simple
* credible
* student friendly without feeling childish

Avoid:

* rainbow dashboards
* excessive gradients
* excessive gamification
* giant card grids
* childish illustrations
* clutter
* overly dense analytics
* unnecessary animations

Use generous whitespace.
Typography should be strong and readable.
Use one primary accent system and neutral supporting colors.
Dark mode can be supported later unless trivial to implement cleanly.
Mobile responsiveness is mandatory.
PHASE 1 — FOUNDATION
Build the technical foundation.
1.1 Initialize project
Set up:

* Next.js
* strict TypeScript
* Tailwind
* shadcn/ui
* ESLint
* formatting
* Supabase client
* server Supabase client
* environment configuration

Create:

```text
.env.example
README.md
PRODUCT_SPEC.md
ARCHITECTURE.md
DATABASE.md
API_SETUP.md
SECURITY.md
PHASE_STATUS.md

```

1.2 Application structure
Use a clean domain-based architecture.
Example:

```text
/app
/components
/features
  /profile
  /universities
  /opportunities
  /advisor
  /applications
  /portfolio
  /research
/lib
  /ai
  /providers
  /scoring
  /validation
  /supabase
  /security
/types
/supabase
  /migrations
  /functions

```

Avoid giant miscellaneous utility files.
PHASE 2 — AUTHENTICATION AND USER MODEL
Implement:

* sign up
* sign in
* sign out
* forgot password
* session persistence
* protected application routes

Profile fields should include:

```text
id
first_name
last_name
display_name
birth_year
country
city optional
school_name
graduation_year
curriculum
preferred_language
timezone
onboarding_completed
created_at
updated_at

```

Do not unnecessarily expose full birth date if birth year is sufficient for the feature.
PHASE 3 — ONBOARDING
The onboarding experience is critical.
It must NOT feel like a government form.
Use progressive onboarding.
Screen 1
Welcome.
Ask approximately:
What are you working toward?
Options:

* Competitive universities
* Exploring careers
* Building my profile
* Finding opportunities
* Not sure yet

Multiple selection allowed.
Screen 2 — Basic education
Collect:

* country
* school
* graduation year
* curriculum

Curriculum examples:

* AP
* IB
* A-Level
* Turkish curriculum
* national curriculum
* other

Screen 3 — Interests
Allow selection/search:

* Economics
* Business
* Computer Science
* Engineering
* Medicine
* Law
* Psychology
* Politics
* Mathematics
* Physics
* Design
* Entrepreneurship
* etc.

Allow custom interests.
Screen 4 — Target geography
Options:

* USA
* UK
* Europe
* Canada
* Turkey
* Not sure

Screen 5 — Import existing profile
Prominent options:
Upload CV
Enter manually
Skip for now
CV upload must support at minimum:

* PDF
* DOCX if practical

AI should parse the CV into structured proposed profile entries.
Never directly save AI-extracted achievements without showing the student a review screen.
Flow:

```text
Upload
↓
Extract
↓
Structure
↓
Review
↓
User confirms
↓
Save

```

PHASE 4 — MASTER STUDENT PROFILE
Create a structured master profile.
Core entities:

```text
education_records
coursework
grades
test_scores
activities
awards
certifications
projects
research_experiences
volunteering
work_experiences
internships
leadership_experiences
summer_programs
skills
languages
interests
career_goals
target_universities
evidence_files

```

Do not duplicate the same achievement across several unrelated tables without a deliberate relational model.
Create shared fields where sensible:

```text
title
organization
description
start_date
end_date
ongoing
hours_per_week
weeks_per_year
location
source
created_at
updated_at

```

PHASE 5 — SMART ACHIEVEMENT ENTRY
When someone adds an activity, do not merely ask:

```text
Activity name
Description

```

The system should help convert vague experiences into useful structured information.
Example:
Student types:
STEM club regional director
AI should identify missing useful context and display optional refinement fields:

* number of members
* number of chapters
* team size
* geography
* measurable outcomes
* responsibilities
* duration
* selection process

Do not force every field.
Allow:
Save quickly
or
Improve this entry with AI
AI can suggest a stronger factual description.
Never fabricate metrics.
PHASE 6 — CAREER PROFILE ANALYSIS
Create an internal scoring engine.
Initial profile dimensions:

1. Academics
2. Intellectual Curiosity
3. Leadership
4. Research
5. Entrepreneurship
6. Community Impact
7. Awards & Distinction
8. Career Exploration
9. Execution / Project Depth

Every score:

```text
0–100

```

These are Proxola development metrics.
They are NOT university-generated scores.
Make this clear in UI.
6.1 SCORE ARCHITECTURE
Do NOT let the LLM directly invent a number from intuition.
Use a hybrid architecture:

```text
Structured facts
↓
Deterministic features
↓
Scoring rules
↓
AI qualitative interpretation

```

Store:

```text
dimension
score
calculation_version
reason_codes
calculated_at

```

Create score versions such as:

```text
career_profile_v1

```

so scoring logic can evolve without corrupting historical comparisons.
6.2 ACADEMIC SCORE
Possible input signals:

* GPA
* curriculum rigor
* advanced coursework
* standardized testing
* consistency
* subject-specific performance

Do not directly compare incompatible grading systems without normalization metadata.
6.3 LEADERSHIP SCORE
Consider:

* title alone: low weight
* actual responsibility
* people led
* duration
* selectivity
* organizational scope
* measurable impact
* founder status
* execution

A student should NOT receive an extremely high leadership score merely because they typed “President.”
6.4 PROJECT DEPTH
Evaluate:

* duration
* shipped output
* users
* research produced
* revenue if relevant
* adoption
* measurable result
* iteration
* complexity
* individual contribution

Reward execution more than idea creation.
6.5 RESEARCH
Evaluate:

* exposure
* methodology
* independence
* academic mentorship
* data collection
* analysis
* written output
* publication/presentation
* depth

Do not require publication for a strong score.
PHASE 7 — PROFILE DASHBOARD
Build the main dashboard.
The dashboard should not show twenty widgets.
Primary hierarchy:
Header

```text
Good evening, [Name]
Here is what matters most right now.

```

Block 1 — Career Profile
Example:

```text
Career Profile
77
+3 this month

```

Include trend.
Do NOT imply admissions probability.
Block 2 — This Week
Show exactly:
Your 3 highest-impact actions
Example:

```text
1. Finish economics dataset
Impact: Very High
Estimated time: 2h 30m

2. Apply to Investment Competition
Deadline: 6 days
Impact: High

3. Write research conclusion
Estimated time: 45m

```

Maximum three primary actions.
Block 3 — Biggest Gap
Example:

```text
Research
Current score: 42

Why this matters:
Your leadership and academics are significantly stronger than your research exposure.

```

CTA:

```text
Improve Research

```

Block 4 — Opportunities
Display a short preview.
Block 5 — University Outlook
Display target universities.
PHASE 8 — AI ADVISOR
This is the core intelligence product.
Create:

```text
Proxola Advisor

```

The AI advisor must have controlled access to structured student context.
Do NOT dump the entire database blindly into every prompt.
Build a context assembler.
Example:

```ts
buildStudentAdvisorContext(userId)

```

Return compact structured data.
8.1 ADVISOR CONTEXT
Possible context:

```json
{
  "student": {},
  "education": {},
  "academics": {},
  "profileScores": {},
  "activities": [],
  "projects": [],
  "research": [],
  "awards": [],
  "goals": [],
  "targetUniversities": [],
  "upcomingDeadlines": [],
  "savedOpportunities": [],
  "recentActions": [],
  "advisorHistorySummary": {}
}

```

Never expose private storage URLs unnecessarily.
8.2 ADVISOR SYSTEM BEHAVIOR
Create a dedicated AI system prompt.
The advisor must:

* prioritize
* identify gaps
* recognize strengths
* consider student time
* avoid activity inflation
* distinguish depth from quantity
* give specific actions
* use existing projects before recommending new ones
* discourage low-value activities
* consider deadlines
* consider academic workload
* explain reasoning
* avoid fake certainty
* separate fact from inference

The advisor should behave like a demanding but useful strategic mentor.
Not a motivational quote generator.
8.3 EXAMPLE
Student asks:
Should I start another entrepreneurship club?
Bad response:
Yes! Starting a club can show leadership.
Correct Proxola behavior:
I would not prioritize another club. Leadership and entrepreneurship are already among your strongest profile areas. Your research exposure is considerably weaker. Unless this new club creates a unique measurable outcome, the same time would likely generate more value if invested in completing a substantive research project.
PHASE 9 — WEEKLY AI REVIEW
Create a weekly review engine.
Scheduled process:

```text
New profile data
+
current profile
+
deadlines
+
available opportunities
+
student goals
+
recent activity
↓
AI analysis
↓
3 weekly priorities

```

Store generated priorities.
Table:

```text
weekly_plans
weekly_actions

```

Each action needs:

```text
title
description
reason
category
priority
estimated_minutes
impact_level
deadline
status
source_type
source_id

```

Statuses:

```text
not_started
in_progress
completed
skipped
expired

```

PHASE 10 — REFLECTION LOOP
When an action is completed:
ask very briefly:

```text
What happened?

```

Optional answers:

* completed successfully
* partially completed
* did not work
* opportunity no longer available

Allow short notes.
Use outcomes to improve future advice.
Example:

```text
Start research project
↓
Completed
↓
Research profile updates
↓
Advisor sees actual progress
↓
Next recommendation changes

```

PHASE 11 — OPPORTUNITY ENGINE
Build a personalized opportunity engine.
Opportunity categories:

* competitions
* research
* internships
* summer programs
* fellowships
* scholarships
* volunteering
* entrepreneurship
* hackathons
* academic programs
* conferences
* student programs

11.1 OPPORTUNITY DATA MODEL
Create:

```text
opportunities

```

Include:

```text
id
title
organization
description
category
official_url
application_url
country
remote_allowed
minimum_age
maximum_age
eligible_countries
fields
cost
funding_available
deadline
start_date
end_date
source
source_url
source_confidence
last_verified_at
status
created_at
updated_at

```

11.2 OPPORTUNITY DISCOVERY
Use search provider jobs.
Example searches can be generated dynamically:

```text
high school economics competition 2027
international student entrepreneurship competition application
high school research program economics Europe
teen artificial intelligence summer program

```

However, do not simply publish web search results.
Pipeline:

```text
Search
↓
Candidate URL
↓
Extract official page
↓
Parse structured information
↓
Validate
↓
Deduplicate
↓
Store
↓
Match to students

```

11.3 DEDUPLICATION
Use:

* normalized title
* organization
* canonical URL
* similarity

Avoid duplicate cards.
PHASE 12 — OPPORTUNITY MATCHING
For every student/opportunity combination compute:

```text
Eligibility
Relevance
Profile Need
Prestige/Value proxy
Deadline urgency
Effort
Confidence

```

Do not call this one opaque AI score.
Show meaningful fields.
Example:

```text
Match: 94%

Why this fits you:
Economics interest
Strong entrepreneurship background
Available internationally
Your profile currently benefits from competition exposure

```

CTA:

```text
Save
Apply
Not interested

```

12.1 LEARN FROM FEEDBACK
If student selects:

```text
Not interested

```

ask optional reason:

* not interested in topic
* too expensive
* no time
* location
* too competitive
* already applied
* other

Use this signal in recommendations.
PHASE 13 — RESEARCH PROJECT GENERATOR
Build a research recommendation tool.
Inputs:

* interests
* school level
* skills
* existing research
* available weekly time
* target field

Use academic discovery plus AI.
Generate 3 project ideas maximum.
Each research project suggestion includes:

```text
Research question
Why it fits the student
Difficulty
Estimated duration
Required skills
Data sources
Method
Expected output
First 3 steps

```

13.1 IMPORTANT RESEARCH RULE
Do not generate projects that sound impressive but are impossible.
Example:
Bad:
Develop a new macroeconomic model predicting all European inflation.
Better:
Compare youth unemployment and tertiary education rates across 10 European countries from 2015–2025 using public datasets.
PHASE 14 — UNIVERSITY EXPLORER
Build a serious university discovery experience.
Search/filter:

* university
* country
* city
* program
* subject
* selectivity
* tuition range
* academic requirements
* international eligibility

University detail page:

```text
Overview
Programs
Admission requirements
Academic profile
Costs
Important dates
Student's outlook
Sources

```

Always display source recency.
PHASE 15 — TARGET UNIVERSITIES
Students can add universities to:

```text
My Universities

```

Statuses:

```text
exploring
target
applying
applied
accepted
waitlisted
rejected
withdrawn

```

Allow target program.
PHASE 16 — ADMISSION OUTLOOK
This feature must be designed carefully.
Do NOT promise:
You have a 37.41% chance of admission.
unless there is a statistically validated model capable of supporting that claim.
Initial system:
Academic Fit
0–100
Profile Fit
0–100
Selectivity

```text
Extreme
Very High
High
Moderate
Lower

```

Outlook

```text
Extreme Reach
Reach
Competitive
Strong
Likely

```

16.1 OPTIONAL ESTIMATE RANGE
Where sufficient structured information exists, an experimental estimate may be displayed as a RANGE.
Example:

```text
Estimated range
15–25%

Confidence
Medium

```

Clearly label:
Proxola estimate. This is not a guarantee or an official university probability.
Never display misleading decimal precision.
16.2 ADMISSION EXPLANATION
Example:

```text
Why Proxola classifies this as a Reach:

Strengths
+ Academics are competitive
+ Strong sustained leadership
+ Meaningful entrepreneurship

Gaps
− Limited formal research
− Awards weaker than the rest of your profile

Unknowns
? Essays
? Recommendations
? Applicant pool in your admission cycle

```

This explanation is mandatory.
PHASE 17 — ADMISSION MODEL V1
Build transparent heuristic infrastructure rather than an opaque fake predictor.
Possible components:

```text
AcademicFit
RequirementFit
SelectivityAdjustment
ProfileStrength
FieldAlignment
InternationalAdjustment where evidence supports it
DataConfidence

```

All formula parameters must be configurable.
Version:

```text
admission_model_v1

```

Store model version with each generated outlook.
PHASE 18 — FUTURE ADMISSION MODEL
Prepare schema to eventually learn from actual application outcomes.
With explicit user permission, store:

```text
student profile snapshot
university
program
application cycle
application type
decision

```

Decision:

```text
accepted
rejected
waitlisted
withdrawn

```

Keep this future-compatible.
Do NOT train a model now without enough representative data.
Eventually the system may compare:
Applicants with similar observable profiles.
But do not claim this capability before sufficient data exists.
PHASE 19 — PEER BENCHMARKING
Build benchmarking architecture.
Dimensions:

* academics
* leadership
* research
* entrepreneurship
* community impact
* awards
* project execution
* overall profile

Comparison cohorts might include:

```text
Age range
Graduation year
Target field
Target country
Curriculum

```

Do not display misleading percentiles with tiny samples.
Set a minimum cohort threshold.
Initial recommendation:

```text
minimum n = 100

```

If insufficient:

```text
Not enough comparable Proxola users yet.

```

Never invent percentile rankings.
PHASE 20 — PORTFOLIO
Create:

```text
My Portfolio

```

Chronological and categorized views.
Sections:

* Education
* Projects
* Leadership
* Activities
* Research
* Awards
* Certificates
* Volunteering
* Work
* Skills

Allow export-ready architecture later.
Do not spend V1 engineering time creating dozens of visual résumé templates.
PHASE 21 — EVIDENCE
Each relevant profile item can have:

```text
Add evidence

```

Supported evidence types:

* PDF
* image
* document
* URL

Store:

```text
evidence_type
file_path
external_url
uploaded_at
verification_status

```

Display:

```text
Self reported
Evidence added

```

Do not claim verification without verification process.
PHASE 22 — APPLICATION TRACKER
Create a simple university application tracker.
Fields:

```text
University
Program
Application type
Deadline
Status
Requirements
Notes

```

Checklist examples:

* application
* transcript
* test score
* essay
* recommendation
* portfolio
* interview
* financial aid

Do not make the UI overly complex.
PHASE 23 — DEADLINE ENGINE
Create central deadlines.
Deadline sources:

* university application
* opportunity
* competition
* summer program
* student-created item

Dashboard should surface:

```text
Due soon

```

Prioritize:

* 3 days
* 7 days
* 14 days
* 30 days

PHASE 24 — NOTIFICATIONS
V1:
in-app notification center.
Architecture should support future email notifications.
Notification categories:

* deadline
* new opportunity
* weekly plan
* profile update
* university data changed

Avoid spam.
Aggregate where possible.
PHASE 25 — SEARCH
Global search should eventually search:

* profile items
* universities
* opportunities

Implement cleanly if practical during V1.
PHASE 26 — AI STRUCTURED OUTPUTS
Never parse important AI responses from arbitrary prose.
Use structured outputs / validated JSON patterns.
Validate with Zod.
Example:

```ts
const WeeklyPlanSchema = z.object({
  summary: z.string(),
  actions: z.array(
    z.object({
      title: z.string(),
      reason: z.string(),
      category: z.string(),
      estimatedMinutes: z.number(),
      impact: z.enum(["low", "medium", "high", "very_high"])
    })
  ).max(3)
})

```

If validation fails:
retry safely or return controlled error.
PHASE 27 — AI COST CONTROL
Do not send enormous prompts.
Implement:

* context trimming
* summaries
* deterministic pre-processing
* structured database retrieval
* caching where appropriate
* model usage logging
* token/usage monitoring

Create:

```text
ai_usage

```

Store:

```text
user_id
feature
provider
model
input_tokens
output_tokens
estimated_cost optional
created_at

```

Do not store sensitive raw prompts indefinitely unless required.
PHASE 28 — AI SAFETY / RELIABILITY
The advisor must never fabricate:

* university requirements
* admission statistics
* deadlines
* scholarships
* competition rules
* research papers
* application URLs

When external factual data is involved:
the answer should distinguish:

```text
Verified information
Proxola analysis

```

Provide source link when appropriate.
PHASE 29 — DATA FRESHNESS
University and opportunity records require freshness metadata.
Use:

```text
last_checked_at
last_changed_at
source_url
source_hash
data_status

```

Possible status:

```text
fresh
stale
needs_review
unavailable

```

Set sensible refresh intervals based on information type.
Deadlines and active opportunities need more frequent refreshes than static institution details.
PHASE 30 — BACKGROUND JOBS
Create scheduled processes for:
Job A
Opportunity discovery.
Job B
Upcoming deadline validation.
Job C
University information freshness.
Job D
Weekly student plan generation.
Job E
Stale data detection.
Do not run expensive searches for every user independently if the same global data can be reused.
PHASE 31 — DATABASE SECURITY
Enable Row Level Security on user-owned data.
Default principle:
A student can access only their own private profile information.
Carefully review:

* profile
* evidence
* AI conversations
* applications
* tasks
* private notes

Global public data such as universities and opportunities can have different read policies.
Never expose elevated Supabase credentials client-side.
PHASE 32 — API SECRETS
Create `.env.example`.
Expected variables may include:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=

SUPABASE_SECRET_KEY=

ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=

TAVILY_API_KEY=

COLLEGE_SCORECARD_API_KEY=

```

Never commit actual secrets.
Add `.env*` appropriately to `.gitignore`.
Server secrets stay server-side.
PHASE 33 — API HEALTH SYSTEM
Since APIs may fail or change, create a lightweight internal provider health architecture.
Track:

```text
provider
last_success_at
last_failure_at
last_error
status

```

Statuses:

```text
healthy
degraded
down
unknown

```

An external API failure must not crash the entire app.
PHASE 34 — API FALLBACK PRINCIPLE
Do not use unreliable mystery APIs.
If structured data cannot be retrieved:

1. check official source
2. retrieve official page
3. extract relevant information
4. store source
5. label confidence
6. show unavailable when still uncertain

Never silently manufacture a value.
PHASE 35 — UNIVERSITY DATA NORMALIZATION
Create canonical entities:

```text
universities
university_programs
university_requirements
university_statistics
university_deadlines
university_sources

```

Do not create one massive `universities` table with hundreds of nullable columns.
PHASE 36 — SOURCE TRACEABILITY
Important facts must support source inspection.
Create a reusable UI component:

```text
SourceBadge

```

Example:

```text
Source: U.S. Department of Education
Updated: June 2026

```

or:

```text
Source: Official university website
Checked: 2 days ago

```

PHASE 37 — DATA CONFIDENCE
Create confidence values:

```text
high
medium
low

```

Examples:
Official structured dataset:

```text
high

```

Official page extraction:

```text
high/medium

```

Reliable secondary source:

```text
medium

```

Unverified search result:
do not publish as confirmed information.
PHASE 38 — CAREER AI HOME PRIORITIZATION ENGINE
The homepage ranking engine should decide what deserves attention.
Example scoring concept:

```text
Priority =
Impact
× Urgency
× ProfileNeed
× GoalAlignment
× Confidence
÷ Effort

```

Do not blindly use this exact multiplication if it produces unstable behavior.
Implement normalized factors and unit tests.
The point is:
Proxola prioritizes.
PHASE 39 — "DON'T DO THIS" LOGIC
Create explicit recommendation types:

```text
do
consider
deprioritize
avoid_for_now

```

Example:

```text
Recommendation:
Avoid for now

Activity:
Start another entrepreneurship club

Reason:
Your entrepreneurship and leadership scores are already high while research remains substantially weaker.

```

This is a differentiating product feature.
PHASE 40 — MONTHLY REVIEW
Build a monthly progress view.
Example:

```text
August

Overall profile
74 → 79

Research
42 → 58

Leadership
91 → 91

Projects completed
1

Applications submitted
2

```

Explain why changes occurred.
Avoid meaningless score movement.
PHASE 41 — PROFILE HISTORY
Store snapshots.
Table:

```text
profile_score_snapshots

```

Fields:

```text
user_id
score_version
overall_score
dimension_scores
snapshot_reason
created_at

```

Generate snapshots only after meaningful changes or scheduled review.
PHASE 42 — UI NAVIGATION
Desktop sidebar:

```text
Home
Profile
Universities
Opportunities
Plan
Applications
Advisor

```

Secondary settings:

```text
Documents
Settings

```

Keep top-level navigation small.
Mobile:
use compact navigation.
PHASE 43 — EMPTY STATES
Every empty screen must help the user act.
Bad:

```text
No activities found.

```

Better:

```text
You haven't added any activities yet.

Add clubs, projects, sports, leadership or other experiences. Proxola uses them to understand your profile.

```

CTA:

```text
Add activity

```

PHASE 44 — LOADING EXPERIENCE
Use:

* skeletons
* optimistic UI where safe
* clear progress on AI analysis

Do not show frozen buttons.
Do not show fake percentage loaders unless progress is real.
PHASE 45 — ERROR EXPERIENCE
Errors should be human-readable.
Bad:

```text
500 INTERNAL SERVER ERROR

```

Better:

```text
We couldn't refresh this university's information right now. The last verified data is still shown below.

```

PHASE 46 — ACCESSIBILITY
Implement reasonable accessibility:

* keyboard navigation
* semantic HTML
* labels
* sufficient contrast
* focus states
* accessible dialogs
* accessible forms

PHASE 47 — RESPONSIVE DESIGN
Test at minimum:

* phone
* tablet
* laptop
* desktop

Do not simply shrink desktop cards into unusable mobile cards.
PHASE 48 — PERFORMANCE
Avoid unnecessary:

* client components
* giant JavaScript bundles
* repeated AI calls
* repeated external API requests
* duplicate database queries

Use server components where appropriate.
Cache global public data sensibly.
PHASE 49 — TEST DATA
Create realistic development fixtures.
Example personas:
Persona A
Strong academics, weak extracurriculars.
Persona B
Strong entrepreneurship and leadership, weak research.
Persona C
Research-heavy student aiming for STEM.
Persona D
Early-stage 14-year-old with little profile history.
Use fixtures for testing only.
Never silently use them in production.
PHASE 50 — TESTING
At minimum implement tests for high-risk logic.
Unit tests:

* scoring
* priority ranking
* admission classification
* eligibility
* date calculations
* normalization
* deduplication

Integration tests:

* authentication
* CV import workflow
* profile creation
* weekly plan generation
* university save
* opportunity save
* evidence permissions

Critical end-to-end happy path:

```text
Register
↓
Onboard
↓
Upload/add profile
↓
Review profile
↓
See dashboard
↓
Receive priorities
↓
Explore university
↓
Save university
↓
See opportunity
↓
Save opportunity
↓
Ask AI Advisor

```

PHASE 51 — ADMIN / OPERATIONS
Create only the minimum useful internal operational interface.
Admin capabilities:

* inspect provider health
* inspect failed refreshes
* view stale university data
* view stale opportunities
* disable obviously incorrect opportunity
* manually trigger refresh
* inspect AI job failures

Do not build a huge CMS.
Protect admin routes properly.
PHASE 52 — ANALYTICS
Implement privacy-conscious product events.
Important events:

```text
onboarding_completed
profile_item_added
cv_imported
target_university_added
opportunity_saved
opportunity_applied
advisor_message_sent
weekly_action_completed
research_project_started
application_updated

```

The analytics layer should not leak private document contents.
PHASE 53 — MVP DEFINITION
The first real MVP is complete when a student can:

1. create an account
2. complete onboarding
3. enter or import their profile
4. add activities and achievements
5. optionally attach evidence
6. receive profile analysis
7. understand strengths and gaps
8. receive 3 prioritized actions
9. browse personalized opportunities
10. explore universities
11. save target universities
12. see an honest admission outlook
13. track deadlines
14. ask Proxola personalized questions
15. complete actions
16. see their profile evolve

Everything else is secondary.
PHASE 54 — DO NOT BUILD YET
Unless needed technically, do NOT prioritize:

* mentor marketplace
* student-to-student chat
* public social profiles
* social feed
* likes
* follower counts
* complex badges
* NFT credentials
* dozens of résumé templates
* parent dashboards
* school dashboards
* counselor marketplace
* complex payments
* mobile native application

Stay focused.
PHASE 55 — FUTURE ARCHITECTURE
Do not implement now, but avoid making future expansion impossible.
Potential future features:

* university student Proxola
* professional Proxola
* counselors
* mentors
* schools
* parent accounts
* AI interview preparation
* essay planning
* recommendation management
* resume export
* public portfolio
* scholarship matching
* internship matching
* recruiter functionality
* verified credentials
* Proxola mobile application

PHASE 56 — PRODUCT LANGUAGE
Use short, clear product copy.
Prefer:

```text
Your strongest area

```

over:

```text
Competency-based profile dimensional performance

```

Prefer:

```text
Why this matters

```

over:

```text
Rationale

```

Prefer:

```text
What to do next

```

over:

```text
Recommended intervention pathways

```

The product should feel intelligent but simple.
PHASE 57 — AI COPY STYLE
Proxola responses should be:

* specific
* concise
* analytical
* calm
* evidence-aware
* action-oriented

Avoid excessive praise.
Avoid:
Amazing! You're doing incredibly well!
Prefer:
Leadership is already strong. Research is currently the clearer gap.
PHASE 58 — INITIAL DATABASE DESIGN
Create a normalized schema covering at minimum:

```text
profiles

education_records
courses
grades
test_scores

activities
awards
certifications
projects
research_experiences
volunteering_experiences
work_experiences
skills
languages

evidence_files

student_interests
career_goals

universities
university_programs
university_requirements
university_statistics
university_deadlines
university_sources

target_universities
applications
application_requirements

opportunities
opportunity_sources
opportunity_matches
saved_opportunities

profile_scores
profile_score_snapshots

weekly_plans
weekly_actions

advisor_conversations
advisor_messages
ai_recommendations

notifications

provider_health
external_sync_jobs
ai_usage

```

Use UUIDs.
Use timestamps.
Use foreign keys.
Use indexes appropriately.
Use cascade behavior deliberately.
Do not create cascading deletion capable of unexpectedly destroying global university data.
PHASE 59 — MIGRATION DISCIPLINE
All schema changes must be migrations.
Never rely on manually clicking database tables into existence without recording the change.
Maintain reproducible database setup.
PHASE 60 — AI CV EXTRACTION
Create a structured CV extraction pipeline.
Input:
document text
Output:

```json
{
  "education": [],
  "activities": [],
  "awards": [],
  "projects": [],
  "research": [],
  "workExperience": [],
  "skills": [],
  "languages": [],
  "unclassified": []
}

```

AI should include confidence per extracted item.
Review screen:

```text
We found 12 items.
Review before adding them to your Proxola profile.

```

Student can:

* edit
* delete
* confirm

PHASE 61 — DOCUMENT PARSING FAILURE
If extraction fails:
do not discard the uploaded document.
Show:
We couldn't fully read this document. You can retry or add the information manually.
Log the failure.
PHASE 62 — RECOMMENDATION EXPLAINABILITY
Every major recommendation should answer:

```text
Why?

```

Example:
Why is research #1?
Response:
Research is currently your weakest major profile dimension at 42/100. Your target Economics programs value academic curiosity, while leadership is already at 91/100. Completing one strong research project therefore has higher expected value than adding another leadership position.
This reasoning is essential.
PHASE 63 — RECOMMENDATION HISTORY
Store previous recommendations.
Allow Proxola to avoid repeatedly recommending the same rejected idea.
Fields:

```text
recommendation
shown_at
accepted
rejected
completed
feedback

```

PHASE 64 — STUDENT TIME BUDGET
Add optional setting:

```text
How much time can you realistically spend outside school this week?

```

Examples:

* under 2 hours
* 2–5
* 5–10
* 10+

Use this when generating weekly priorities.
Do not recommend 15 hours of extracurricular work to a student with 3 free hours.
PHASE 65 — ACADEMIC BUSY PERIODS
Allow a student to temporarily mark:

```text
Exam week

```

or reduce available time.
Proxola should reduce recommendations accordingly.
PHASE 66 — GOAL SYSTEM
Students can create goals:
Examples:

```text
Study Economics in the UK
Build stronger research experience
Improve SAT
Launch my startup
Get an internship

```

Goal fields:

```text
title
category
target_date
priority
status

```

Recommendations should trace back to goals.
PHASE 67 — PROFILE COMPLETENESS
Show profile completeness separately from profile strength.
Example:

```text
Profile completeness: 72%
Profile strength: 79

```

These are completely different concepts.
Do not confuse them.
Completeness means Proxola knows enough about the student.
PHASE 68 — CONFIDENCE SYSTEM
Proxola should know when it does not know enough.
Example:

```text
Research score: 48
Confidence: Low

```

Reason:
You have not added enough information about your research experiences.
This is better than false certainty.
PHASE 69 — UNIVERSITY REQUIREMENT CHECK
For target programs create:

```text
Requirement Check

```

Example:

```text
Mathematics requirement
Met

English proficiency
Unknown

Standardized testing
Not required

Application deadline
12 January

Essay requirements
Needs review

```

Use current official sources whenever available.
PHASE 70 — APPLICATION READINESS
Create a readiness status.
Example:

```text
Application readiness
68%

```

This measures completion of known application components.
It is NOT admission probability.
PHASE 71 — SOURCE UI
University facts and external opportunities should support:

```text
View source

```

The student should be able to verify important claims.
PHASE 72 — DEVELOPMENT MODE
When credentials are absent:
show a clear developer setup state.
Example:

```text
Tavily integration is not configured.
Add TAVILY_API_KEY to enable live opportunity discovery.

```

Do not pretend the feature works.
Development fixtures may appear only behind an explicit development flag.
PHASE 73 — API DOCUMENTATION
Create `API_SETUP.md`.
Explain exactly where to obtain and configure:

* Supabase
* Anthropic
* Tavily
* College Scorecard

For each:

```text
Purpose
Environment variable
Where used
How to verify
Typical failure
How the application handles failure

```

PHASE 74 — INTEGRATION TEST COMMAND
Create a developer command or script such as:

```bash
npm run check:integrations

```

It should safely report:

```text
Supabase: OK
Anthropic: OK
Tavily: OK
College Scorecard: OK
OpenAlex: OK

```

or:

```text
Tavily: Missing credential

```

Do not expose secret values.
This is important because previous development attempts suffered from APIs that appeared configured but did not actually work.
PHASE 75 — PROVIDER CONTRACT TESTS
Every external provider must have:

* success handling
* malformed response handling
* rate limit handling
* authentication failure handling
* timeout handling
* unavailable service handling

Use sensible timeouts.
Avoid infinite retries.
PHASE 76 — OBSERVABILITY
Create structured server logs.
Log:

```text
provider
feature
request type
duration
success/failure
error class

```

Never log API keys.
Avoid logging sensitive student document content.
PHASE 77 — README
At the end, README must contain:

```text
What Proxola is
Architecture
Setup
Environment variables
Supabase setup
Migrations
Local development
External APIs
Running tests
Integration health check
Deployment
Known limitations

```

A developer unfamiliar with the project should be able to start it.
PHASE 78 — FINAL QA
Before calling V1 complete, run:

```bash
npm run lint
npm run typecheck
npm run test
npm run build

```

Use the correct commands defined by the project.
Then manually verify the primary user path.
Fix failures.
PHASE 79 — FINAL PRODUCT AUDIT
Audit the application from five perspectives.
Product
Does Proxola clearly answer:
What should I do next?
UX
Can a first-time 16-year-old understand the product without instruction?
AI
Are recommendations actually personalized?
Data
Can important claims be traced to sources?
Trust
Does the application avoid fake admissions precision and invented opportunities?
Document findings.
Fix critical issues before considering the phase complete.
PHASE 80 — COMPLETION REPORT
When the implementation reaches the end, give me a concise build report containing:
Completed
List working features.
Integrations

```text
Supabase
Anthropic
Tavily
College Scorecard
OpenAlex
etc.

```

Show each as:

```text
Working
Needs credential
Unavailable

```

Database
Summarize migrations and schema.
Tests
Summarize test/build result.
Remaining limitations
Only genuine limitations.
Recommended next build phase
Choose the highest-leverage next phase yourself.
Do not ask me what we should build next unless there are multiple genuinely strategic alternatives that cannot reasonably be decided without founder input.
NON-NEGOTIABLE PRODUCT REQUIREMENTS
These requirements override shortcuts elsewhere in this prompt.
1
Proxola must be useful even if a student has no university targets yet.
2
Proxola must prioritize rather than endlessly recommend more activities.
3
Evidence is optional in V1.
4
Uploaded evidence does not equal independent verification.
5
University admission percentages must never be presented with false precision.
6
University requirements and deadlines must have traceable sources.
7
External API credentials must never be exposed to the client.
8
External API failure must not crash the application.
9
AI output affecting structured product state must be schema validated.
10
Students must be able to edit AI-extracted information.
11
Career profile score is different from admissions probability.
12
Profile completeness is different from profile strength.
13
Application readiness is different from admissions probability.
14
The product must be understandable to a student within minutes.
15
The dashboard should emphasize the top three actions, not twenty metrics.
KEY USER EXPERIENCE
The ideal repeated Proxola experience should feel like this:

```text
Student opens Proxola
↓
Proxola understands what changed
↓
Proxola identifies what matters
↓
Proxola shows only the highest-value actions
↓
Student acts
↓
Proxola observes the outcome
↓
Profile changes
↓
Priorities change
↓
Cycle repeats

```

Example homepage:

```text
Good evening, Ada.

Your profile improved this month.

Career Profile
77
+3

Biggest improvement
Research +8

Your focus this week

1. Finish your economics dataset
Very High Impact
2h 30m

2. Apply to the Economics Challenge
6 days left
High Impact

3. Write the conclusion of your research paper
45m
High Impact


One thing not to do

Starting another club is not a priority right now.

Leadership is already one of your strongest profile areas.


University Outlook

Bocconi
Competitive

LSE Economics
Reach

Erasmus University Rotterdam
Strong


New opportunities
4 relevant matches

```

This should be the product experience we optimize around.
FINAL EXECUTION INSTRUCTION
Start with Phase 1 and actually modify/create the project files.
Do not respond with another giant plan before beginning implementation.
Use this document as the specification.
As you work:

* make decisions independently
* keep a clean architecture
* test each phase
* record assumptions
* preserve security
* avoid fake data
* prioritize working functionality over decorative complexity

If the repository already contains code, inspect it first and preserve anything useful.
If the repository is empty, initialize the complete application.
Whenever you find a weak implementation from an earlier phase, fix it instead of building new features on top of bad foundations.
The end goal is not a visually impressive demo.
The end goal is:
A trustworthy, simple, intelligent and genuinely useful Proxola product that continuously helps students decide what to do next.