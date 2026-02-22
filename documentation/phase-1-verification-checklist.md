
# Phase 1 Verification Checklist (Launch Readiness)

> Use this checklist to confirm **Phase 1 is truly production-ready** (not just “implemented”).
>
> **How to use:** 
> - Tick items as you verify them. 
> - Capture evidence links (PRs, screenshots, logs, query outputs). 
> - If any “Blocker” fails, pause launch and fix before proceeding.

---

## 0) Metadata

- [ ] **Environment tested:** `dev` / `staging` / `prod`
- [ ] **Tester(s):** 
- [ ] **Date tested (UTC):**
- [ ] **Release / commit / tag:** 
- [ ] **Feature flags snapshot recorded:** (paste JSON / screenshot link)
- [ ] **Test accounts prepared:** (org owner, org admin, org member, client, model, platform admin)

---

## 1) Feature Flags & Rollout Controls

**Goal:** Features behave correctly when toggled ON/OFF, with no “ghost UI”.

- [ ] Confirm **flag list** exists (central config) and is documented.
- [ ] Confirm Phase 1 flags are **enabled only where intended**.
- [ ] Disable each Phase 1 flag one at a time and verify:
- [ ] Related navigation items disappear
- [ ] Direct routes are protected (no access via URL)
- [ ] Backend operations are blocked (not just hidden in UI)
- [ ] Re-enable flags and confirm UI/state returns cleanly (no stuck caches).

**Evidence / notes:**

---

## 2) Security & Permissions (Blocker)

**Goal:** No cross-organisation data exposure and no privilege escalation.

### 2.1 Organisation Access Boundaries
- [ ] Org A user cannot view Org B dashboard.
- [ ] Org A user cannot view Org B teams/members.
- [ ] Org A user cannot view Org B favourites.
- [ ] Org A user cannot view Org B jobs list or job details.

### 2.2 Role Capabilities (Owner/Admin/Member)
- [ ] **Owner** can: manage org settings, manage teams, manage members (as designed).
- [ ] **Admin** can: perform intended admin actions; cannot perform owner-only actions.
- [ ] **Member** can: access only intended areas; cannot manage org, teams, or members unless allowed.

### 2.3 Route Guarding & Direct URL Attempts
- [ ] Visiting protected routes by URL redirects/blocks correctly for each role.
- [ ] API calls/Firestore reads for restricted collections are denied (check network console / Firebase rules simulator).

### 2.4 Firestore Rules Validation (Required)
- [ ] Run Firebase Rules Simulator tests for key collections:
- [ ] organisations
- [ ] organisationMembers / memberships
- [ ] teams / teamMembers
- [ ] jobs
- [ ] favourites
- [ ] Confirm least-privilege:
- [ ] read/write only where necessary
- [ ] no wildcard reads that could leak cross-org data
- [ ] Confirm rules enforce `organisationId` match for:
- [ ] reading job documents
- [ ] listing jobs
- [ ] reading favourites

**Evidence / notes:**

---

## 3) Data Model & Migration Integrity (Blocker)

**Goal:** Jobs and org features are consistently linked and legacy data is safe.

### 3.1 Job → Organisation Linkage
- [ ] New job creation always writes `organisationId` (and `teamId` if applicable).
- [ ] Backfilled jobs: verify **100%** (or acceptable threshold) of existing jobs now have `organisationId`.
- [ ] No jobs exist with an invalid/missing organisation reference.

### 3.2 Backfill Script / Migration Report
- [ ] Migration run log saved (timestamp, counts, errors).
- [ ] Rows processed = expected total.
- [ ] Error handling documented and rerunnable without duplication.

### 3.3 Favourites Ownership
- [ ] Favourites stored at organisation/team level (not user-only) where intended.
- [ ] If user leaves org, favourites remain accessible to org/team.
- [ ] No duplicate/ghost favourites created during migration.

**Evidence / notes:**

---

## 4) “Book Model” Button End-to-End (Blocker)

**Goal:** The booking CTA works consistently and produces the correct database state.

- [ ] “Book Model” visible only for correct roles (e.g., clients/org users).
- [ ] Clicking “Book Model” reliably triggers the intended flow:
- [ ] Job creation flow OR enquiry modal (as designed)
- [ ] Resulting record(s) created correctly:
- [ ] job/invitation created with correct model reference
- [ ] correct organisationId/teamId attached
- [ ] correct createdBy user reference
- [ ] status set correctly (e.g., invited/pending)
- [ ] Duplicate prevention:
- [ ] repeated clicks do not create duplicates (or duplicates handled gracefully)
- [ ] Error handling:
- [ ] user-friendly message on failure
- [ ] failure logged

**Evidence / notes:**

---

## 5) Organisation Team Structure

**Goal:** Teams exist, membership works, and role logic matches the product claims.

- [ ] Create team (owner/admin if permitted).
- [ ] Add member to team (invite or direct add).
- [ ] Remove member from team.
- [ ] Member permissions update immediately (no stale access).
- [ ] Team-specific features behave correctly (e.g., favourites ownership by team).
- [ ] Attempt invalid actions:
- [ ] member tries to create/manage teams → blocked
- [ ] admin tries owner-only action → blocked (if applicable)

**Evidence / notes:**

---

## 6) Organisation Dashboard Verification

**Goal:** Dashboard loads correct data and does not leak cross-org data.

- [ ] Dashboard loads for permitted roles.
- [ ] Core widgets show correct values for the org:
- [ ] recent jobs list
- [ ] KPIs (counts match Firestore queries)
- [ ] charts render without console errors
- [ ] Empty state works (new org with no jobs/favourites).
- [ ] Performance check:
- [ ] dashboard loads within acceptable time on slow network profile
- [ ] queries are indexed and not causing Firestore warnings

**Evidence / notes:**

---

## 7) Admin Platform Dashboard Verification

**Goal:** Admin dashboard shows global view and only admins can access it.

- [ ] Only platform admin roles can access platform dashboard.
- [ ] Non-admin attempts to access are blocked.
- [ ] KPIs and charts load without errors.
- [ ] Organisation list loads and links to management screens.
- [ ] No sensitive data exposed to non-admin roles via network calls.

**Evidence / notes:**

---

## 8) Organisation Management (Admin)

**Goal:** Admins can create/manage orgs and link accounts reliably.

- [ ] Create organisation (name, tier, expiry/licence fields if used).
- [ ] Edit organisation fields and confirm persistence.
- [ ] Link accounts to organisations (via company name or chosen key).
- [ ] Unlink / re-link accounts safely.
- [ ] Data consistency:
- [ ] linked users see correct org dashboard/features
- [ ] job creation uses correct organisationId after linkage
- [ ] Audit logging (if implemented):
- [ ] org created/updated events recorded

**Evidence / notes:**

---

## 9) UI/UX Consistency & Regression Sweep

**Goal:** Phase 1 didn’t break existing flows.

- [ ] Navigation shows correct menu items per role.
- [ ] No console errors on key pages.
- [ ] Mobile responsiveness check:
- [ ] dashboards usable on small screens
- [ ] Public model profile pages unaffected (if applicable).
- [ ] Existing “My Jobs” pages still work for all roles.
- [ ] Existing messaging/job thread flows still work (if present).

**Evidence / notes:**

---

## 10) Observability & Logging

**Goal:** If something fails in production, you can diagnose it quickly.

- [ ] Client-side error reporting enabled (or equivalent logging).
- [ ] Server-side logs exist for critical actions:
- [ ] job creation / invitations
- [ ] organisation linkage changes
- [ ] role/membership changes
- [ ] Logs include correlation identifiers (jobId/orgId/userId).
- [ ] Sensitive info is not logged.

**Evidence / notes:**

---

## 11) Success Metrics Instrumentation (Recommended)

**Goal:** You can prove Phase 1 success using real telemetry.

- [ ] Track count of “Book Model” clicks and completed job creations.
- [ ] Track organisations created and active (logged in / dashboard usage).
- [ ] Track % of new jobs with organisationId (should be 100%).
- [ ] Track favourites usage by org/team.
- [ ] Exportable dashboard/analytics exists or a Firestore query plan documented.

**Evidence / notes:**

---

## 12) Final Go/No-Go

**Blockers must be all green:**
- [ ] Security & permissions verified
- [ ] Data linkage/migration verified
- [ ] Book Model E2E verified
- [ ] Org/admin dashboards verified
- [ ] Feature flags verified

### Decision
- [ ] **GO** (Phase 1 is launch-ready)
- [ ] **NO-GO** (fix required)

**Notes / action items:**
- 