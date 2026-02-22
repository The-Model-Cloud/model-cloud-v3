/**
 * JobActivityLog - Shows the activity log for a job (admin only)
 */

import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { collection, query, orderBy, onSnapshot, limit } from "firebase/firestore";
import { db } from "config/firebase";

// MUI components
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import Timeline from "@mui/lab/Timeline";
import TimelineItem from "@mui/lab/TimelineItem";
import TimelineSeparator from "@mui/lab/TimelineSeparator";
import TimelineConnector from "@mui/lab/TimelineConnector";
import TimelineContent from "@mui/lab/TimelineContent";
import TimelineDot from "@mui/lab/TimelineDot";
import TimelineOppositeContent from "@mui/lab/TimelineOppositeContent";
import CircularProgress from "@mui/material/CircularProgress";
import Collapse from "@mui/material/Collapse";

// MD components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

// Activity type to display info mapping
const ACTIVITY_CONFIG = {
  job_created: {
    icon: "add_circle",
    color: "success",
    label: "Job Created",
  },
  job_updated: {
    icon: "edit",
    color: "info",
    label: "Job Updated",
  },
  job_cancelled: {
    icon: "cancel",
    color: "error",
    label: "Job Cancelled",
  },
  model_invited: {
    icon: "mail",
    color: "info",
    label: "Model Invited",
  },
  model_applied: {
    icon: "person_add",
    color: "primary",
    label: "Model Applied",
  },
  model_accepted_invitation: {
    icon: "how_to_reg",
    color: "success",
    label: "Invitation Accepted",
  },
  application_cancelled: {
    icon: "person_remove",
    color: "warning",
    label: "Application Cancelled",
  },
  job_awarded: {
    icon: "emoji_events",
    color: "warning",
    label: "Job Awarded",
  },
  payment_authorized: {
    icon: "lock",
    color: "info",
    label: "Payment Authorised",
  },
  payment_authorised: {
    icon: "lock",
    color: "info",
    label: "Payment Authorised",
  },
  payment_captured: {
    icon: "paid",
    color: "success",
    label: "Payment Captured",
  },
  payment_cancelled: {
    icon: "money_off",
    color: "error",
    label: "Payment Cancelled",
  },
  job_completed_by_model: {
    icon: "check",
    color: "info",
    label: "Marked Complete (Model)",
  },
  job_completed_by_client: {
    icon: "verified",
    color: "success",
    label: "Confirmed Complete (Client)",
  },
  message_sent: {
    icon: "message",
    color: "secondary",
    label: "Message Sent",
  },
};

// Helper to format timestamp
const formatTime = (timestamp) => {
  if (!timestamp) return "";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Helper to get activity description
const getActivityDescription = (activity) => {
  const { type, actorName, details } = activity;

  switch (type) {
    case "job_created":
      return `${actorName} created this job`;
    case "model_invited":
      return `${actorName} invited ${details?.modelName || "a model"} to apply`;
    case "model_applied":
      return `${actorName} applied for this job`;
    case "model_accepted_invitation":
      return `${actorName} accepted the invitation and applied`;
    case "application_cancelled":
      return `${actorName} cancelled their application`;
    case "job_awarded":
      return `${actorName} awarded the job to ${details?.modelName || "a model"} (${details?.currency} ${details?.agreedAmount})`;
    case "payment_authorized":
    case "payment_authorised":
      return `${actorName} authorised payment of ${details?.currency} ${details?.amount}`;
    case "payment_captured":
      return `Payment of ${details?.currency} ${details?.amount} was captured`;
    case "job_completed_by_model":
      return `${actorName} marked the job as complete`;
    case "job_completed_by_client":
      return `${actorName} confirmed job completion and released payment`;
    default:
      return `${actorName} performed an action`;
  }
};

function JobActivityLog({ jobId, isAdmin }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!jobId || !isAdmin) {
      setLoading(false);
      return;
    }

    // Subscribe to activity log
    const activityQuery = query(
      collection(db, "jobs", jobId, "activityLog"),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    const unsubscribe = onSnapshot(
      activityQuery,
      (snapshot) => {
        const activityList = [];
        snapshot.forEach((doc) => {
          activityList.push({ id: doc.id, ...doc.data() });
        });
        setActivities(activityList);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching activity log:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [jobId, isAdmin]);

  // Don't render if not admin
  if (!isAdmin) return null;

  return (
    <Card sx={{ mt: 3 }}>
      <MDBox p={3}>
        <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <MDBox display="flex" alignItems="center" gap={1}>
            <Icon color="secondary">history</Icon>
            <MDTypography variant="h6" fontWeight="medium">
              Activity Log
            </MDTypography>
            <MDTypography variant="caption" color="text">
              (Admin only)
            </MDTypography>
          </MDBox>
          <MDButton
            variant="text"
            color="info"
            size="small"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "Collapse" : "Expand"}
          </MDButton>
        </MDBox>

        <Collapse in={expanded}>
          {loading ? (
            <MDBox display="flex" justifyContent="center" py={3}>
              <CircularProgress size={30} />
            </MDBox>
          ) : activities.length === 0 ? (
            <MDBox textAlign="center" py={3}>
              <MDTypography variant="body2" color="text">
                No activity recorded yet
              </MDTypography>
            </MDBox>
          ) : (
            <Timeline position="alternate">
              {activities.map((activity, index) => {
                const config = ACTIVITY_CONFIG[activity.type] || {
                  icon: "circle",
                  color: "grey",
                  label: activity.type,
                };

                return (
                  <TimelineItem key={activity.id}>
                    <TimelineOppositeContent color="text.secondary" sx={{ fontSize: "0.75rem" }}>
                      {formatTime(activity.createdAt)}
                    </TimelineOppositeContent>
                    <TimelineSeparator>
                      <TimelineDot color={config.color}>
                        <Icon fontSize="small">{config.icon}</Icon>
                      </TimelineDot>
                      {index < activities.length - 1 && <TimelineConnector />}
                    </TimelineSeparator>
                    <TimelineContent>
                      <MDTypography variant="button" fontWeight="medium">
                        {config.label}
                      </MDTypography>
                      <MDTypography variant="caption" color="text" display="block">
                        {getActivityDescription(activity)}
                      </MDTypography>
                      <MDTypography variant="caption" color="secondary">
                        by {activity.actorRole}
                      </MDTypography>
                    </TimelineContent>
                  </TimelineItem>
                );
              })}
            </Timeline>
          )}
        </Collapse>

        {!expanded && activities.length > 0 && (
          <MDTypography variant="caption" color="text">
            {activities.length} activities recorded
          </MDTypography>
        )}
      </MDBox>
    </Card>
  );
}

JobActivityLog.defaultProps = {
  isAdmin: false,
};

JobActivityLog.propTypes = {
  jobId: PropTypes.string.isRequired,
  isAdmin: PropTypes.bool,
};

export default JobActivityLog;
