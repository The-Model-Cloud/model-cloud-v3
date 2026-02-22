import { createContext, useContext, useEffect, useState } from "react";
import { collection, query, where, onSnapshot, orderBy, limit, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "./AuthContext";

const NotificationsContext = createContext();

export const NotificationsProvider = ({ children }) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If no user, reset state
    if (!user?.uid) {
      setUnreadCount(0);
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Subscribe to user's notifications subcollection
    const notificationsQuery = query(
      collection(db, "users", user.uid, "notifications"),
      orderBy("createdAt", "desc"),
      limit(50) // Limit to most recent 50
    );

    const unsubscribe = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        let unread = 0;
        const notificationsList = [];

        snapshot.forEach((docSnap) => {
          const data = { id: docSnap.id, ...docSnap.data() };
          notificationsList.push(data);

          // Count unread notifications
          if (!data.read) {
            unread += 1;
          }
        });

        setNotifications(notificationsList);
        setUnreadCount(unread);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching notifications:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // Mark a notification as read
  const markAsRead = async (notificationId) => {
    if (!user?.uid || !notificationId) return;

    try {
      const notificationRef = doc(db, "users", user.uid, "notifications", notificationId);
      await updateDoc(notificationRef, { read: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!user?.uid) return;

    try {
      const unreadNotifications = notifications.filter((n) => !n.read);
      await Promise.all(
        unreadNotifications.map((n) => {
          const notificationRef = doc(db, "users", user.uid, "notifications", n.id);
          return updateDoc(notificationRef, { read: true });
        })
      );
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  return (
    <NotificationsContext.Provider
      value={{ unreadCount, notifications, loading, markAsRead, markAllAsRead }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationsContext);
