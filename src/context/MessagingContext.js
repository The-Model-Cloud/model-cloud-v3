import { createContext, useContext, useEffect, useState } from "react";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "./AuthContext";

const MessagingContext = createContext();

export const MessagingProvider = ({ children }) => {
  const { user } = useAuth();
  const [totalUnread, setTotalUnread] = useState(0);
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If no user, reset state
    if (!user?.uid) {
      setTotalUnread(0);
      setThreads([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Subscribe to user's threads
    const threadsQuery = query(
      collection(db, "threads"),
      where("participants", "array-contains", user.uid),
      orderBy("lastMessageAt", "desc")
    );

    const unsubscribe = onSnapshot(
      threadsQuery,
      (snapshot) => {
        let unreadSum = 0;
        const threadsList = [];

        snapshot.forEach((doc) => {
          const data = { id: doc.id, ...doc.data() };
          threadsList.push(data);

          // Sum unread counts for current user
          unreadSum += data.unread?.[user.uid] || 0;
        });

        setThreads(threadsList);
        setTotalUnread(unreadSum);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching threads:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  return (
    <MessagingContext.Provider value={{ totalUnread, threads, loading }}>
      {children}
    </MessagingContext.Provider>
  );
};

export const useMessaging = () => useContext(MessagingContext);
