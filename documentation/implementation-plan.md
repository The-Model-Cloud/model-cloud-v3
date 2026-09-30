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

### 1.3 Organisation Dashboard ✅ COMPLETE

**Problem:** Organisations cannot see their activity - only platform-wide admin dashboards exist.

**Implementation:**

**New Dashboard Components:**

```
src/layouts/organisation/dashboard/
├── index.js                           # Main org dashboard
├── components/
│   ├── OrgStats/index.js             # Key metrics cards (6 cards)
│   ├── RecentJobs/index.js           # Recent job activity
│   ├── TeamActivity/index.js         # Team member activity table
│   ├── SpendChart/index.js           # Spending over time (line chart)
│   ├── TopModels/index.js            # Most booked models with rankings
│   └── UpcomingJobs/index.js         # Upcoming scheduled jobs
```

**Database Index:**
```
// firestore.indexes.json - Added:
{
  "collectionGroup": "jobs",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "organisationId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

**Routes Updated:**
- Added `/organisation/dashboard` route
- Dashboard is first item in Organisation menu
- Available to account managers and admins

**Acceptance Criteria:**
- [x] Organisation members see dashboard on login
- [x] Dashboard shows job statistics (6 metric cards)
- [x] Dashboard shows spend metrics (chart + totals)
- [x] Dashboard shows team activity (table with member stats)
- [x] Dashboard shows top/recent models used (ranked list)

**Status: COMPLETE** (2026-02-20)

---

### 1.3.1 Platform Dashboard (Admin) ✅ COMPLETE

**Problem:** Admins need a centralised view of all organisation activity across the platform.

**Implementation:**

**New Dashboard Components:**

```
src/layouts/admin/dashboard/
├── index.js                                    # Main admin dashboard
├── components/
│   ├── AdminStats/index.js                    # 8 platform-wide metric cards
│   ├── PlatformSpendChart/index.js            # Revenue chart (all orgs)
│   ├── UserGrowth/index.js                    # Model/client signup trends
│   ├── TopOrganisations/index.js              # Ranked org list
│   ├── RecentJobs/index.js                    # Recent jobs (all orgs)
│   └── OrganisationsOverview/index.js         # Sortable org table
```

**Routes Updated:**
- Added `/admin/dashboard` route
- Dashboard under Tools menu
- Available to admin and super admin roles

**Features:**
- 8 key metric cards (jobs, spend, users, models, clients, organisations)
- Platform revenue chart (6-month trend with monthly average)
- User growth bar chart (models vs clients by month)
- Top organisations ranked by activity
- Recent jobs across all organisations
- Searchable, sortable organisations table

**Acceptance Criteria:**
- [x] Admins see platform-wide dashboard
- [x] Dashboard shows aggregated job statistics
- [x] Dashboard shows total platform spend
- [x] Dashboard shows user growth trends
- [x] Dashboard shows organisation rankings
- [x] Organisations table with search and sort

**Status: COMPLETE** (2026-02-20)

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

### 1.4.1 Organisation Management (Admin) ✅ COMPLETE

**Problem:** Admins had no way to create organisations or manage their tiers, licences, and expiry dates.

**Implementation:**

**Pricing Tiers from Firestore:**
- Tiers now fetched from `pricingTiers` Firestore collection
- Fallback to hardcoded defaults if collection unavailable
- 5-minute cache to reduce Firestore reads
- Tiers include: Demo, Starter, Professional, Enterprise, Agency, Custom

**Organisation Creation/Management:**
```
src/layouts/admin/organisations/index.js
└── "Create Organisation" button and dialog
└── Fields: Company Name, Number, Address, VAT, Tier, Licence Limit, Expiry Date
└── Table columns: Tier (chip), Licences (X/Y), Status, Expiry

src/layouts/admin/organisations/detail/index.js
└── "Edit Settings" button and dialog
└── Can change tier, licence limit, expiry, status (Active/Suspended)
└── Shows subscription details section
```

**Company Name → Organisation Linking:**
```
src/layouts/pages/account/settings/components/BasicInfo/index.js
└── Company Name field only editable by admin/super admin
└── On blur, creates or links to organisation via getOrCreateOrganisation()
└── Updates user's organisationId field
└── Account managers see company section but cannot edit Company Name
```

**Files Modified:**
```
src/utils/organisations.js
└── Added getPricingTiers() - fetches from Firestore with caching
└── Added TIER_CONFIG_FALLBACK for offline/error handling
└── Added clearPricingTiersCache() utility
└── Added "custom" tier for flexible licensing

src/routes.js
└── Moved Organisations under Tools menu
```

**Acceptance Criteria:**
- [x] Admins can create organisations with tier, licences, expiry
- [x] Admins can edit organisation settings
- [x] Pricing tiers fetched from Firestore pricingTiers collection
- [x] Company Name in edit-profile creates/links organisation
- [x] Company Name read-only for non-admin users
- [x] Organisations menu under Tools

**Status: COMPLETE** (2026-02-21)

---

### 1.5 Organisation Model Relationships (Favourites) ✅ COMPLETE

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
- [x] Lists can be owned by user, organisation, or team
- [x] Organisation lists visible to all org members
- [x] Team lists visible to team members
- [x] Lists persist when individual users leave
- [x] Clear ownership indication in UI

**Status: COMPLETE** (2026-02-21)

Implementation details:
- `src/utils/favourites.js` - Added LIST_OWNER_TYPES, ownerType/organisationId/teamId fields
- `src/context/FavouritesContext.js` - Added organisationLists and teamLists with real-time listeners
- `src/layouts/favourites/overview/index.js` - Added tabs for My Lists / Organisation / Team
- `src/components/Favourites/ListCard/index.js` - Added ownership badges
- `src/components/Favourites/CreateListModal/index.js` - Added owner type selector
- `firestore.rules` - Updated favouriteLists rules for org/team access

---

## Phase 2: High Priority Features

These should be completed before public launch.

---

### 2.1 Rating System (Post-Job Reviews)

**Problem:** No way for clients and models to rate each other after job completion. No trust indicators on profiles.

**User Story:**
- After a job is marked "completed", both parties receive a rating request
- Client rates the model (professionalism, punctuality, quality, etc.)
- Model rates the client (communication, professionalism, payment, etc.)
- Average ratings displayed on profiles

**Implementation:**

**Data Model:**

```javascript
// New collection: ratings/{ratingId}
{
  jobId: "jobId",                    // Reference to completed job
  jobReference: "TMC-20260220-...",  // Human-readable job ref

  // Who is being rated
  ratedUserId: "userId",
  ratedUserType: "model" | "client",
  ratedUserName: "John Smith",

  // Who is doing the rating
  raterUserId: "userId",
  raterUserType: "model" | "client",
  raterUserName: "Jane Doe",

  // Rating data
  overallRating: 4.5,               // 1-5 stars (0.5 increments)
  categories: {
    professionalism: 5,
    communication: 4,
    punctuality: 5,
    // Model-specific:
    appearance: 4,                  // Only for model ratings
    skillLevel: 5,                  // Only for model ratings
    // Client-specific:
    briefClarity: 4,                // Only for client ratings
    paymentPromptness: 5,           // Only for client ratings
  },
  comment: "Great to work with...", // Optional public comment
  privateNote: "Internal note...",  // Optional private feedback (admin only)

  // Metadata
  createdAt: Timestamp,
  status: "pending" | "submitted" | "flagged",
  isPublic: true,                   // Can be hidden if flagged
}

// Update users collection - add fields:
{
  // ... existing fields
  averageRating: 4.7,               // Calculated average
  ratingCount: 23,                  // Number of ratings received
  ratingBreakdown: {                // Category averages
    professionalism: 4.8,
    communication: 4.5,
    punctuality: 4.9,
    // etc.
  },
}

// New collection: ratingRequests/{requestId}
{
  jobId: "jobId",
  jobReference: "TMC-20260220-...",
  requestedFromUserId: "userId",
  requestedFromUserType: "model" | "client",
  rateUserId: "userId",             // Who to rate
  rateUserType: "model" | "client",
  status: "pending" | "completed" | "expired",
  createdAt: Timestamp,
  completedAt: Timestamp | null,
  reminderSentAt: Timestamp | null,
  expiresAt: Timestamp,             // 30 days after job completion
}
```

**Files to Create:**

```
src/components/RatingModal/
├── index.js                        # Main rating modal
├── StarRating.js                   # Reusable star input component
└── CategoryRatings.js              # Category breakdown input

src/layouts/ratings/
├── index.js                        # Pending ratings list (My Ratings to Give)
└── received/index.js               # Ratings received (My Reviews)

src/utils/ratings.js
├── createRatingRequest()           # Called after job completion
├── submitRating()                  # Submit a rating
├── getRatingsForUser()             # Get user's received ratings
├── getPendingRatingRequests()      # Get ratings user needs to give
├── calculateUserAverages()         # Recalculate user's average ratings
├── flagRating()                    # Admin: flag inappropriate rating
```

**Files to Modify:**

```
src/layouts/jobs/job-details/index.js
└── After job completion, trigger rating request creation

src/layouts/pages/profile/public-profile/index.jsx
└── Display average rating and rating count
└── Link to view all ratings/reviews

src/layouts/pages/profile/components/Header/index.js
└── Display star rating badge

functions/index.js
└── onJobCompleted() - Create rating requests for both parties
└── sendRatingReminder() - Scheduled function for reminders
└── onRatingSubmitted() - Update user's average ratings
```

**Notification Flow:**

1. Job marked as "completed"
2. Cloud Function creates two `ratingRequests` documents
3. Email sent to both parties: "How was your experience with [Name]?"
4. In-app notification appears
5. After 7 days, send reminder if not completed
6. Request expires after 30 days

**UI Components:**

1. **Rating Request Banner** - Shows on dashboard if pending ratings
2. **Rating Modal** - Star rating + categories + optional comment
3. **Profile Rating Badge** - Stars + count next to user name
4. **Reviews Section** - Full list of reviews on profile
5. **Ratings Dashboard** - View pending/given/received ratings

**Rating Categories:**

*For rating Models:*
- Overall Experience (required, 1-5 stars)
- Professionalism
- Punctuality
- Communication
- Appearance/Presentation
- Skill Level

*For rating Clients:*
- Overall Experience (required, 1-5 stars)
- Professionalism
- Communication
- Brief Clarity
- Payment Promptness
- Would Work Again

**Display Rules:**
- Only show ratings from verified, completed jobs
- Minimum 1 rating to show average
- Show "New" badge if < 3 ratings
- Comments are public (can be flagged/hidden by admin)
- Private notes visible only to platform admins

**Acceptance Criteria:**
- [ ] Rating requests created automatically on job completion
- [ ] Email notifications sent for rating requests
- [ ] Rating modal with star input and categories
- [ ] Ratings stored in Firestore
- [ ] Average ratings calculated and displayed on profiles
- [ ] Pending ratings shown on user dashboard
- [ ] Admin can flag/hide inappropriate ratings
- [ ] Reminder sent after 7 days if not rated

---

### 2.3 Direct Messaging to Models

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

### 2.4 Job Cancellation/Withdrawal

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

### 2.5 Account Manager Self-Service UI

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
- [ ] Test Job Creation from a Client perspective
- [ ] Test Client Paying for Job
- [ ] Test Job Application from a Model perspective
- [ ] Test Model Completing Job and Viewing Balance in Payouts page, then withdrawing the available balance to their bank account

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

### 2.4 Client Import (CSV)

**Problem:** Admins need an easy way to bulk import clients and their organisations, similar to model import.

**Implementation:**

**New Page:**
```
src/layouts/clients/import/index.js
└── CSV upload with drag & drop
└── Downloadable example template
└── Progress tracking and results display
└── Super admin only access
```

**Cloud Function:**
```javascript
// functions/index.js - importClients()
// - Creates client users with Firebase Auth
// - Creates or links to organisations by company name
// - All imports default to "free" tier
// - Default password: "Client123!"
// - Logs action to adminLogs collection
```

**CSV Template Columns:**
- Required: email, firstName, lastName
- Organisation: companyName, companyNumber, vatNumber
- Address: address1, address2, city, county, country, postcode
- Contact: phone
- Company Profile: instagram, companyDescription

**Acceptance Criteria:**
- [x] CSV upload with validation
- [x] Downloadable example template
- [x] Creates Firebase Auth users
- [x] Creates/links organisations automatically
- [x] All clients default to "free" tier
- [x] Super admin only access
- [x] Results summary with status per client

**Status: COMPLETE** (2026-02-21)

---

### 2.5 Subscription Upgrade Process

**Problem:** Clients imported on the free tier need a clear path to upgrade to paid tiers.

**Current Tier System:**
```javascript
// Organisation tiers (from pricingTiers collection):
- free: 7 Day FREE Trial, 1 licence (default for imports)
- demo: Demo, 1 licence, has expiry date
- starter: Starter, £49.99/mo, 1 licence
- professional: Professional, £99.99/mo, 3 licences
- agency: Agency, £149.99/mo, 6 licences
- custom: Flexible configuration
```

**Manual Upgrade Process (Current):**
1. Admin navigates to Tools > Organisations
2. Click on organisation name to view details
3. Click "Edit Settings" button
4. Change tier dropdown (e.g., "free" → "professional")
5. Update licence limit if needed
6. Set expiry date for time-limited tiers (demo)
7. Save changes

**Implementation Required - Self-Service Upgrade:**

```
Files to create:
├── src/layouts/organisation/billing/index.js
│   └── Current plan display
│   └── Available plans comparison table
│   └── Upgrade/downgrade buttons
│   └── Stripe Checkout integration
│
├── src/components/UpgradePlanModal/index.js
│   └── Plan selection
│   └── Payment method
│   └── Confirmation
│
├── functions/index.js
│   └── createSubscriptionCheckout()
│   └── handleSubscriptionWebhook()
│   └── updateOrganisationTier()
│   └── handleSubscriptionCancellation()
```

**Stripe Integration:**
- Use existing Stripe Connect setup
- Create Checkout Sessions for upgrades
- Webhook handlers for subscription events
- Automatic tier updates on payment success

**User Flow:**
1. Account manager clicks "Upgrade Plan" in org settings
2. Comparison table shows current plan vs available plans
3. Select desired plan
4. Redirected to Stripe Checkout
5. On success, organisation tier updated automatically
6. Email confirmation sent

**Acceptance Criteria:**
- [ ] Billing page shows current plan
- [ ] Plan comparison table with features
- [ ] Stripe Checkout for upgrades
- [ ] Webhook handles subscription changes
- [ ] Automatic tier updates
- [ ] Email notifications for plan changes
- [ ] Downgrade with pro-rata handling
- [ ] Cancellation flow

**Priority:** HIGH - Required for monetisation

---

---

### 2.6 Platform Settings & Email Notifications ✅ COMPLETE

**Problem:** Users had no control over email notifications, and notification settings were not persisted or functional.

**Implementation:**

**User Notification Preferences:**

The Platform Settings component (`src/layouts/pages/profile/profile-overview/components/PlatformSettings/index.js`) now manages:

| Setting | User Type | Description |
|---------|-----------|-------------|
| `emailOnMessage` | All | Email when someone sends a message |
| `emailOnJobMatch` | Models | Email when profile matches a new job listing |
| `emailOnModelMatch` | Clients | Email with matching models when posting a job |
| `emailOnJobApplication` | Clients | Email when a model applies to their job |

**Deferred Features (noted for future):**
- `emailOnPostAnswer` - Email when someone answers on my post
- `emailOnMention` - Email when someone mentions me

**Marketing Preferences (Mailchimp Integration):**

| Preference | Mailchimp Tag | Description |
|------------|---------------|-------------|
| `newLaunches` | "New Launches" | New features and launches |
| `productUpdates` | "Product Updates" | Monthly product updates |
| `newsletter` | "Newsletter" | General news and insights |

**Data Model - User Document:**
```javascript
{
  // ... existing fields
  notificationSettings: {
    emailOnMessage: true,         // Default: true
    emailOnJobMatch: true,        // Models only
    emailOnModelMatch: true,      // Clients only
    emailOnJobApplication: true,  // Clients only
  },
  marketingPreferences: {
    newLaunches: false,
    productUpdates: false,
    newsletter: false,
  }
}
```

**Cloud Functions Created/Updated:**

| Function | Location | Purpose |
|----------|----------|---------|
| `onJobCreated` | functions/index.js:1527 | Trigger when job posted - emails matching models and client |
| `updateMailchimpSubscription` | functions/index.js:7875 | Syncs marketing preferences with Mailchimp |
| `onMessageCreated` (updated) | functions/index.js:1740 | Checks `emailOnMessage` before sending |
| `sendApplicationEmail` (updated) | functions/index.js:1077 | Checks `emailOnJobApplication` before sending |

**Files Modified:**
```
apps/platform/src/layouts/pages/profile/profile-overview/components/PlatformSettings/index.js
└── Complete rewrite with role-based toggles
└── Loads/saves settings from Firestore
└── Mailchimp integration for marketing preferences

apps/platform/src/utils/api.js
└── Updated sendApplicationEmail to accept clientUid

apps/platform/src/layouts/jobs/job-details/index.js
└── Pass clientUid to sendApplicationEmail

functions/index.js
└── Added onJobCreated trigger
└── Added updateMailchimpSubscription function
└── Updated onMessageCreated to check user preferences
└── Updated sendApplicationEmail to check user preferences
```

**Environment Variables Required (for Mailchimp):**
```env
MAILCHIMP_API_KEY=your-api-key
MAILCHIMP_AUDIENCE_ID=your-audience-id
MAILCHIMP_SERVER_PREFIX=us21
```

**Email Templates in Cloud Functions:**

| Email | Lines | Description |
|-------|-------|-------------|
| Job Match (to Model) | ~1615-1645 | New job matching profile |
| Model Match Summary (to Client) | ~1660-1720 | List of matching models |
| New Message | ~1770-1800 | Someone sent a message |
| Job Application (to Client) | ~1100-1115 | Model applied to job |
| Job Application Confirmation (to Model) | ~1138-1150 | Application submitted |

**Acceptance Criteria:**
- [x] Settings load from Firestore on mount
- [x] Toggle changes save to Firestore immediately
- [x] Role-based toggles (models see job match, clients see application alerts)
- [x] Marketing preferences sync with Mailchimp
- [x] onMessageCreated respects emailOnMessage setting
- [x] sendApplicationEmail respects emailOnJobApplication setting
- [x] onJobCreated sends matching emails to models and clients
- [x] All emails check user preferences before sending

**Status: COMPLETE** (2026-02-24)

---

---

## Phase 3: SEO & Technical Requirements

These items improve discoverability and search engine indexing.

---

### 3.1 Dynamic Sitemap Generation

**Problem:** No sitemap.xml exists. Public model profiles are not indexed by search engines.

**Current State:**
- `robots.txt` allows crawling of public profiles (root-level slugs like `/model-name`)
- No sitemap.xml file exists
- Direct URL access to `/sitemap.xml` loads the React app (blank page)

**Implementation:**

**Option A: Static Sitemap via Cloud Function (Recommended)**

Create a Cloud Function that generates sitemap.xml dynamically from verified model profiles.

```
functions/index.js
└── generateSitemap() - HTTPS callable function
    └── Query verified, public models from Firestore
    └── Generate XML sitemap with model profile URLs
    └── Return XML with correct content-type
    └── Cache for 24 hours

Sitemap URL: https://us-central1-model-cloud.cloudfunctions.net/generateSitemap
└── robots.txt points to this URL
```

**Sitemap Contents:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://app.themodel.cloud/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://app.themodel.cloud/model-slug-1</loc>
    <lastmod>2026-03-15</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <!-- ... more model profiles -->
</urlset>
```

**Option B: Static File Generation (Alternative)**

Scheduled Cloud Function that generates sitemap.xml and uploads to Firebase Storage/hosting.

```
functions/index.js
└── generateSitemapScheduled() - Runs daily via Cloud Scheduler
    └── Query all verified, public models
    └── Generate sitemap.xml content
    └── Upload to public storage bucket
    └── CDN serves static file
```

**Files to Create:**
```
functions/index.js
└── generateSitemap() - HTTPS function returning XML
└── OR generateSitemapScheduled() - Scheduled generation

apps/platform/public/robots.txt
└── Update Sitemap: line to point to Cloud Function URL
```

**Acceptance Criteria:**
- [ ] Sitemap includes all verified, public model profiles
- [ ] Sitemap accessible via URL in robots.txt
- [ ] Sitemap updates automatically when new models are verified
- [ ] Sitemap includes lastmod dates from profile updates
- [ ] Google Search Console can fetch and parse sitemap

**Priority:** MEDIUM - Important for SEO and discoverability

---

### 3.2 Meta Tags for Public Profiles

**Problem:** Public model profiles lack proper meta tags for social sharing and SEO.

**Implementation:**

Since React is client-rendered, implement meta tags via:
1. React Helmet for dynamic updates
2. Cloud Function for server-side rendering of meta tags (for crawlers)

```
Files to modify:
├── src/layouts/pages/profile/public-profile/index.jsx
│   └── Add React Helmet with dynamic meta tags
│   └── og:title, og:description, og:image, twitter:card
│
├── functions/index.js (optional)
│   └── renderPublicProfile() - Returns HTML with meta tags for crawlers
```

**Acceptance Criteria:**
- [ ] Public profiles have unique title tags
- [ ] Open Graph meta tags for social sharing
- [ ] Twitter card meta tags
- [ ] Profile image as og:image

**Priority:** LOW - Nice to have for social sharing

---

## Dependencies

| Feature | Depends On |
|---------|------------|
| Org Dashboard | Jobs linked to organisations |
| Org Analytics | Jobs linked to organisations |
| Team Permissions | Team structure implemented |
| Org Favourites | Team structure implemented |
| Account Manager UI | Team structure implemented |
| Self-Service Upgrade | Stripe Connect, Organisation tiers |
| Email Notifications | SendGrid configured, user preferences |
| Mailchimp Marketing | Mailchimp API credentials |
| Email Newsletters | SendGrid, Admin role access |

---

### 2.7 Email Newsletter System

**Problem:** Admins need to send email newsletters to segmented user groups (models, clients, etc.) without relying on external email marketing platforms.

**Implementation:**

**Data Model - Firestore Collections:**

```javascript
// Collection: emailTemplates
{
  id: string,
  name: string,                  // "Monthly Newsletter"
  subject: string,               // Email subject line
  content: string,               // HTML from TipTap editor
  previewText: string,           // Preview text (optional)
  category: string,              // "newsletter" | "announcement" | "promotional"
  isActive: boolean,
  createdAt: Timestamp,
  createdBy: string,
  updatedAt: Timestamp,
  updatedBy: string,
}

// Collection: emailCampaigns
{
  id: string,
  name: string,                  // Campaign name
  subject: string,
  content: string,               // HTML content
  previewText: string,
  templateId: string | null,
  audience: {
    type: string,                // "all_models" | "all_clients" | "both" | "verified_models" | "active_subscribers"
    recipientCount: number,
  },
  status: string,                // "draft" | "scheduled" | "sending" | "sent" | "failed" | "cancelled"
  scheduledFor: Timestamp | null,
  sentAt: Timestamp | null,
  stats: {
    totalRecipients: number,
    sent: number,
    failed: number,
  },
  createdAt: Timestamp,
  createdBy: string,
  updatedAt: Timestamp,
  updatedBy: string,
}

// Subcollection: emailCampaigns/{campaignId}/recipients
{
  id: string,
  userId: string,
  email: string,
  name: string,
  role: string,
  status: string,                // "pending" | "sent" | "failed"
  sentAt: Timestamp | null,
  error: string | null,
}

// Collection: scheduledEmails
{
  id: string,
  campaignId: string,
  scheduledFor: Timestamp,
  status: string,                // "pending" | "processing" | "completed" | "failed"
  processedAt: Timestamp | null,
  error: string | null,
}
```

**Files to Create:**

```
apps/platform/src/layouts/admin/newsletters/
├── index.js                           # Campaign list page
├── components/
│   ├── CampaignList/index.js          # DataTable for campaigns
│   ├── CampaignStats/index.js         # Stats cards
│   ├── RecipientPreview/index.js      # Preview dialog
│   ├── ScheduleDialog/index.js        # Date/time picker
│   └── AudienceSelector/index.js      # Audience radio buttons
├── create/index.js                    # Create campaign
├── edit/index.js                      # Edit draft campaign
├── detail/index.js                    # View campaign stats
└── templates/
    ├── index.js                       # Templates list
    ├── create/index.js                # Create template
    └── edit/index.js                  # Edit template

apps/platform/src/utils/
└── newsletterFirestore.js             # Firestore CRUD operations
```

**Files to Modify:**

```
apps/platform/src/routes.js
└── Add newsletter routes under Tools with ADMIN_ROLES

functions/index.js
└── Add getNewsletterRecipientCount() - onCall
└── Add sendNewsletterCampaign() - onCall, 540s timeout
└── Add processScheduledNewsletters() - onSchedule, every 5 minutes
└── Add cancelScheduledCampaign() - onCall

firestore.rules
└── Add rules for emailTemplates, emailCampaigns, scheduledEmails collections
```

**Cloud Functions:**

| Function | Type | Purpose |
|----------|------|---------|
| `getNewsletterRecipientCount` | onCall | Returns count and sample emails for audience type |
| `sendNewsletterCampaign` | onCall (540s) | Validates admin, creates recipients, sends via SendGrid in batches |
| `processScheduledNewsletters` | onSchedule | Runs every 5 min, triggers due campaigns |
| `cancelScheduledCampaign` | onCall | Cancels scheduled campaign, updates status |

**Audience Segmentation:**

| Type | Query | Description |
|------|-------|-------------|
| `all_models` | `role == "model"` | All registered models |
| `all_clients` | `role == "client"` | All registered clients |
| `both` | `role in ["model", "client"]` | Models and clients |
| `verified_models` | `role == "model" && verified == true` | Only verified models |
| `active_subscribers` | `role == "client" && subscription.status == "active"` | Clients with paid subscriptions |

**Routes to Add:**

```javascript
// In routes.js under Tools section
{
  type: "collapse",
  name: "Email Newsletters",
  key: "newsletters",
  icon: <Icon fontSize="small">email</Icon>,
  roles: ADMIN_ROLES,
  collapse: [
    { name: "Campaigns", key: "newsletter-campaigns", route: "/admin/newsletters", component: <Newsletters /> },
    { name: "Templates", key: "newsletter-templates", route: "/admin/newsletters/templates", component: <NewsletterTemplates /> },
    { name: "Create Campaign", key: "newsletter-create", route: "/admin/newsletters/create", component: <NewsletterCreate /> },
  ],
},
```

**Implementation Phases:**

| Phase | Deliverables |
|-------|--------------|
| Phase 1: MVP | Campaign list, create page with TipTap, audience selector with live count, immediate send |
| Phase 2: Templates | Templates CRUD, template selection in campaign creation |
| Phase 3: Scheduling | Schedule dialog, scheduled function, cancel functionality |
| Phase 4: Tracking | Campaign detail page with stats, recipient-level tracking |
| Phase 5: Polish | Email preview, test send, variable insertion ({{firstName}}) |

**Acceptance Criteria:**
- [ ] Admin/Super Admin only access to /admin/newsletters
- [ ] Create campaign with TipTap rich text editor
- [ ] Audience selector shows live recipient count
- [ ] Save campaigns as drafts
- [ ] Send immediately via SendGrid (batches of 100)
- [ ] Schedule campaigns for future delivery
- [ ] Cancel scheduled campaigns
- [ ] View campaign stats after sending
- [ ] Reusable email templates
- [ ] All sends logged to adminLogs collection

**Security Considerations:**
- Cloud Functions validate admin/super admin role
- Firestore rules restrict email collections to admins
- SendGrid API key in environment variables
- Rate limiting: 100 emails per batch with delays
- All newsletter sends logged to adminLogs

**Priority:** MEDIUM - Admin productivity feature

**Status:** PLANNED
