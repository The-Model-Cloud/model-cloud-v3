/**
 * Copies CHANGELOG.md into Firestore (changelog/current) so the super-admin "Changelog" page can show it.
 *
 * The text is kept in Firestore, not bundled into the platform's JavaScript, because the changelog describes
 * security fixes and the bundle can be read by anyone. The rules let only a super admin read changelog/current.
 *
 * Runs automatically as part of `npm run deploy:platform`, or on its own with `npm run sync:changelog`.
 * `--dry-run` reads and checks the file but writes nothing.
 *
 * Needs serviceAccountKey.json in the project root (gitignored) or GOOGLE_APPLICATION_CREDENTIALS. A failure here
 * only prints a warning, so it never stops a deploy.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const dryRun = process.argv.includes("--dry-run");

const main = async () => {
  const changelogPath = path.join(root, "CHANGELOG.md");
  const content = fs.readFileSync(changelogPath, "utf8").replace(/\r\n/g, "\n");
  const releases = (content.match(/^## /gm) || []).length;
  const bytes = Buffer.byteLength(content, "utf8");

  // A Firestore document holds at most 1 MiB
  if (bytes > 900 * 1024) {
    throw new Error(`CHANGELOG.md is ${bytes} bytes, too large for one Firestore document`);
  }

  if (dryRun) {
    console.log(`Changelog dry run: ${releases} sections, ${bytes} bytes. Nothing written.`);
    return;
  }

  // firebase-admin is installed with the Cloud Functions
  const admin = require(path.join(root, "functions", "node_modules", "firebase-admin"));
  const keyPath = path.join(root, "serviceAccountKey.json");
  admin.initializeApp(
    fs.existsSync(keyPath)
      ? { credential: admin.credential.cert(require(keyPath)) }
      : { credential: admin.credential.applicationDefault(), projectId: "model-cloud" }
  );

  await admin.firestore().collection("changelog").doc("current").set({
    content,
    bytes,
    source: "CHANGELOG.md",
    syncedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log(`Changelog synced to Firestore: ${releases} sections, ${bytes} bytes.`);
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.warn(`Warning: changelog was not synced (${error.message}). The deploy continues.`);
    process.exit(0);
  });
