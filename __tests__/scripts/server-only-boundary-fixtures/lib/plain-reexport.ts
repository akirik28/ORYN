// Not "use server", not "server-only" itself -- just a plain shared module that happens to
// re-export a value from a server-only one. This is the exact shape of the real bug found
// in lib/validation/onboarding.ts on 2026-09-03: an innocent-looking file with no
// directives of its own, reachable from client code for an unrelated reason.
export { SECRET_VALUE } from "./server-value";
