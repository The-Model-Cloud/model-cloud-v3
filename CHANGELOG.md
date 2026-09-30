# Change Log

All notable changes to The Model Cloud are documented in this file. Dates are taken from the git history.

The platform version string is generated at deploy time in `apps/platform/src/version.js` (format `vYY.MM.DD.HHmm`).

## [Unreleased]

Work in progress in the working copy, not yet committed.

### Security

- New clients and models are locked to the Dashboard and Edit Profile pages until an admin verifies them
- Fixed the `verifyEmail` bug in the auth-action handler

### Added

- Job details: "Favourite Models" card listing the client's favourited models with match scores and an Invite to Apply button (hidden when the client has no favourites)
- Job details: "Models From Your Lists" card showing models from the client's personal, organisation and team Model Lists, each with an Invite to Apply button
- Model profile: "Invite to Job" button, shown to clients who have at least one live job
- Shared live-jobs helper (`utils/liveJobs.js`)
- Auth action page for Firebase email actions (verify email, reset password)
- Reset Password illustration layout
- Session manager (`utils/sessionManager.js`)
- Admin: Logged-in Users page
- Admin: Notify Models page
- Website: hero models hook (`useHeroModels`) and `sitemap.xml`

### Changed

- Book Model / Invite modal now only lists live jobs, so jobs already awarded to a model are no longer offered
- Updates to Sidenav, user collapse menu and dashboard navbar
- Updates to the sign-in and sign-up illustration layouts
- Updates to delete user and delete model hooks, admin user lists, model list and job details
- Updates to `.htaccess`, `robots.txt` and FTP deploy scripts for both apps
- Updated Firestore rules, `firebase.json` and Cloud Functions
- Website header, footer, hero and CTA updates, and site content types

## [2026-03-27] Ready to Release

### Fixed

- Account managers unable to view their jobs (2026-02-25)

### Changed

- The version number is now updated on deploy rather than on git commit (2026-02-24)

## [2026-02-24] Website CMS and Content

### Added

- Cookie consent notice
- FAQ, Policy and Terms pages
- Font Awesome on the website

### Changed

- Homepage, pricing page and all other website pages are now editable in the CMS
- Messaging updates
- Testimonials fix

## [2026-02-23] Cloudinary and Sign-up Workflow

### Added

- Cloudinary image support

### Fixed

- Team cards and sign-up / sign-in URLs
- Sign-up workflow issues found in testing

### Changed

- Website content updates

## [2026-02-22] Monorepo and CMS

### Changed

- Platform and website moved into a single monorepo for easier maintenance
- CMS functions moved into the platform, available to Super Admins only
- Deployment scripts updated and a deployment error fixed
- README updated

### Added

- Phase 1 verification checklist (`documentation/phase-1-verification-checklist.md`)

## [2026-02-21] Organisation Management and Imports

### Added

- Phase 1.5 organisation model relationships (favourites)
- Import Clients and Delete Clients
- Merge Organisation
- Delete All Organisations

### Fixed

- Bug on organisation lists
- Table headings

### Changed

- Tidied up the menu
- Improved avatar sizing

## [2026-02-20] Organisations, Jobs and Payments

### Added

- Organisation functionality for the Agency tier (Phase 1.2)
- Organisation Dashboard (Phase 1.3) and Platform Dashboard (Phase 1.3.1)
- Job to organisation linking (Phase 1.4)
- Organisation creation for Admin and Super Admin
- Stripe Connect integration and Book Model fixes
- Cloudinary headshot on the sign-up page, and Cloudinary on the sign-in page
- Image slideshow and preloading on the sign-in and sign-up pages

### Fixed

- Slideshow issues

## [2026-02-19] Stripe Job Payments

### Added

- Started Stripe integration for job payments

### Changed

- Footer updated

## [2026-02-04] Appearance Defaults

### Changed

- Adjusted the appearance defaults
- Updated `organisations.js`

## [3.2.3] 2026-02-03

### Released

- Version 3.2.3 released to the dev environment

## [2026-01-27] Fixes and Versioning

### Changed

- Latest changes and version number update
- Updated `.gitignore`

## [2026-01-25] Fixes and Updates

### Fixed

- Numerous fixes (2026-01-25 to 2026-01-26)

## [2026-01-22] Sign-in and Profile

### Added

- Profile avatar and name in the Sidenav
- Saved login ("remember me")

### Changed

- The sign-in page is now the redirect target after logging out
- Profile updates

## [2025-09-12] Interim Updates

### Changed

- Latest changes

## [2025-04] Job Applications

### Added

- Job applying (2025-04-15)
- Model headshot and company name on the sign-up page (2025-04-11)

## [2025-03] Foundation

### Added

- Initial commit and `.gitignore` (2025-03-22)
- Sign-in and sign-up pages using Firebase
- User account editing, profile settings and My Profile
- Model Cloud branding
- Logged-in user profile
- Post New Job layout, Post Job, My Jobs and Job Details pages
- Job matching algorithm (started)
- Job search
- Deployment script
