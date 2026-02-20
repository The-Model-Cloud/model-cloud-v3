# Implementation Plan: Critical Missing Features

This document outlines the technical implementation plan for features required to align the platform with the February 2026 press release claims.

**Created:** 2026-02-20

---

## Phase 1: Critical Fixes (Press Release Accuracy)

These items must be completed before the press release goes live.

---

### 1.1 "Book Model" Button Functionality ✅ COMPLETE

**Problem:** The "Book Model" button on model profiles has no onClick handler.

**Location:** `src/layouts/pages/profile/public-profile/index.jsx:376`

**Implementation Options:**

**Option A: Direct Job Creation (Recommended)**
- Clicking "Book Model" opens a streamlined job creation flow pre-populated with that model
- After job creation, automatically sends invitation to that model

**Option B: Enquiry System**
- Clicking "Book Model" opens an enquiry modal
- Client enters brief details and message
- Creates a thread between client and model
- Model receives notification

**Technical Changes:**

```
Files to modify:
├── src/layouts/pages/profile/public-profile/index.jsx
│   └── Add onClick handler to "Book Model" button
│   └── Add BookModelModal component import
│
├── src/components/BookModelModal/index.js (NEW)
│   └── Modal with job type selection
│   └── Quick job details form
│   └── Submit creates job + invitation OR enquiry thread
│
├── src/utils/api.js
│   └── Add createQuickJob() or createEnquiry() function
│
└── functions/index.js
    └── Add createEnquiryThread() if using Option B
```

**Database Changes:**
- If Option B: Add thread type "enquiry" to messaging system
- Add `sourceModelId` field to jobs collection for tracking

**Acceptance Criteria:**
- [x] "Book Model" button is clickable
- [x] Modal opens with appropriate form
- [x] Successful submission creates job/enquiry
- [x] Model receives notification
- [x] Client is redirected to job/thread

**Status: COMPLETE** (2026-02-20)

Implementation details:
- `src/components/BookModelModal/index.js` - Full modal with job selection
- `src/layouts/pages/profile/public-profile/index.jsx` - Button with onClick handler
- `src/utils/invitations.js` - sendJobInvitation with notifications + messaging
- Option A (Direct Job) implemented: select existing job or create new with model pre-selected

---

### 1.2 Organisation Team Structure ✅ COMPLETE

**Problem:** Press release claims "tiered access levels" and "teams and departments" which don't exist.

**Implementation:**

**Data Model Changes:**

```javascript
// New collection: organisations/{orgId}/teams/{teamId}
{
  name: "Photography Team",
  description: "Handles all photo shoot bookings",
  createdAt: Timestamp,
  createdBy: "userId",
  permissions: {
    canCreateJobs: true,
    canAwardJobs: true,
    canViewAllOrgJobs: false,
    canManageTeamMembers: false,
    canViewAnalytics: false,
    canManageFavourites: true
  }
}

// Update users collection - add fields:
{
  // ... existing fields
  organisationId: "orgId",
  teamId: "teamId",           // NEW
  organisationRole: "member", // NEW: "owner", "admin", "member"
}
```

**Files Created:**

```
src/layouts/organisation/
├── teams/
│   ├── index.js               # Team list view with create/delete dialogs
│   └── detail/index.js        # Team detail & member management
├── members/
│   └── index.js               # All org members with role/team editing
```

**Files Modified:**

```
src/routes.js
└── Added organisation routes (Teams, Members)
└── Added invisible route for team detail

src/utils/organisations.js
└── Added ORG_ROLES constant (owner, admin, member)
└── Added ROLE_PERMISSIONS constant
└── Added team CRUD: createTeam, getOrganisationTeams, getTeamById, updateTeam, deleteTeam
└── Added member management: getTeamMembers, assignUserToTeam, updateMemberRole, addUserToOrganisation, removeUserFromOrganisation
└── Added permission checks: getUserPermissions, hasPermission, canManageOrganisation, canInviteMembers, canViewAllOrgJobs, canManageTeamMembers

firestore.rules
└── Added isInOrganisation() helper
└── Added getUserOrganisationRole() helper
└── Added isOrgAdminOrOwner() helper
└── Added teams subcollection rules under organisations
```

**Acceptance Criteria:**
- [x] Organisations can create teams
- [x] Users can be assigned to teams
- [x] Teams have configurable permissions
- [x] Organisation roles: owner, admin, member
- [x] Account managers can manage their organisation
- [x] Team-based access control works

**Status: COMPLETE** (2026-02-20)

---

### 1.3 Organisation Dashboard

**Problem:** Organisations cannot see their activity - only platform-wide admin dashboards exist.

**Implementation:**

**New Dashboard Components:**

```
src/layouts/organisation/dashboard/
├── index.js                           # Main org dashboard
├── components/
│   ├── OrgStats/index.js             # Key metrics cards
│   ├── RecentJobs/index.js           # Recent job activity
│   ├── TeamActivity/index.js         # Team member activity
│   ├── SpendChart/index.js           # Spending over time
│   ├── TopModels/index.js            # Most booked models
│   └── UpcomingJobs/index.js         # Calendar of upcoming work
```

**Backend Functions:**

```javascript
// functions/index.js - Add:

getOrganisationStats(orgId)
// Returns: totalJobs, activeJobs, completedJobs, totalSpend,
//          modelCount, teamMemberCount

getOrganisationJobHistory(orgId, dateRange)
// Returns: Array of jobs with status, spend, model info

getOrganisationSpendAnalytics(orgId, dateRange)
// Returns: Spend by month, by team, by job type
```

**Database Index:**
```
// firestore.indexes.json - Add:
{
  "collectionGroup": "jobs",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "organisationId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

**Acceptance Criteria:**
- [ ] Organisation members see dashboard on login
- [ ] Dashboard shows job statistics
- [ ] Dashboard shows spend metrics
- [ ] Dashboard shows team activity
- [ ] Dashboard shows top/recent models used

---

### 1.4 Link Jobs to Organisations ✅ COMPLETE

**Problem:** Jobs only have `userId`, not `organisationId`. Organisations cannot track their bookings.

**Implementation:**

**Schema Change:**

```javascript
// Jobs collection - add fields:
{
  // ... existing fields
  organisationId: "orgId",    // NEW - copied from user at creation
  teamId: "teamId",           // NEW - optional, for team tracking
}
```

**Files Modified:**

```
src/layouts/jobs/new-job/index.js
└── Added organisationId and teamId to jobData (from user context)

src/layouts/jobs/my-jobs/index.js
└── Added organisation view mode
└── Queries jobs by organisationId for organisation members
└── Tracks organisation job count

src/layouts/jobs/my-jobs/components/MyJobFilters/index.js
└── Added "Organisation" filter option (conditionally shown)
└── Updated job count badge for organisation jobs

functions/index.js
└── Added migrateJobsToOrganisations() - admin callable migration function

firestore.rules
└── Added getUserOrganisationId() helper
└── Added hasOrganisation() helper
└── Added isInJobOrganisation() helper
└── Updated jobs rules for org-based access
```

**Migration Script:**
```javascript
// Run via: node scripts/migrate-jobs.js
// For each job:
//   1. Get job.userId
//   2. Get user document
//   3. If user.organisationId exists, update job.organisationId
```

**Migration Results (2026-02-20):**
- Total jobs: 10
- Updated with organisationId: 8
- Skipped (user has no org): 2

**Acceptance Criteria:**
- [x] New jobs capture organisationId from creator
- [x] Existing jobs backfilled with organisationId
- [x] Organisation members can view all org jobs
- [x] My Jobs page has "Organisation Jobs" tab
- [x] Firestore rules enforce org-based access

**Status: COMPLETE** (2026-02-20)
- Migration script: `scripts/migrate-jobs.js`
- Migration executed successfully

---

### 1.5 Organisation Model Relationships (Favourites)

**Problem:** Favourites are user-owned. When a user leaves, model relationships are lost.

**Implementation:**

**Schema Change:**

```javascript
// favouriteLists collection - add fields:
{
  // ... existing fields
  ownerType: "user" | "organisation" | "team",  // NEW
  organisationId: "orgId",                       // NEW (if org-owned)
  teamId: "teamId",                              // NEW (if team-owned)
}
```

**Files to Modify:**

```
src/utils/favourites.js
└── createFavouriteList() - Add ownerType, organisationId params
└── getFavouriteLists() - Filter by ownerType
└── Add getOrganisationFavouriteLists()

src/layouts/favourites/index.js
└── Add tabs: "My Lists" | "Organisation Lists" | "Team Lists"
└── Show ownership badge on lists

src/context/FavouritesContext.js
└── Include organisation lists in context

firestore.rules
└── Org members can read/write org-owned lists
└── Team members can read/write team-owned lists
```

**Acceptance Criteria:**
- [ ] Lists can be owned by user, organisation, or team
- [ ] Organisation lists visible to all org members
- [ ] Team lists visible to team members
- [ ] Lists persist when individual users leave
- [ ] Clear ownership indication in UI

---

## Phase 2: High Priority Features

These should be completed before public launch.

---

### 2.1 Direct Messaging to Models

**Problem:** Clients can only message models via job applications.

**Implementation:**

Add "Message" button to model profiles that creates a direct thread.

```
Files to modify:
├── src/layouts/pages/profile/public-profile/index.jsx
│   └── Add "Message" button next to "Book Model"
│
├── src/utils/messaging.js
│   └── Add createDirectThread(clientId, modelId)
│
├── functions/index.js
│   └── Add createDirectThread() - type "direct"
│
└── firestore.rules
    └── Allow direct thread creation between client and model
```

**Thread Type Addition:**
```javascript
// Thread types: "job", "support", "direct" (NEW)
{
  type: "direct",
  participants: { clientId: true, modelId: true },
  createdAt: Timestamp,
  // No job reference
}
```

---

### 2.2 Job Cancellation/Withdrawal

**Problem:** Clients cannot close a job posting or cancel an awarded booking.

**Implementation:**

```
Files to create/modify:
├── src/layouts/jobs/job-details/components/JobActions/index.js (NEW)
│   └── "Close Job" button (stops applications)
│   └── "Cancel Booking" button (un-awards job, pre-payment only)
│
├── src/layouts/jobs/job-details/index.js
│   └── Import and display JobActions component
│
├── functions/index.js
│   └── closeJob() - Sets status to "closed"
│   └── cancelJobAward() - Removes awardedTo, notifies model
│
└── Jobs schema additions:
    └── status: "open" | "closed" | "awarded" | "paid" | "completed"
```

---

### 2.3 Account Manager Self-Service UI

**Problem:** Route exists but points to placeholder component.

**Implementation:**

Replace placeholder at `src/routes.js:305-306` with actual organisation management.

```
Files to create:
├── src/layouts/organisation/users/index.js
│   └── List organisation members
│   └── Invite new members
│   └── Change member roles
│   └── Remove members
│
├── src/layouts/organisation/users/invite/index.js
│   └── Email invitation form
│   └── Role selection
│   └── Team assignment
│
└── functions/index.js
    └── inviteOrganisationMember()
    └── removeOrganisationMember()
    └── updateOrganisationMemberRole()
```

---

## Implementation Order

```
Week 1-2: Phase 1.4 (Link Jobs to Organisations)
          └── Foundation for org features
          └── Includes migration script

Week 2-3: Phase 1.2 (Organisation Team Structure)
          └── Data model for teams
          └── Basic team CRUD

Week 3-4: Phase 1.5 (Organisation Favourites)
          └── Extend favourites system
          └── Org/team ownership

Week 4-5: Phase 1.3 (Organisation Dashboard)
          └── Depends on jobs being linked
          └── Analytics and reporting

Week 5:   Phase 1.1 (Book Model Button)
          └── Quick win, standalone fix

Week 6:   Phase 2.1-2.3 (High Priority)
          └── Messaging, cancellation, account manager UI
```

---

## Testing Requirements

### Unit Tests
- [ ] Organisation permission checking functions
- [ ] Team membership validation
- [ ] Job-organisation linking logic
- [ ] Favourite list ownership logic

### Integration Tests
- [ ] Create job → verify organisationId captured
- [ ] Invite org member → verify access granted
- [ ] Create org favourite list → verify team access
- [ ] Book model flow → verify job created and invitation sent

### E2E Tests
- [ ] Full organisation onboarding flow
- [ ] Account manager manages team
- [ ] Client books model from profile
- [ ] Organisation views all their jobs

---

## Rollback Plan

Each phase should be feature-flagged:

```javascript
// src/config/featureFlags.js
export const FEATURE_FLAGS = {
  ORG_TEAMS: false,           // Phase 1.2
  ORG_DASHBOARD: false,       // Phase 1.3
  JOBS_ORG_LINKED: false,     // Phase 1.4
  ORG_FAVOURITES: false,      // Phase 1.5
  BOOK_MODEL_BUTTON: false,   // Phase 1.1
  DIRECT_MESSAGING: false,    // Phase 2.1
  JOB_CANCELLATION: false,    // Phase 2.2
};
```

Enable flags progressively after testing each phase.

---

## Success Metrics

After implementation, verify:

1. **Book Model:** >0 jobs created via "Book Model" button
2. **Teams:** Organisations have created teams
3. **Dashboard:** Account managers logging in and using dashboard
4. **Jobs Linked:** 100% of new jobs have organisationId
5. **Org Favourites:** Organisation-owned lists being created

---

## Dependencies

| Feature | Depends On |
|---------|------------|
| Org Dashboard | Jobs linked to organisations |
| Org Analytics | Jobs linked to organisations |
| Team Permissions | Team structure implemented |
| Org Favourites | Team structure implemented |
| Account Manager UI | Team structure implemented |
