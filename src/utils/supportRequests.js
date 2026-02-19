import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "config/firebase";
import { createThread } from "utils/api";
import { sendMessage } from "utils/messaging";
import { createNotification } from "utils/notifications";

/**
 * Get all admin and super admin users
 * @returns {Promise<Array>} Array of admin user objects with uid, firstName, lastName, email, profileAvatar
 */
export const getAllAdmins = async () => {
  const adminsQuery = query(
    collection(db, "users"),
    where("role", "in", ["admin", "super admin"])
  );
  const snapshot = await getDocs(adminsQuery);

  return snapshot.docs.map((doc) => ({
    uid: doc.id,
    ...doc.data(),
  }));
};

/**
 * Send organisation change request to all admins
 * @param {Object} requester - The user making the request { uid, firstName, lastName, email, profileAvatar }
 * @param {Object} organisation - Current organisation details { companyName, ... }
 * @param {Object} changeRequest - { whatToChange, newDetails, additionalNotes }
 * @returns {Promise<{success: boolean, threadIds: string[], notifiedCount: number}>}
 */
export const sendOrganisationChangeRequest = async (requester, organisation, changeRequest) => {
  const admins = await getAllAdmins();
  const threadIds = [];
  let notifiedCount = 0;

  // Compose the message body
  const messageBody = `**Organisation Change Request**

**From:** ${requester.firstName} ${requester.lastName} (${requester.email})
**Current Organisation:** ${organisation?.companyName || "Not set"}

**What to Change:** ${changeRequest.whatToChange}
**New Details:** ${changeRequest.newDetails}
${changeRequest.additionalNotes ? `**Additional Notes:** ${changeRequest.additionalNotes}` : ""}

---
Please review and update the organisation details if appropriate.`;

  // Send message to each admin via support thread
  for (const admin of admins) {
    // Skip if the admin is the requester
    if (admin.uid === requester.uid) {
      continue;
    }

    try {
      // Create or get existing support thread between requester and this admin
      const { threadId } = await createThread(admin.uid, "support", null);

      // Send the message
      await sendMessage(
        threadId,
        requester.uid,
        {
          firstName: requester.firstName,
          lastName: requester.lastName,
          profileAvatar: requester.profileAvatar || null,
        },
        messageBody
      );

      // Create a notification for the admin
      await createNotification(
        admin.uid,
        "organisation_change_request",
        "Organisation Change Request",
        `${requester.firstName} ${requester.lastName} has requested changes to their organisation details`,
        {
          requesterId: requester.uid,
          requesterName: `${requester.firstName} ${requester.lastName}`,
          organisationName: organisation?.companyName,
          whatToChange: changeRequest.whatToChange,
          link: "/messages",
        }
      );

      threadIds.push(threadId);
      notifiedCount++;
    } catch (error) {
      console.error(`Failed to notify admin ${admin.uid}:`, error);
      // Continue with other admins even if one fails
    }
  }

  return {
    success: notifiedCount > 0,
    threadIds,
    notifiedCount,
  };
};
