# rules — Non-negotiable Engineering Rules

These apply to every change, every session. If a rule must be broken, the doc
gets amended first — code never silently diverges from the rules.

## Process

1. **One task at a time.** Only the work in `current-task.md` is in scope.
   Anything else that comes up goes to `features.md` (as a numbered feature or
   under "Later"), not into the code.
2. **Plan before code.** Each feature starts in plan mode; implementation
   begins only after the plan is agreed.
3. **Docs move with code.** A change that alters a shape, query, decision, or
   command updates `architecture.md` / `stack.md` in the same commit.
4. **Bookkeeping on completion.** Finish a feature = checklist verified →
   entry appended to `done.md` → next feature loaded into `current-task.md`
   → commit. One commit per feature minimum.

## Code

5. **Raw SQL only**, as prepared statements with `?` placeholders. String
   interpolation into SQL is forbidden — no exceptions.
6. **`architecture.md` §API contract is the source of truth** for every shape
   crossing the client/server boundary. Both `types.ts` files mirror it.
7. **The server is the authority.** Every REST body, every socket payload,
   every URL param is validated server-side. Client-side validation is UX
   only. Authorization is checked on the server for every resource access
   (e.g., only participants read a conversation's messages).
8. **Strict TypeScript, both apps.** No `any` without a comment justifying it.
9. **Passwords**: bcrypt only; plaintext never logged, stored, or returned.
   Login errors never reveal whether the username exists.
10. **Secrets live in `.env`** (gitignored). `JWT_SECRET` has no in-code
    fallback — the server refuses to start without it.
11. **Errors**: REST returns proper status + `{ "error": "message" }`; socket
    operations report failure via their ack. Nothing fails silently.
12. **Timestamps are UTC** end to end; formatting to local time happens only
    at render.

## Style

13. Readable over clever — this is a learning codebase. Comments explain
    *why*, never *what*.
14. Socket event names: `domain:action` (`message:send`, `message:new`).
15. Client and server share no code, only the contract; each keeps its own
    `types.ts` mirror.
