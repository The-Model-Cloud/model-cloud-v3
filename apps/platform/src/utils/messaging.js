import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Send a message to a thread
 * @param {string} threadId - The thread to send the message to
 * @param {string} senderId - The sender's UID
 * @param {Object} senderDetails - Sender info { firstName, lastName, profileAvatar }
 * @param {string} body - The message body
 * @returns {Promise<string>} The new message ID
 */
export const sendMessage = async (threadId, senderId, senderDetails, body) => {
  if (!threadId || !senderId || !body?.trim()) {
    throw new Error("Missing required fields for sending message");
  }

  const messagesRef = collection(db, "threads", threadId, "messages");

  const message = {
    senderId,
    senderName: `${senderDetails.firstName || ""} ${senderDetails.lastName || ""}`.trim() || "User",
    senderAvatar: senderDetails.profileAvatar || null,
    body: body.trim(),
    createdAt: serverTimestamp(),
    system: false
  };

  const docRef = await addDoc(messagesRef, message);
  return docRef.id;
};

/**
 * Generate deterministic thread ID for job conversations
 * @param {string} jobId - The job ID
 * @param {string} uid1 - First participant UID
 * @param {string} uid2 - Second participant UID
 * @returns {string} Deterministic thread ID
 */
export const getJobThreadId = (jobId, uid1, uid2) => {
  const sortedUids = [uid1, uid2].sort().join("_");
  return `job_${jobId}_${sortedUids}`;
};

/**
 * Format timestamp for display in message list
 * @param {Object|Date} timestamp - Firestore timestamp or Date
 * @returns {string} Formatted time string
 */
export const formatMessageTime = (timestamp) => {
  if (!timestamp) return "";

  // Convert Firestore timestamp to Date if needed
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  // Show date for older messages
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

/**
 * Format timestamp for display in thread view (more detailed)
 * @param {Object|Date} timestamp - Firestore timestamp or Date
 * @returns {string} Formatted time string with time of day
 */
export const formatDetailedTime = (timestamp) => {
  if (!timestamp) return "";

  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const timeStr = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  if (isToday) {
    return `Today at ${timeStr}`;
  }

  if (isYesterday) {
    return `Yesterday at ${timeStr}`;
  }

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined
  }) + ` at ${timeStr}`;
};

/**
 * Get the other participant's details from a thread
 * @param {Object} thread - Thread document data
 * @param {string} currentUid - Current user's UID
 * @returns {Object} Other participant's details
 */
export const getOtherParticipant = (thread, currentUid) => {
  if (!thread?.participants || !thread?.participantDetails) {
    return { firstName: "Unknown", lastName: "", profileAvatar: null, role: "user" };
  }

  const otherUid = thread.participants.find((uid) => uid !== currentUid);
  return thread.participantDetails[otherUid] || {
    firstName: "Unknown",
    lastName: "",
    profileAvatar: null,
    role: "user"
  };
};

/**
 * Check if current user has unread messages in thread
 * @param {Object} thread - Thread document data
 * @param {string} currentUid - Current user's UID
 * @returns {number} Unread count
 */
export const getUnreadCount = (thread, currentUid) => {
  return thread?.unread?.[currentUid] || 0;
};
