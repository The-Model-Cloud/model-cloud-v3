# Organisation Migration Guide

This guide walks you through migrating your existing user data to the new organisations collection structure.

## Prerequisites

1. Node.js installed on your machine
2. Access to your Firebase project

## Step-by-Step Instructions

### 1. Install Firebase Admin SDK

The migration script requires `firebase-admin` package. Install it:

```bash
npm install firebase-admin --save-dev
```

### 2. Download Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (model-cloud-v4)
3. Click the gear icon ⚙️ next to "Project Overview"
4. Select **"Project Settings"**
5. Navigate to the **"Service Accounts"** tab
6. Click **"Generate New Private Key"**
7. Click **"Generate Key"** in the confirmation dialog
8. Save the downloaded JSON file as **`serviceAccountKey.json`** in your project root directory

**⚠️ IMPORTANT:** This file contains sensitive credentials. It's already added to `.gitignore` to prevent accidental commits.

### 3. Run the Migration Script

From your project root, run:

```bash
node scripts/migrate-organisations.js
```

### 4. What the Script Does

The migration script will:

1. ✅ Find all users with "client" or "account manager" roles
2. ✅ Group them by company name
3. ✅ Create organisation documents in the `organisations` collection
4. ✅ Update each user with `organisationId` field
5. ✅ Set accurate `userCount` for each organisation
6. ✅ Preserve existing organisation data (companyNumber, vatNumber, etc.)

### 5. Expected Output

You should see console output like:

```
Starting organisation migration...
Found 45 users to process
Created organisation: Acme Corp (abc123def456)
Updated user xyz789 with organisationId: abc123def456
...
=== Migration Complete ===
Organisations created: 12
Users updated: 45
```

### 6. Verify the Migration

After running the migration:

1. Go to your Firebase Console → Firestore Database
2. Verify the `organisations` collection exists with your organisations
3. Check a few user documents to ensure they have `organisationId` field
4. Test the application:
   - Visit `/admin/organisations` to see all organisations
   - Click on an organisation to view its details
   - Create a new user and ensure it links to an organisation correctly

### 7. Cleanup (Optional)

After successful migration and verification:

1. You can remove `serviceAccountKey.json` from your local machine
2. Optionally remove old fields from user documents:
   - `companyNumber`
   - `yearEstablished`
   - `registeredAddress`
   - `vatNumber`

   (These are now stored in the `organisations` collection)

## Troubleshooting

### Error: "Cannot find module './serviceAccountKey.json'"

Make sure you've downloaded the service account key and placed it in the project root directory.

### Error: "Permission denied"

Your service account needs Firestore read/write permissions. Generate a new key with proper permissions.

### Some users weren't migrated

Users without a `companyName` or `company` field will be skipped. Check the console output for details.

## Rollback Plan

If something goes wrong:

1. The script doesn't delete any existing data
2. User documents are only updated (not replaced)
3. You can manually delete the `organisations` collection from Firestore Console
4. Remove `organisationId` from user documents if needed

## Need Help?

If you encounter any issues, check:
- Firebase Console for error messages
- Firestore security rules (they should allow admin access)
- The migration script console output for specific errors
