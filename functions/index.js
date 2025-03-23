const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { getFollowerCount, getIgSessionIg } = require("follower-count");

admin.initializeApp();
const db = admin.firestore();

exports.updateInstagramFollowerCount = functions.https.onCall(async (data, context) => {
  const { uid, instagramUsername } = data;

  if (!uid || !instagramUsername) {
    throw new functions.https.HttpsError("invalid-argument", "Missing uid or username.");
  }

  try {
    // Get session ID using Instagram credentials from environment variables
    const sessionId = await getIgSessionIg(
      process.env.INSTAGRAM_USERNAME,
      process.env.INSTAGRAM_PASSWORD
    );

    // Fetch the Instagram follower count
    const count = await getFollowerCount({
      type: "instagram",
      username: instagramUsername,
      sessionId: sessionId,
    });

    if (typeof count !== "number") {
      throw new Error("Follower count not found.");
    }

    // Update the user's Instagram follower count in Firestore
    await db.collection("users").doc(uid).update({
      instagramFollowerCount: count,
      instagramLastChecked: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, count };
  } catch (error) {
    console.error("Error fetching Instagram follower count:", error.message);
    throw new functions.https.HttpsError("internal", error.message);
  }
});
