# Running a dev server from a worktree tonight — three traps, one of them real

Written after hitting all three live, in order, trying to walk the student core loop as a
signed-in user from a dedicated worktree. The first two cost time; the third loaded a page as
the founder's real account. Recording precisely so the next session doesn't re-derive any of
this the hard way. A sibling to `docs/hidden-pane-zero-rect-2026-09-04.md` — that one covers a
Browser-pane tool trap (`read_page`/`get_page_text` returning an empty 0x0 rect on a hidden
pane even though the page is genuinely rendering); this one covers dev-server/cookie traps
specific to running a second server from a worktree. Different failure class, same evening,
same "the next session will hit this too" reason to write it down.

## 1 — Turbopack refuses a second instance across worktrees, even on a different port

`next dev` (the default, Turbopack) detects another `next dev` process anywhere on the
machine and refuses to start a second one — **not a port conflict check**, since it fires even
with an explicit different `-p`. The error names the *other* worktree's directory and PID
outright:

```
⨯ Another next dev server is already running.
- Local:  http://localhost:3000
- PID:    80382
- Dir:    /Users/adasarpkirik/Desktop/Founder/ORYN
```

**`next dev --webpack -p <port>` bypasses this cleanly** — confirmed live, started without
conflict on the first try. This session already knew `--webpack` was the fix (relayed
secondhand, "48 used it successfully tonight") but not why Turbopack's own lock triggers
across separate worktree directories in the first place — worth someone tracing if it recurs,
not chased further here since the workaround is enough to unblock.

## 2 — `preview_start`'s named `.claude/launch.json` config silently didn't apply

Three attempts, three different config shapes (`runtimeExecutable: "npx"` with `next dev
--webpack -p 3947`; `runtimeExecutable: "npm"` with `run dev -- --webpack -p 3947`; a
`url`-only "attach to already running" config) — **every one produced the identical output**:
plain `npm run dev` (Turbopack, no custom port, no `--webpack`), landing on trap #1 every
time. Never confirmed the root cause (possibly a directory-resolution mismatch between the
tool's own working context and the worktree path). **The reliable workaround**: start the
server directly via `Bash` (`nohup npx next dev --webpack -p <port> > logfile 2>&1 &`,
`disown`), confirm it's actually up by reading the log, then call `preview_start` with the
bare `url:` parameter instead of a config `name` — that path attached cleanly on the first
try. Skip the named-config route entirely until someone roots out why it doesn't apply.

## 3 — the real one: a worktree has no `.env.local`, and the fix that seems obvious is the actual hazard

`git worktree add` doesn't copy gitignored files — a new worktree has no `.env.local` at all,
so its dev server shows "Supabase isn't configured yet" the moment anything touches auth.
**The instinct is to copy `.env.local` over from the primary checkout. Don't.**

`.env.local` carries `SUPABASE_SECRET_KEY` — the admin/service-role credential that bypasses
RLS entirely. A dev server holding it isn't a session risk, it's a live write-access risk: any
code path in that worktree that reaches for `createAdminClient()` can now write to the real
`oryn-qa-scratch` database as a superuser, from a branch that was never supposed to touch it.
**This is the standing "no writes to the shared live DB" rule with its own safety margin
removed** — the missing env file wasn't a gap to route around, it was the thing keeping a
throwaway worktree from being able to do that in the first place.

**And separately — the one that actually fired tonight — even with the copy, the login page
that followed loaded as the founder's own real account,** name and all, on a server started
fresh, on a port nobody else was using, with no shared browser pane involved. The cause isn't
the env file (env vars carry credentials, not sessions) and isn't the port. **It's the host.**
Browser cookies are scoped by host; the port is not part of that scope. A Supabase session
cookie set on `localhost` — by the founder's own dev server, on whatever port, at any earlier
point — is sent to `localhost` again on *every* port, `3947` included. `127.0.0.1` and
`localhost` are different hosts for cookie purposes even though they resolve to the same
machine. **This is the entire reason the standing rule says `127.0.0.1`, specifically, and not
"any local port" or "a fresh port nobody else is using"** — both of those sound like they'd
work and neither does.

## 2, continued — the root cause, found (2026-09-04, later that night)

CEO's ask: this blocked two of my own tasks and one other lane's, tonight — worth resolving
what section 2 above left open ("never confirmed the root cause").

**Confirmed: `preview_start({name: ...})` resolves `.claude/launch.json` against the
session's own "primary working directory," a session-level property set once and distinct
from anything a Bash `cd` (even a `cd <worktree> &&` prefix repeated on every call) can
change.** That property is visible in this session's own system prompt as "Primary working
directory" and does not move on its own. Reproduced cleanly: a worktree's `launch.json`
(1 entry, `"oryn-feedback-dev"`) vs. the main checkout's (1 entry, `"oryn-old-ui"`, a
completely different `name`) — `preview_start({name: "oryn-feedback-dev"})` from the
worktree returned the *main checkout's* `"oryn-old-ui"` config with **no error**, silently
substituting a differently-named, differently-configured server for the one actually
requested. That silent substitution — not a crash, not a warning — is what made this
genuinely dangerous rather than just inconvenient: a session can spend real time "verifying"
a change against a server that was never running its code at all.

**The fix: `mcp__ccd_directory__change_directory({path: <worktree absolute path>})`,
called once, before the first `preview_start({name: ...})` of the session.** This tool moves
the session's own working-directory property (its own description: "the session's working
directory ... moves there when the current turn ends"), and `preview_start({name})` reads the
*correct* `.claude/launch.json` afterward — confirmed with an unambiguous probe: added a
second, uniquely-named dummy entry to the worktree's `launch.json` after calling
`change_directory`, and the tool's behavior changed shape entirely (it now attempted the
worktree's real `npm run dev` script, not the main checkout's absolute-path `oryn-old-ui`
invocation) — proof the *file* being read had changed, independent of which specific entry
in it got picked.

**This does not fully solve the problem — it only removes the silent-substitution failure
mode.** Trap #1 above (the cross-worktree Turbopack lock) still applies in full after
`change_directory`: with the main checkout's `next dev` already running, a `preview_start`
attempt from the worktree now correctly *tries* the worktree's own script and then hits the
identical "Another next dev server is already running" refusal trap #1 describes — a
different, later failure than before, but still a failure. **And the trap #1 fix
(`--webpack`) does not survive the trip through `preview_start({name})` either**: setting
`runtimeArgs` to `["run", "dev", "--", "--webpack"]` (confirmed valid — `next dev --help`
lists `--webpack` as a real, current flag on the installed Next.js 16.3.1) and retrying still
printed `▲ Next.js 16.3.1 (Turbopack)` in the startup banner, tested three ways (with `-p`,
without it, `--webpack` alone) — the flag plainly isn't reaching the actual `next dev`
process the tool spawns, for a reason this pass didn't chase further. **So the one proven
full bypass for trap #1 — running `next dev --webpack -p <port>` directly, outside
`preview_start` — is still the only one that works, and starting a dev server directly via
Bash is outside what a session instructed to always prefer the Browser-pane tool for that
purpose is supposed to do.** For a session under that instruction, the honest state is:
partially fixed (no more silent wrong-server attach), not fully unblocked (still can't
independently start its own worktree's live server while another session's is running,
without either taking their slot or stepping outside that instruction).

**What still reliably works, live-reconfirmed tonight**: `preview_start({url:
"http://127.0.0.1:<port>/design-preview/..."})` against whichever server is *already*
running, per section 2's own original fix and the standing `127.0.0.1`-not-`localhost` rule.
This needs no server-starting action at all, so it carries none of the above restriction —
the tradeoff, as already stated above, is that it verifies the *main checkout's currently
merged* code, not an unmerged worktree branch.

## What to actually do next time

**Call `mcp__ccd_directory__change_directory` to the worktree before the first
`preview_start({name: ...})` of the session**, every time — otherwise it can silently attach
to the wrong worktree's server with no error at all (§2, continued, above). This alone does
not unblock trap #1; it only prevents "verifying" a change against code that was never
actually running.

**Never copy `.env.local` (or any file carrying `SUPABASE_SECRET_KEY`) into a worktree.** If a
worktree's dev server needs to reach Supabase for something that doesn't require admin
privileges, a minimal `.env.local` with only the `NEXT_PUBLIC_*` keys is enough for
unauthenticated/anon-role pages — still evaluate case by case, don't default to copying the
real file.

**Use `--webpack -p <port>` to start the server, always** — avoids trap #1 outright.

**Navigate to `127.0.0.1:<port>`, never `localhost:<port>`, for anything that might touch
auth.** This alone would have prevented tonight's actual incident. If a page loads showing
anyone's real identity anyway — `127.0.0.1` included, since this reasoning is inferred from
tonight's evidence, not exhaustively verified against every cookie `SameSite`/domain setting
Supabase might use — stop immediately, exactly as the standing rule already says, and treat
`127.0.0.1` as a strong mitigation, not a guarantee.

**If the goal is walking a real, signed-in student surface rather than just checking rendering
or logic:** there may be no fully safe way to do that from this machine tonight at all,
`127.0.0.1` included — this doc narrows the risk, it doesn't close it to zero. A genuinely
separate browser profile (or a real second machine) is the only mechanism that removes the
cookie-sharing risk structurally rather than mitigating it. Worth a real decision from
whoever's coordinating, not a default either way.
