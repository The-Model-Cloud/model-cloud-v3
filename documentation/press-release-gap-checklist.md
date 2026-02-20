# Press Release Gap Checklist

This checklist tracks the gaps between the February 2026 press release claims and the current platform implementation.

**Last Updated:** 2026-02-20
**Overall Completion:** ~80% (6 items completed today)

---

## 1. Direct Model Access

**Press Claim:** *"Browse and connect with a comprehensive database of experienced, proven models"*

### Implemented
- [x] Browse models with grid/list view
- [x] Search models by name/location
- [x] Filter by gender, country, county, city
- [x] Filter by skills/categories
- [x] Filter by languages (40+)
- [x] Filter by measurements (height, waist, hips, bra, dress size)
- [x] View model portfolios
- [x] View model measurements
- [x] View/download Z-cards
- [x] Sort by name, location

### Recently Implemented
- [x] **"Book Model" button functionality** - COMPLETED 2026-02-20
  - New component: `src/components/BookModelModal/index.js`
  - Updated: `src/layouts/pages/profile/public-profile/index.jsx`
  - Updated: `src/layouts/jobs/new-job/index.js` (auto-invite after job creation)
  - Features:
    - Shows list of user's active jobs to invite model to
    - Option to create new job (redirects with `?inviteModel=` param)
    - Tracks already-invited models per job
    - Sends invitation email and in-app notification

### Missing - Critical

- [ ] **Direct messaging to models** - Cannot contact models outside of job context
  - No "Contact Model" or "Message Model" button
  - Messaging only works via job applications
  - Priority: **HIGH**

### Missing - Enhancement
- [ ] Display years of experience
- [ ] Display previous work history
- [ ] Model rating/testimonial system
- [ ] Portfolio sample count display
- [ ] Model availability calendar

---

## 2. Self-Service Booking

**Press Claim:** *"Book models directly through the platform, eliminating delays"*

### Implemented
- [x] Multi-step job creation wizard (5 steps)
- [x] Job reference number generation (TMC-YYYYMMDD-HHMMSS)
- [x] Models can apply for jobs
- [x] Application confirmation emails
- [x] Client notification of applications
- [x] Award job to specific model
- [x] Payment amount agreement at award
- [x] Platform fee display (5%)
- [x] Model matching algorithm
- [x] Invite specific models to jobs
- [x] Track invitation status
- [x] Application cancellation by model

### Recently Implemented
- [x] **Job cancellation/withdrawal** - COMPLETED 2026-02-20
  - New component: `src/layouts/jobs/job-details/components/JobActionsSection/index.js`
  - Client can close job to stop receiving applications
  - Client can reopen closed jobs
  - Closed jobs excluded from search results

- [x] **Cancel awarded booking** - COMPLETED 2026-02-20
  - Part of JobActionsSection component
  - Client can un-award job before payment
  - Model receives notification of cancellation
  - Job automatically reopens for new applications

- [x] **Invitation rejection by models** - COMPLETED 2026-02-20
  - Models can decline invitations they don't want
  - Decline status tracked in database
  - Models can still apply after declining if they change their mind

### Missing - Enhancement
- [ ] Bulk model invitations
- [ ] Modify agreed amount after award (before payment)
- [ ] In-job shortlisting/comparison view

---

## 3. Integrated Payments

**Press Claim:** *"Seamless, transparent transactions delivered directly to models"*

### Implemented
- [x] Stripe integration for client payments
- [x] PaymentIntent with manual capture (hold funds)
- [x] Stripe Connect Express accounts for models
- [x] Model onboarding flow
- [x] Account status verification
- [x] Withdrawal/payout system
- [x] Withdrawal fee calculation (1.5%)
- [x] Platform fee deduction (5%)
- [x] Transaction history (client view)
- [x] Transaction history (model view)
- [x] Withdrawal history
- [x] Balance tracking (available vs pending)
- [x] Saved payment methods
- [x] Job completion fund release

### Missing - Enhancement
- [ ] Apple Pay / Google Pay support
- [ ] Bank transfer payments
- [ ] Automatic scheduled payouts (currently manual withdrawal only)
- [ ] Recurring/subscription payments for jobs

---

## 4. User Access Controls

**Press Claim:** *"Tiered user access level agreements ensure appropriate permissions across teams and departments"*

### Implemented
- [x] 5 user roles (model, client, account manager, admin, super admin)
- [x] Route-based access control (`src/routes.js`)
- [x] Firestore security rules (`firestore.rules`)
- [x] Organisation collection exists
- [x] Users assigned to organisations
- [x] Admin can manage organisation users
- [x] User verification system

### Recently Implemented
- [x] **Tiered access levels within organisations** - COMPLETED 2026-02-20
  - Three organisation roles: owner, admin, member
  - Each role has configurable permissions
  - Permission checking functions in `src/utils/organisations.js`

- [x] **Teams and departments** - COMPLETED 2026-02-20
  - Teams subcollection: `organisations/{orgId}/teams/{teamId}`
  - Team CRUD: create, list, view, update, delete
  - Assign users to teams
  - UI pages: `src/layouts/organisation/teams/` and `src/layouts/organisation/members/`
  - Firestore rules for team-based access

### Missing - Critical
- [ ] **Account manager self-service UI** - Partially implemented
  - Teams and Members UI created
  - Missing: Organisation settings/profile page
  - Missing: Member invitation flow
  - Priority: **HIGH**

### Missing - Enhancement
- [ ] Custom permission sets per user
- [ ] Department-based job visibility
- [ ] Team-based favourite list sharing

---

## 5. Internal MMS Capability

**Press Claim:** *"The platform becomes your organisation's dedicated model management system, centralising all activity"*

### Implemented
- [x] Organisation records (company name, number, address, VAT)
- [x] User count per organisation
- [x] Admin can view organisation details
- [x] Admin can manage organisation users
- [x] Favourites system (user-level)

### Missing - Critical
- [ ] **Organisation dashboard** - Only platform-wide admin dashboards exist
  - Organisations cannot see their activity summary
  - Priority: **CRITICAL** (core MMS feature)

- [x] **Jobs linked to organisations** - COMPLETED 2026-02-20
  - Jobs now capture `organisationId` and `teamId` from user at creation
  - My Jobs page has "Organisation" filter to view all org jobs
  - Migration executed: 8 of 10 jobs linked to organisations
  - Firestore rules updated for org-based access

- [ ] **Organisation-level analytics** - No org-scoped reporting
  - No spend tracking per organisation
  - No booking metrics per organisation
  - Priority: **HIGH**

- [ ] **Organisation-level model relationships** - Favourites are user-owned only
  - When user leaves, relationships lost
  - No institutional knowledge retention
  - Priority: **HIGH**

### Missing - Enhancement
- [ ] Organisation branding/customisation
- [ ] Organisation-wide notification settings
- [ ] Export organisation data/reports

---

## Summary by Priority

### CRITICAL (Must fix - press release accuracy at stake)
1. [x] ~~"Book Model" button functionality~~ - **COMPLETED**
2. [x] ~~Tiered access levels within organisations~~ - **COMPLETED**
3. [x] ~~Teams and departments structure~~ - **COMPLETED**
4. [ ] Organisation dashboard
5. [x] ~~Jobs linked to organisations~~ - **COMPLETED**

### HIGH (Should fix before launch)
6. [ ] Direct messaging to models
7. [x] ~~Job cancellation/withdrawal~~ - **COMPLETED**
8. [x] ~~Cancel awarded booking~~ - **COMPLETED**
9. [ ] Account manager self-service UI (partially done)
10. [ ] Organisation-level analytics
11. [ ] Organisation-level model relationships

### MEDIUM (Post-launch enhancement)
12. [ ] Bulk model invitations
13. [ ] Apple Pay / Google Pay
14. [ ] Model experience/history display
15. [ ] Model rating system
16. [ ] Custom permission sets

---

## Sign-Off

| Feature Area | Reviewed | Approved |
|--------------|----------|----------|
| Direct Model Access | [ ] | [ ] |
| Self-Service Booking | [ ] | [ ] |
| Integrated Payments | [ ] | [ ] |
| User Access Controls | [ ] | [ ] |
| Internal MMS Capability | [ ] | [ ] |

**Reviewed By:** _______________
**Date:** _______________
