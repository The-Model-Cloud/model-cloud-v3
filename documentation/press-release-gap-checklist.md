# Press Release Gap Checklist

This checklist tracks the gaps between the February 2026 press release claims and the current platform implementation.

**Last Updated:** 2026-02-20
**Overall Completion:** ~65% (1 critical item completed)

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

### Missing - Critical
- [ ] **Job cancellation/withdrawal** - Client cannot close a job posting
  - No way to stop receiving applications
  - Priority: **HIGH**

- [ ] **Cancel awarded booking** - Cannot un-award a job before payment
  - No mechanism to reassign to different model
  - Priority: **HIGH**

### Missing - Enhancement
- [ ] Bulk model invitations
- [ ] Modify agreed amount after award (before payment)
- [ ] Invitation rejection by models
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

### Missing - Critical
- [ ] **Tiered access levels within organisations** - Press release claims this but doesn't exist
  - No sub-roles or permission tiers
  - All org users have identical permissions
  - Priority: **CRITICAL** (press release accuracy)

- [ ] **Teams and departments** - Press release claims this but doesn't exist
  - Zero implementation of team structure
  - No hierarchical access control
  - Priority: **CRITICAL** (press release accuracy)

- [ ] **Account manager self-service UI** - Route exists but UI is placeholder
  - File: `src/routes.js:305-306` points to `<DataTables />` placeholder
  - Account managers cannot manage their own organisation's users
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

- [ ] **Jobs linked to organisations** - Jobs only have `userId`, not `organisationId`
  - Organisations cannot query "all our jobs"
  - Cannot track bookings centrally
  - Priority: **CRITICAL** (core MMS feature)

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
2. [ ] Tiered access levels within organisations
3. [ ] Teams and departments structure
4. [ ] Organisation dashboard
5. [ ] Jobs linked to organisations

### HIGH (Should fix before launch)
6. [ ] Direct messaging to models
7. [ ] Job cancellation/withdrawal
8. [ ] Cancel awarded booking
9. [ ] Account manager self-service UI
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
