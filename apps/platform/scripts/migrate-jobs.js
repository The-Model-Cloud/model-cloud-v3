const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json'); // Download from Firebase Console

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrateJobs(dryRun = true) {
  console.log(`Starting migration (dryRun: ${dryRun})`);
  
  const jobsSnap = await db.collection('jobs').get();
  const stats = { total: jobsSnap.size, updated: 0, skipped: 0 };
  
  for (const jobDoc of jobsSnap.docs) {
    const job = jobDoc.data();
    
    if (job.organisationId) {
      stats.skipped++;
      continue;
    }
    
    if (!job.userId) continue;
    
    const userSnap = await db.collection('users').doc(job.userId).get();
    if (!userSnap.exists) continue;
    
    const user = userSnap.data();
    if (!user.organisationId) continue;
    
    if (!dryRun) {
      await jobDoc.ref.update({
        organisationId: user.organisationId,
        teamId: user.teamId || null
      });
    }
    stats.updated++;
  }
  
  console.log('Results:', stats);
}

// Run with: node scripts/migrate-jobs.js
migrateJobs(false); // Apply the migration
