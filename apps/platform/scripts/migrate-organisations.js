/**
 * Migration script to move from user-based organisations to organisations collection
 *
 * Run this script once to migrate existing data:
 * node scripts/migrate-organisations.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
// Make sure you have your service account key JSON file
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrateToOrganisations() {
  console.log('Starting organisation migration...');

  try {
    // Fetch all users with client or account manager roles
    const usersSnapshot = await db.collection('users')
      .where('role', 'in', ['client', 'account manager'])
      .get();

    console.log(`Found ${usersSnapshot.size} users to process`);

    const orgMap = new Map(); // Map company name (lowercase) to org ID
    let orgsCreated = 0;
    let usersUpdated = 0;

    // Group users by company name and create organisations
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const companyName = (userData.companyName || userData.company || '').trim();

      if (!companyName) {
        console.log(`Skipping user ${userDoc.id} - no company name`);
        continue;
      }

      const companyKey = companyName.toLowerCase();

      // Create organisation if it doesn't exist
      if (!orgMap.has(companyKey)) {
        const orgRef = db.collection('organisations').doc();

        await orgRef.set({
          companyName: companyName,
          companyNumber: userData.companyNumber || '',
          yearEstablished: userData.yearEstablished || '',
          registeredAddress: userData.registeredAddress || '',
          vatNumber: userData.vatNumber || '',
          userCount: 0,
          createdAt: admin.firestore.Timestamp.now(),
          createdBy: 'migration'
        });

        orgMap.set(companyKey, orgRef.id);
        orgsCreated++;
        console.log(`Created organisation: ${companyName} (${orgRef.id})`);
      }

      // Update user with organisationId
      const orgId = orgMap.get(companyKey);
      await userDoc.ref.update({
        organisationId: orgId,
        companyName: companyName,
        company: companyName // For backwards compatibility
      });

      usersUpdated++;
      console.log(`Updated user ${userDoc.id} with organisationId: ${orgId}`);
    }

    // Update user counts for all organisations
    console.log('\nUpdating organisation user counts...');
    for (const [companyKey, orgId] of orgMap.entries()) {
      const orgUsersSnapshot = await db.collection('users')
        .where('organisationId', '==', orgId)
        .get();

      await db.collection('organisations').doc(orgId).update({
        userCount: orgUsersSnapshot.size
      });

      console.log(`Organisation ${orgId}: ${orgUsersSnapshot.size} users`);
    }

    console.log('\n=== Migration Complete ===');
    console.log(`Organisations created: ${orgsCreated}`);
    console.log(`Users updated: ${usersUpdated}`);

  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the migration
migrateToOrganisations();
