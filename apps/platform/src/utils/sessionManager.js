import { collection, addDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "config/firebase";

/**
 * Parse a user agent string into device/browser/OS info.
 * @param {string} ua - User agent string (defaults to navigator.userAgent)
 */
export const parseUserAgent = (ua = navigator.userAgent) => {
  const isMobile = /iPhone|Android.*Mobile|BlackBerry|Windows Phone/i.test(ua);
  const isTablet = /iPad|Android(?!.*Mobile)/i.test(ua);
  const deviceType = isTablet ? "Tablet" : isMobile ? "Mobile" : "Desktop";

  let browser = "Unknown";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/OPR\//i.test(ua)) browser = "Opera";
  else if (/Chrome\//i.test(ua)) browser = "Chrome";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";
  else if (/Safari\//i.test(ua)) browser = "Safari";
  else if (/MSIE|Trident/i.test(ua)) browser = "IE";

  let os = "Unknown";
  if (/Windows NT 10/i.test(ua)) os = "Windows 10/11";
  else if (/Windows/i.test(ua)) os = "Windows";
  else if (/iPhone|CPU OS/i.test(ua)) os = "iOS";
  else if (/iPad/i.test(ua)) os = "iPadOS";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/Mac OS X/i.test(ua)) os = "macOS";
  else if (/Linux/i.test(ua)) os = "Linux";

  return { deviceType, browser, os };
};

/**
 * Write a new session document to Firestore and store its ID in localStorage.
 * Called immediately after a successful sign-in.
 */
export const createSession = async (uid, email) => {
  try {
    const { deviceType, browser, os } = parseUserAgent();
    const sessionRef = await addDoc(collection(db, "userSessions"), {
      uid,
      email,
      loginAt: new Date().toISOString(),
      userAgent: navigator.userAgent,
      deviceType,
      browser,
      os,
      status: "active",
      loggedOutAt: null,
    });
    localStorage.setItem("sessionId", sessionRef.id);
    return sessionRef.id;
  } catch (err) {
    // Non-fatal — don't break login if session tracking fails
    console.warn("Failed to create session record:", err);
  }
};

/**
 * Mark the current session as logged out.
 * Called just before Firebase signOut so the session is cleanly closed.
 */
export const endSession = async () => {
  try {
    const sessionId = localStorage.getItem("sessionId");
    if (sessionId) {
      await updateDoc(doc(db, "userSessions", sessionId), {
        status: "logged_out",
        loggedOutAt: new Date().toISOString(),
      });
      localStorage.removeItem("sessionId");
    }
  } catch (err) {
    // Non-fatal
    console.warn("Failed to end session record:", err);
  }
};
