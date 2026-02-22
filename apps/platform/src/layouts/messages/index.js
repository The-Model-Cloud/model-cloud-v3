import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { collection, query, orderBy, onSnapshot, limit } from "firebase/firestore";
import { db } from "config/firebase";

// MUI components
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Divider from "@mui/material/Divider";

// Material Dashboard components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

// Layout components
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

// Messaging components
import ThreadList from "./components/ThreadList";
import ThreadView from "./components/ThreadView";
import EmptyInbox from "./components/EmptyInbox";

// Context and utilities
import { useAuth } from "context/AuthContext";
import { useMessaging } from "context/MessagingContext";
import { markThreadAsRead } from "utils/api";

function MessagesInbox() {
  const { threadId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { threads, loading: threadsLoading } = useMessaging();

  const [selectedThread, setSelectedThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  // Set selected thread when threadId changes or threads load
  useEffect(() => {
    if (threadId && threads.length > 0) {
      const thread = threads.find((t) => t.id === threadId);
      if (thread) {
        setSelectedThread(thread);
      }
    } else if (!threadId && threads.length > 0) {
      // Auto-select first thread on desktop
      setSelectedThread(threads[0]);
      navigate(`/messages/${threads[0].id}`, { replace: true });
    }
  }, [threadId, threads, navigate]);

  // Load messages when selected thread changes
  useEffect(() => {
    if (!selectedThread?.id) {
      setMessages([]);
      return;
    }

    setMessagesLoading(true);

    const messagesQuery = query(
      collection(db, "threads", selectedThread.id, "messages"),
      orderBy("createdAt", "asc"),
      limit(100)
    );

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const messagesList = [];
        snapshot.forEach((doc) => {
          messagesList.push({ id: doc.id, ...doc.data() });
        });
        setMessages(messagesList);
        setMessagesLoading(false);
      },
      (error) => {
        console.error("Error fetching messages:", error);
        setMessagesLoading(false);
      }
    );

    return () => unsubscribe();
  }, [selectedThread?.id]);

  // Mark thread as read when opened
  useEffect(() => {
    if (selectedThread?.id && user?.uid) {
      const unreadCount = selectedThread.unread?.[user.uid] || 0;
      if (unreadCount > 0) {
        markThreadAsRead(selectedThread.id).catch((err) =>
          console.warn("Failed to mark as read:", err)
        );
      }
    }
  }, [selectedThread?.id, user?.uid]);

  // Handle thread selection
  const handleSelectThread = (thread) => {
    setSelectedThread(thread);
    navigate(`/messages/${thread.id}`);
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox py={3}>
        <Card sx={{ height: "calc(100vh - 220px)", minHeight: "500px" }}>
          <Grid container sx={{ height: "100%" }}>
            {/* Thread List - Left Panel */}
            <Grid
              item
              xs={12}
              md={4}
              lg={3}
              sx={{
                borderRight: { md: "1px solid" },
                borderColor: { md: "divider" },
                height: "100%",
                overflow: "hidden",
              }}
            >
              <MDBox p={2} borderBottom="1px solid" borderColor="divider">
                <MDTypography variant="h6" fontWeight="medium">
                  Messages
                </MDTypography>
              </MDBox>
              <MDBox
                sx={{
                  height: "calc(100% - 60px)",
                  overflowY: "auto",
                }}
              >
                {threadsLoading ? (
                  <MDBox p={3} textAlign="center">
                    <MDTypography variant="body2" color="text">
                      Loading conversations...
                    </MDTypography>
                  </MDBox>
                ) : threads.length === 0 ? (
                  <MDBox p={3} textAlign="center">
                    <MDTypography variant="body2" color="text">
                      No conversations yet
                    </MDTypography>
                  </MDBox>
                ) : (
                  <ThreadList
                    threads={threads}
                    selectedThreadId={selectedThread?.id}
                    currentUserId={user?.uid}
                    onSelectThread={handleSelectThread}
                  />
                )}
              </MDBox>
            </Grid>

            {/* Thread View - Right Panel */}
            <Grid
              item
              xs={12}
              md={8}
              lg={9}
              sx={{
                height: "100%",
                display: { xs: selectedThread ? "block" : "none", md: "block" },
              }}
            >
              {selectedThread ? (
                <ThreadView
                  thread={selectedThread}
                  messages={messages}
                  loading={messagesLoading}
                  currentUser={user}
                />
              ) : (
                <EmptyInbox />
              )}
            </Grid>
          </Grid>
        </Card>
      </MDBox>
      <Footer />
    </DashboardLayout>
  );
}

export default MessagesInbox;
