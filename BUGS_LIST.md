# Bugs List

Open bugs found in the launch-readiness review (2026-10-05), most urgent first. Found by reading the code; none were reproduced by running the app, so confirm each one when you fix it.

**Working rule:** when a bug is fixed, remove it from this file and add it to `CHANGELOG.md` in the same change.

Line numbers are approximate and will drift as the code changes. Search for the function or field named.

## Launch blockers

### 1. Every signed-in user can read every user's full profile
- **Where:** `firestore.rules`, `match /users/{userId}`, `allow read: if isAuthenticated()`
- **Breaks:** any account can read, and list, every user document: email, phone, address, `stripeCustomerId` and billing details.
- **Fix:** split the public profile fields (name, avatar, slug, categories, photos) from private fields, either into a separate collection or behind a callable. Restrict full-document reads to the owner, admins and organisation members. Check every browser query that reads other users (model search, favourites, messaging, public profile, organisations) before tightening.

### 2. Website checkout calls the wrong Cloud Functions region
- **Where:** `apps/website/src/lib/firebase/config.ts:22` uses `getFunctions(app, "europe-west2")`. The subscription callables have no region option and there is no `setGlobalOptions`, so they deploy to us-central1.
- **Breaks:** every call in `apps/website/src/lib/firebase/functions.ts` fails (not-found or CORS): `createSubscriptionCheckoutSession`, `createCustomerPortalSession`, `upgradeSubscription`, `purchaseAdditionalSeats`, `getSubscriptionStatus`, `initializeFreeTier` and the seat callables. Paid sign-up cannot work.
- **Fix:** change the website to `"us-central1"`, or add `region: "europe-west2"` to those callables and redeploy. Do not mix the two. `getHeroModels` is correctly in europe-west2.

### 3. Stripe is still in test mode
- **Where:** `functions/.env` holds `sk_test_` for `STRIPE_SECRET_KEY`, test price ids and the test webhook secret.
- **Fix before launch:** use the live secret key, live price ids (starter, premium, agency, seats) and live webhook signing secrets. Live mode needs two webhook endpoints: an account endpoint (subscription, invoice, `payment_intent`, `charge` events) and a Connect endpoint (`account.updated`, `payout.*`). Both secrets can go comma-separated in `STRIPE_WEBHOOK_SECRET` (supported at `functions/index.js` near the webhook handler).
- **Watch:** the code pins the Stripe API to `2023-10-16`, but webhook payloads follow the endpoint's own API version. Create the live endpoints with `2023-10-16`, or `current_period_end` and `invoice.subscription` move and `Timestamp.fromMillis(NaN)` throws in `handleSubscriptionCreated` and `handleSubscriptionUpdated`.

### 4. The awarded model cannot open the job page
- **Where:** `apps/platform/src/layouts/jobs/job-details/index.js` (~480-524). Non-admins load the job with `where("status","==","open")`; the owner fallback is skipped for models.
- **Breaks:** once `awardJobToModel` sets `status: "awarded"` (later `in_progress`, `completed`), the awarded model gets "job not found" from the notification link, the email link and My Jobs. `JobCompletionSection` (`modelMarkJobComplete`) is hidden, so they cannot complete the job. Applicants also lose the page after the job closes.
- **Fix:** for models, query `where("reference","==",ref)` without the status filter (the `jobs` read rule is `isAuthenticated()`), or fall back to the unfiltered query when the open-only query returns nothing.

### 5. Invited models never see the job in My Jobs
- **Where:** `apps/platform/src/utils/invitations.js` (~38-55) writes `invitedJobs` onto the model's `users/{uid}` document. `apps/platform/src/layouts/jobs/my-jobs/index.js` (~60-66) builds the model's list from `userData.invitedJobs`.
- **Breaks:** the rules only allow a user to update their own document (or an admin), so the write always fails and the error is swallowed. The "Invited" status and inviter name never appear. The model can only reach the job through the email or notification link.
- **Fix:** write `invitedJobs` from a Cloud Function, or have My Jobs read `collectionGroup("invitations")` filtered on `modelId` (needs a rule and an index).

## High

### 6. Job `applications` and `invitations` are open to every signed-in user
- **Where:** `firestore.rules` (~157-170).
- **Breaks:** any user can read, create, update and delete other users' applications and invitations.
- **Fix:** scope to the job owner, the applicant or invited model, and admins.

### 7. Email callables that send to any address
- **Where:** `functions/index.js`: `sendModelApplicationConfirmation` (no auth check at all), `sendApplicationEmail`, `sendZCardEmail` (takes `to`, `shareUrl`, `senderName`), `sendShareListEmail`.
- **Breaks:** anyone (the first one even without signing in) can send platform-branded email to any address through our SendGrid account, with free text and unescaped HTML. Risks spam complaints, phishing and sender reputation.
- **Fix:** require auth, derive the recipient server-side (the caller's own address, or the job owner for an applicant), escape the HTML, and send through `sendToUser` (`functions/email/send.js`). Rate-limit the share emails.

### 8. `updateInstagramFollowerCount` has no auth check
- **Where:** `functions/index.js` (~1093).
- **Breaks:** anyone can overwrite `instagramFollowerCount` on any user and trigger outbound scraping.
- **Fix:** require auth and `uid == request.auth.uid`.

### 9. `updateMailchimpSubscription` has no ownership check
- **Where:** `functions/index.js` (~7698). It takes an arbitrary `email`.
- **Breaks:** any signed-in user can subscribe or unsubscribe anyone.
- **Fix:** use `request.auth.token.email`.

### 10. A user can end up with two subscriptions
- **Where:** `functions/index.js` (~554-557) only blocks a new checkout when the status is `"active"`.
- **Breaks:** a user who is `past_due`, `trialing` or `incomplete`, or whom `checkSubscriptionExpiry` marked `"expired"` while the Stripe subscription is still alive, can start a second subscription and be charged twice.
- **Fix:** block whenever `stripeSubscriptionId` is set, after checking the live status in Stripe. Allow a new checkout only when it is `canceled` or `incomplete_expired`.

### 11. Out-of-order Stripe webhook events are lost
- **Where:** `handleSubscriptionUpdated`, `handleSubscriptionDeleted` and `handleInvoicePaymentFailed` in `functions/index.js` (~6700-6800) find the user by `subscription.stripeSubscriptionId`.
- **Breaks:** if `customer.subscription.updated` arrives before `created`, it logs "No user found" and returns. The webhook still marks the event processed and returns 200, so Stripe never retries.
- **Fix:** fall back to `subscription.metadata.firebaseUid` or `stripeCustomerId`, or throw so Stripe retries.

### 12. Double-clicking Pay can charge the client without marking the job paid
- **Where:** `createJobPaymentIntent` in `functions/payments/index.js` (~70-105) calls `paymentIntents.create` with no idempotency key.
- **Breaks:** two concurrent calls create two intents and the second overwrites `payment.paymentIntentId`. If the first is confirmed, `markJobPaid` rejects it (`core.js`: `pay.paymentIntentId !== paymentIntent.id`), so the client is charged and the job stays pending.
- **Fix:** pass `{ idempotencyKey: \`job-pi-${jobId}-${clientAmount}\` }`, or create and store the intent inside a transaction.

## Medium

### 13. A half-finished sign-up cannot be recovered
- **Where:** `apps/website/src/app/(auth)/client/sign-up/ClientSignUpContent.tsx` (~62-139); platform `sign-up/illustration/index.js` (~160-185); `sign-in/illustration/index.js` (~128-135).
- **Breaks:** the Auth account is created first. If `initializeFreeTier` or the checkout call fails (for example a missing Stripe price), the user sees "Failed to create account", and a retry hits "email already registered", so they cannot finish. The platform sign-up has the same ordering (if the slug query or `setDoc` fails, no user document is created). A later sign-in then creates a document with `role: "model"` and no `verified`, even for a client.
- **Fix:** on `auth/email-already-in-use`, sign the user in and resume. Make the sign-in fallback not guess a role.

### 14. Clients can invite unverified models
- **Where:** `apps/platform/src/layouts/jobs/job-details/components/MatchingModels/index.js` (~76) and `getMatchingModels` in `apps/platform/src/utils/matching.js`.
- **Breaks:** they query every `role == "model"` user with no `verified` check, but unverified models are locked to Dashboard and Edit Profile, so an invited model gets an email and message for a job they cannot act on.
- **Fix:** filter `m.verified === true` (and paused accounts, if that matters).

### 15. `sendJobMatchEmailsManual` is in the wrong region
- **Where:** `functions/index.js` (~1834) declares `region: "europe-west1"`; `apps/platform/src/utils/api.js` calls us-central1.
- **Breaks:** every manual super-admin job-match send fails silently (`callCloudFunction` swallows the error).
- **Fix:** remove the region option, or use a region-specific `getFunctions` instance.

### 16. Withdrawal fee is never collected, and withdrawals can race
- **Where:** `requestWithdrawal` in `functions/index.js` (~6055-6160).
- **Breaks:** it pays out `netAmount` from the model's connected account, so the 1.5% fee stays in their Stripe balance (they can withdraw it from the Express dashboard). The balance check and the later `increment(-amount)` are not in one transaction, so two concurrent requests can both pass and push the balance negative.
- **Fix:** reserve the balance in a transaction before creating the payout, and take the fee as a transfer reversal or application fee.

### 17. Voucher and no-charge data is wiped on subscribe or cancel
- **Where:** `handleSubscriptionCreated` and `handleSubscriptionDeleted` in `functions/index.js` (~6700-6800) replace the whole `subscription` map.
- **Breaks:** `subscription.complimentary` and `subscription.voucher` are lost when a no-charge client later subscribes or cancels.
- **Fix:** use dotted-path updates.

### 18. `past_due` removes the user's tier on the first failed card attempt
- **Where:** `isSubscriptionActive` in `functions/index.js` (~246) treats any status other than `active` or `trialing` as inactive, and `invoice.payment_failed` sets `past_due` straight away.
- **Fix:** decide on a grace period for `past_due` while Stripe retries.

### 19. The invitation message writes to the thread from the browser and is denied
- **Where:** `apps/platform/src/utils/invitations.js` (~119-125 and ~283-289). Thread updates may only touch `muted` and `unread` (`firestore.rules` ~315-318).
- **Breaks:** the message is delivered, but the `setDoc` throws afterwards and logs "Internal message failed". `onMessageCreated` already updates the summary server-side.
- **Fix:** delete these `setDoc` calls.

### 20. No rule for `jobs/{jobId}/activityLog`
- **Where:** `firestore.rules`; used by `apps/platform/src/utils/activityLog.js` (~40) and `JobActivityLog/index.js` (~164).
- **Breaks:** default deny, so the activity log silently fails to read or write.
- **Fix:** add a rule (job owner, organisation members, admins).

### 21. Role string mismatch in organisation admin functions
- **Where:** `migrateJobsToOrganisations` in `functions/index.js` (~6293+) checks `"superAdmin"`; the role is `"super admin"` everywhere else. Confirm the `deleteOrganisation` check (~7534) too.
- **Breaks:** super admins are rejected.

### 22. Loose rules on notifications and thread messages
- **Where:** `firestore.rules`: `users/{id}/notifications` create (any signed-in user can write into anyone's inbox); thread message create is only partly checked (~323-335).
- **Fix:** restrict both to the right users (or move notification creation into Cloud Functions).

### 23. Organisation owners cannot manage members
- **Where:** `apps/platform/src/utils/organisations.js` (`updateMemberRole`, `assignUserToTeam`, `removeUserFromOrganisation`, `addUserToOrganisation`), used by `layouts/organisation/members` and `layouts/organisation/teams`.
- **Breaks:** these write other users' documents, which the rules only allow for platform admins, so organisation owners and admins cannot change roles, assign teams or remove members.
- **Fix:** move them into Cloud Functions that check the caller's organisation role, then write the fields.

### 24. Match emails only fire when a job is created
- **Where:** `onJobCreated` in `functions/index.js`.
- **Breaks:** drafts that are later published and closed jobs that are reopened never trigger match emails.
- **Fix:** also trigger on status change to open.

## Deploy and configuration checks

- Rebuild `apps/platform/build` before any FTP deploy. The local folder holds only the holding-page build (no `index.html`, no `static/`), and `ftpDeploy` wipes the remote first.
- Check the production host for server-level Basic Auth. The repo has none, but the host may.
- Check the Firebase email-verification template action URL points at `https://app.themodel.cloud/auth/action` (the platform calls `sendEmailVerification` with no `actionCodeSettings`).
- There is no `storage.rules` and no storage target in `firebase.json`, but the platform imports the Storage SDK. Confirm whether any bucket is used; if so it is on default rules.
- `serviceAccountKey.json` exists in the repo root (gitignored, not tracked). Make sure it is never uploaded in a deploy folder.
- Pre-existing rules warning: `getUserOrganisationRole` in `firestore.rules` (~385) is unused and has an invalid function and variable name.
- Newly created Stripe live endpoints, keys and price ids need a test purchase end to end before launch.
