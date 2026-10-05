# Change Log

All notable changes to The Model Cloud are documented in this file. Dates are taken from the git history.

The platform version string is generated at deploy time in `apps/platform/src/version.js` (format `vYY.MM.DD.HHmm`).

## [Unreleased]

Work in progress in the working copy, not yet committed.

### Security

- Pages could be opened without signing in. The platform's login guard (`RequireAuth`) was only applied in the unused right-to-left layout, so in the live layout `/jobs/:reference`, `/dashboard`, `/edit-profile`, `/messages/:threadId` and the `/:slug` profile page rendered for a signed-out visitor, and a job link from an email showed a blank, wrong page. There is now one gate in `App.js`: anyone who is not signed in (according to Firebase, so an expired session counts) is sent to the sign-in page, and after signing in goes back to the page they asked for, with its query string (for example the job in an email link). Only these stay open without a login: sign-in, sign-up, reset password, the Firebase email action page, terms, email preferences (an unsubscribe link cannot need a login) and the `/shared/...` and `/zcard/view/...` links that a user chose to share outside the platform (the list's or Z-Card's own visibility setting still decides who can see it). The sign-in page now only follows a `redirect` that is a path inside the app, never another site
- Firestore rules: users could write their own `role` and `verified`, so any signed-in user could make themselves a super admin (every admin rule and admin callable trusts `role`) or skip admin verification. A user can no longer change `role`, `verified`, `organisationId`, `organisationRole`, `teamId`, `balance`, `stripeAccountId`, `stripeAccountStatus` or `stripePayoutsEnabled` on their own document, and a new account can only be created as a `model` or `client`, unverified, with none of those fields. Only a super admin can grant, change or remove the super admin role (an admin can no longer promote themselves). Admins can still verify users and change other roles as before
- Firestore rules: clients can no longer write `membershipBilling`, `accountStatus`, `pausedAt` or `pausedCancelledSubscription` on their own user document, so nobody can unpause themselves, restart their invoice cycle or skip a pause. A paused account cannot create jobs or reopen closed ones
- Firestore rules: browsers can no longer write `subscription`, `agency`, `managedBy` or `stripeCustomerId` on a user, or create an account that starts on a paid tier. Previously any signed-in user could give themselves any tier. Organisation account managers can no longer change an organisation's `tier` or `noCharge`
- Google detected an exposed Firebase Admin SDK service account key committed to the repository. The key was deleted in Google Cloud, `functions/service-account.json` was removed from git history (history rewritten and force-pushed), and service account key files are now gitignored
- New clients and models are locked to the Dashboard and Edit Profile pages until an admin verifies them
- Fixed the `verifyEmail` bug in the auth-action handler

### Added

- Super-admin "Changelog" page (Tools > Changelog, `/admin/changelog`) that shows this file: one collapsible section per release (the newest two open), colour-coded Security / Added / Fixed / Changed labels, change counts, a search box that filters the changes, and Expand all / Collapse all. The text is stored in Firestore (`changelog/current`), not in the platform's JavaScript (the changelog describes security fixes and the bundle is readable by anyone); the rules let only a super admin read it and nobody write it from a browser. `scripts/sync-changelog.js` copies `CHANGELOG.md` there: it runs automatically as part of `npm run deploy:platform`, or on its own with `npm run sync:changelog` (`--dry-run` checks the file without writing). A failed sync only prints a warning and never stops a deploy
- Admin "Notify Models of Matching Jobs": choose who is emailed: Models only (the default), Clients only (each job's client gets the summary of matching models), Models and clients, or "Send a test to me". A test sends one copy of each email to the signed-in super admin, marked `[TEST]`, for the first selected job only, ignoring the real recipients' notification settings (a bounced or spam-reporting address of yours is still respected). Before this, every send also emailed each job's client. The confirmation and result messages say what was sent to whom. `sendJobMatchEmailsManual` takes a new `audience` field (`models`, `clients`, `both`, `test`; default `both`, so the job page's existing send is unchanged)
- Client "Account & Billing" page (the former Payments & Invoices page, same menu item): a Your membership card (plan, price, status, when it ends or renews, any voucher), Upcoming payments (next membership charge from Stripe, plus booked jobs waiting for payment), and Your data & account controls. Paying clients can turn membership billing off (they keep the plan until the period they paid for ends) and back on. Clients on a no-charge or free plan see that they are not being billed and when free time ends
- Membership invoices every 30 days for every client, including £0.00 invoices for free and no-charge accounts (a no-charge invoice shows the plan's value and the matching discount, naming the voucher). Paying clients' invoices are created from Stripe's subscription invoices, including £0 ones from a 100% voucher coupon. Same numbering and PDF as job invoices; they appear in the Invoices list for download. A new client gets their first invoice at sign-up, and existing clients get theirs the first time they open the page (or via the super-admin `adminStartMembershipInvoicing` backfill). Daily `issueMembershipInvoices` job at 03:30
- Pause my account (reversible): billing stops at the end of the paid period, open jobs are closed and reopened on reactivation (jobs the client closed themselves stay closed), marketing email stops, and posting jobs is blocked until they reactivate. Refused while a booking is in progress. A banner on every page offers one-click reactivation
- Download my data: one JSON file with the client's profile, jobs, invoices, payments, membership history, notifications and message threads
- Voucher applied email: when an admin applies a voucher, the client is emailed the tier they now have and the date it is free until. A failed email never undoes the voucher, and the admin's confirmation says whether the client was emailed
- Vouchers and no-charge access: admins create vouchers (a tier plus either "free until a date" or "N days free", with optional use limits, code expiry, email lock and campaign) and apply them to clients. A client who is not paying gets the tier at no charge with no Stripe subscription; a paying client gets a 100% Stripe coupon covering the next invoices, so billing stays in place. Applying a voucher always extends existing free time and never shortens it. New Admin page "Vouchers & Billing": a Clients list showing who is paying, who has a voucher and when it ends, a Vouchers tab with redemption history, and an Organisations tab for organisation-wide no-charge. Whole organisations can also be put on no-charge, and all no-charge end dates can be extended in bulk. A daily job emails and notifies clients 30 days before no-charge access ends, then moves them to Free. Applying is admin-only for now; `redeemVoucherCore` in `functions/complimentary.js` is the single place to call if clients are ever allowed to redeem their own
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

### Fixed

- A job's date was only saved if the poster changed the date pickers: the Post Job form showed today's date in the day, month and year pickers but did not save it, so many jobs had no date (nothing on the job cards, the job page, the Notify Models page or the match emails). The form now starts with today's date saved, and the three pickers cannot be cleared, so every new job has a date. The month default also uses the picker's own English month names, because the browser-language month it used before would not match the list on a non-English browser. Jobs already posted without a date are not changed (the intended date is unknown)
- Admin "Notify Models of Matching Jobs": the Location and Date columns were always empty, and searching by location found nothing. The page read `job.location` and `job.dateFrom`, which the Post Job form never saves. A job stores its place as `city`, `county`, `state` and `country` and its date as `dayDate`, `monthDate` and `yearDate`. The page now shows those (new `utils/jobFormat.js`, the same format as the job cards), and the location search covers them
- The job-match emails (to models, automatic and manual) had the same problem: the Location, Date and Rate lines never appeared because they read `location`, `dateFrom` and `rate`. They now show the job's real location, date and rate (`budget`, `currency` and `rateType`, for example "£500 / day"), and the values are escaped
- Admin "Notify Models of Matching Jobs" (and the manual job-match send on the job page) failed for every job: `sendJobMatchEmailsManual` was deployed to `europe-west1` but the platform calls `us-central1`. It now deploys to `us-central1` like the other callables. The old `europe-west1` copy must be deleted by hand (`firebase functions:delete sendJobMatchEmailsManual --region europe-west1`)
- Website checkout could not work: the website's Cloud Functions client targeted `europe-west2`, but every subscription, seat and sign-up callable is deployed to `us-central1`, so every call failed (not found / CORS). It now targets `us-central1`, the same as the platform. `getHeroModels` is fetched by URL and is unaffected
- Security: `applications` and `invitations` under each job were readable, writable and deletable by any signed-in user (and held model email addresses). Rules now allow: a model to read, create, re-apply and cancel only their own application, and to answer only their own invitation (status, applied/declined time and reason); the job's owner, an account manager of its organisation or an admin to manage both; members of the job's organisation to read them; nobody else. A model can apply only to an open job, and cannot move an application a client has accepted or rejected back to pending
- Security: the application emails could be used to send branded email to any address, and `sendModelApplicationConfirmation` did not even require sign-in. `sendApplicationEmail` and `sendModelApplicationConfirmation` now take only a `jobId`, check the caller has applied to that job, and work out the recipient (the client, or the caller's own address) and all details from the database. They send through the shared consent-aware sender and escape the model's and job's text. The client's email now links to the job
- Security: `sendShareListEmail` and `sendZCardEmail` (which must send to an address the user types) are now limited to 20 per user per hour, only accept a valid email address, only accept a share link on our own platform (so they cannot carry a link to another site), skip addresses that bounced or reported spam, take the sender's name from their account instead of the browser, and escape everything the user typed. The share dialogs now show the server's reason when a send is refused
- Security: `updateInstagramFollowerCount` had no sign-in check, so anyone could overwrite any user's follower count and trigger scraping. Only the account's owner, or an admin editing it, can now refresh it
- Security: `updateMailchimpSubscription` let any signed-in user subscribe or unsubscribe any email address. The email must now be the caller's own (an admin can still change anyone's)
- The model who was awarded a job could not open the job page, so they could not mark it complete. The job page looked jobs up with `status == "open"` for everyone except admins (and clients), so once a job was awarded, in progress or completed, the notification link, the email link and My Jobs all said "job not found". Applicants also lost the page when the job closed. Everyone now looks the job up by reference whatever its status (any signed-in user may already read a job)
- Invited models never saw the job in My Jobs as "Invited": the browser wrote `invitedJobs` onto the model's user document, which the rules do not allow, and the error was swallowed. A new Cloud Function trigger (`onInvitationCreated`, on `jobs/{id}/invitations/{modelId}`) now adds the job to the model's `invitedJobs` when the invitation is created, with the job title, reference and the client's company or name. It does not add the same job twice. Invitations sent before this was deployed are not added retroactively
- Account verification emails: the "Your account has been verified" and "Account update required" emails linked to `themodel.cloud/dashboard` and `/edit-profile`, which do not exist on the static website (404). They now link to the platform (`APP_URL`). The same wrong host was fixed in the new-user admin notification, the welcome email's login link, the new-message email and the password-reset email, and the model links in the client's matching-models email
- Clients were never emailed when an admin verified them. The admin Clients page now sends the approval email (and the "update required" email when unverifying), with wording for clients (post jobs, browse and message models, payments) instead of the model wording
- Security: `sendVerificationEmail` and `sendUnverificationEmail` only checked that the caller was signed in, so any user could send a branded "your account has been verified" email to any address through our SendGrid account. They are now admin-only and take a user id (`userId`), sending to that user's own address through the shared consent-aware sender (category `account-verified` / `account-update-required`). `sendWelcomeEmail`, which carries a plain-text password to an address the caller supplies, is now admin-only too
- Website sign-ups (model and client) never received the email-verification email and were not given a `publicSlug`, so their public profile link did not work. `signUp` and `signUpClient` in `apps/website/src/lib/firebase/auth.ts` now set the display name, send the verification email and generate the slug (`first.l`, then `first.l1`...) the same way the platform sign-up does. A failure to send the email or check the slug no longer blocks the account being created (the slug falls back to the user id)
- Website sign-up (model and client) sent new users to `app.themodel.cloud/onboarding`, a route the platform does not have, so they landed on a blank "profile not found" page, signed out (the website and platform are separate origins). They now go to the platform sign-in page, which sends them on to Edit Profile. The client sign-up success page's "Complete Your Profile" button does the same (`PLATFORM_URLS.completeProfile` in `apps/website/src/lib/urls.ts`)
- Models were never emailed about matching jobs: the job-created trigger (`onJobCreated`) and the manual `sendJobMatchEmailsManual` looked for models with `isVerified == true`, but admin verification writes `verified: true`, so no models were ever found (and clients never got their matching-models summary). Both now query `verified`
- A subscription invoice that reached us before the subscription was linked to the client was ignored. The webhook now also finds the client by Stripe customer id
- `?tab=delete-account` on the settings page opened the wrong tab for clients

### Changed

- Emails that link to a job now tell the reader to log in: the job-match and invitation emails to models say "Log In to View Job & Apply" with a note that they will be asked to log in first, and the matching-models email to clients says "Log In to View All Matching Models" with the same note. (The link itself already sends a signed-out visitor to sign-in and then on to the job.)
- Job match emails (to models and the matching-models summary to clients, both automatic and the manual super-admin send) and job invitation emails now go through the shared consent-aware sender (`sendToUser`). They respect the system email toggle, skip addresses that bounced or reported spam, carry the user id in SendGrid so the webhook can flag bounces and spam reports, and appear in Email Delivery under the `job-match`, `model-match` and `job-invitation` categories. They are service emails: no unsubscribe link, but every one carries a Manage email preferences link
- `sendJobInvitationEmail` now takes the model's user id (`modelId`) and looks up their address itself instead of accepting any `to` address from the browser
- Voucher and no-charge end dates have no upper limit (31 Dec 2030 and beyond are accepted). Dates in the past are still refused
- The Premium subscription tier is now shown as "Professional" to clients (website plan card, emails), matching the pricing page. The tier id `premium` and the Stripe price are unchanged
- Settings tabs (`/edit-profile?tab=...`) now find the tab by name for the user's role, so `?tab=delete-account` and `?tab=notifications` work for clients (clients have fewer tabs than models)
- Website: the fallback platform URL is now `https://app.themodel.cloud` (it was `v4.themodel.cloud`), in `lib/urls.ts` and the sign-up, account and subscription success pages
- Account deletion now lists invoices as retained records (kept for tax purposes) alongside jobs, transactions and withdrawals
- Book Model / Invite modal now only lists live jobs, so jobs already awarded to a model are no longer offered
- Updates to Sidenav, user collapse menu and dashboard navbar
- Updates to the sign-in and sign-up illustration layouts
- Updates to delete user and delete model hooks, admin user lists, model list and job details
- Updates to `.htaccess`, `robots.txt` and FTP deploy scripts for both apps
- Updated Firestore rules, `firebase.json` and Cloud Functions
- Website header, footer, hero and CTA updates, and site content types

## [2026-10-01] Email Platform and Job Payments

### Security

- Firestore rules: browsers can no longer write a job's `payment`, `completion` or `awardedTo` fields, create a job that is already awarded or paid, change a job's status other than open/closed, or delete a job once a payment exists. These are now written only by Cloud Functions. Previously a client could mark their own job as paid
- Saved cards: deleting or setting a default payment method now checks the card belongs to the caller
- Award validation: agreed amount must be between 5 and 100,000, GBP only, and the job must be open
- The Stripe webhook now accepts several signing secrets (comma separated in `STRIPE_WEBHOOK_SECRET`), because two endpoints point at the same function and each has its own secret
- Payment status is now confirmed against Stripe on the server (webhook and browser confirm share one idempotent path) instead of trusting the browser

### Added

- Email platform: marketing consent model (`marketingConsent`: unconfirmed, opted_in, not_opted_in, opted_out) with a suppression list, signed unsubscribe links and a shared send helper that enforces consent, suppression and the system email toggle (`functions/email/`)
- Public `/email-preferences` page: Continue Opt-In and unsubscribe, changed only by an explicit button click so email link scanners cannot opt anyone in or out
- One-click unsubscribe endpoint and `List-Unsubscribe` headers on marketing email
- Marketing opt-in checkbox (unticked by default) on the platform sign-up form and both website sign-up forms
- Dashboard settings: marketing toggles are now soft opt-outs per category, plus "Unsubscribe from all emails" and "Subscribe to all emails" buttons
- Admin (super admin): Email Migration page with a consent backfill (accounts created before 1 March 2026 are marked as legacy) and the one-off "Continue Opt-In" migration email, sent by audience (models, clients, everyone) in batches
- Admin (super admin): Email Consent page showing opted in, opted out, awaiting confirmation and not opted in, with filters, links to each user's profile and CSV export
- Admin: Email Campaigns (admin and super admin): rich-text campaign editor with merge fields, preview, test send, audience and category selection, send now or schedule, and a scheduled sender that works through batches without duplicates
- Campaign tracking: UTM parameters and a signed recipient token on links to our own sites, site visits recorded against the campaign, and a SendGrid event webhook (signature verified) recording delivery, opens, clicks, bounces and spam reports
- Admin: Email Delivery page showing live SendGrid totals, a daily chart, per-email activity, bounce, block, spam and unsubscribe lists, and a "Sync to platform" action that copies them into the platform suppression list
- Bounced email addresses: users are flagged when an address bounces and shown a banner asking them to update it. Changing it uses Firebase verify-before-update-email (the login only changes once the link in the new address is clicked), with a server-side check of the new address (syntax, mail server, common typos, previous bounces). The Email Consent page has a Bounced badge, filter and CSV columns
- Server-side self-service account deletion (`deleteMyAccount`) replacing the browser-side delete, with password re-entry, Stripe subscription cancellation, data cleanup, Mailchimp removal and a hashed suppression entry
- Job payments: the client is charged in full when they pay, funds are held in the platform's Stripe balance, and the model's share is transferred on completion. If the model has no bank account yet, the funds stay held and are sent automatically once they link one, with a daily retry for failed transfers
- Job payments: failed payments can be retried, 3D Secure is handled for saved cards, and a bank redirect (Pay by Bank) is completed on return
- Job payments: refund and dispute handling in the webhook (`charge.refunded`, `charge.dispute.created`, `charge.dispute.closed`). Disputes notify super admins and are logged in Admin Logs
- Server-side Cancel Booking (`cancelJobBooking`) for jobs not yet paid. A paid booking must be cancelled and refunded by an admin
- Invoices: one is issued automatically for each paid job with a sequential number (`INV-YYYY-NNNNNN`), a snapshot of the client's billing details and amounts, a PDF download and a link to the Stripe card receipt. Refunds are reflected on the invoice
- Payments & Invoices page: summary cards (Require Payment, Paid, Pending), a list of the client's jobs with Pending / Require Payment / Paid status and a Pay now button, real invoices, and an editable Billing Details panel (company, address, VAT number)

### Changed

- Account menu: Documents is hidden for everyone and Security is hidden for models (placeholder pages, to be restored later)
- Transactions list: a held payment now shows its amount instead of "Pending"
- Email Consent: names link to the user's profile (model settings for models, user settings for everyone else)
- Callable timeout for the long-running admin jobs (sync and backfill) raised to 9 minutes in the browser
- Awarding a job now stores the model's share and the platform fee so that they always add up exactly to the amount charged

### Fixed

- A spam-report suppression could be downgraded to a marketing-only unsubscribe when the user was also opted out. A stronger existing suppression is now never weakened
- Models could be paid twice for one job (destination charge plus a separate transfer), and funds were never transferred if the model had no account when the client paid
- Card holds lapsed after about 7 days, before the 14-day auto-release, so capture could fail on longer jobs
- A failed payment left the job stuck with no way to retry
- Removed the fake sample Invoices and Billing Information panels and the decorative card graphic from the Payments & Invoices page

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
