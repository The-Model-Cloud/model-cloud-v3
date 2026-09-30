import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "config/firebase";

/**
 * A job is "live" (can still receive invitations) when it is not completed,
 * not cancelled and has not been awarded to a model.
 * @param {object} job - Job data
 * @returns {boolean}
 */
export const isLiveJob = (job) => {
  const status = (job?.status || "open").toLowerCase();
  return status !== "completed" && status !== "cancelled" && !job?.awardedTo;
};

/**
 * Fetch a user's live jobs (newest first), looked up via the job references
 * stored on their user document.
 * @param {string} userId - The client's UID
 * @returns {Promise<array>} - Array of job objects including their Firestore id
 */
export const fetchLiveJobs = async (userId) => {
  if (!userId) return [];

  const userSnap = await getDoc(doc(db, "users", userId));
  if (!userSnap.exists()) return [];

  const jobRefs = userSnap.data().jobs || [];
  if (jobRefs.length === 0) return [];

  // Firestore "in" queries are limited to 30 values
  const batchSize = 30;
  const liveJobs = [];
  for (let i = 0; i < jobRefs.length; i += batchSize) {
    const batch = jobRefs.slice(i, i + batchSize);
    const jobDocs = await getDocs(query(collection(db, "jobs"), where("reference", "in", batch)));
    jobDocs.forEach((docSnap) => {
      const job = { id: docSnap.id, ...docSnap.data() };
      if (isLiveJob(job)) liveJobs.push(job);
    });
  }

  liveJobs.sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
    const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
    return dateB - dateA;
  });

  return liveJobs;
};
