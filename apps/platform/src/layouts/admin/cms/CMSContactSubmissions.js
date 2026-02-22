/**
 * CMS Contact Submissions - View and manage contact form submissions
 * Super admin only
 */

import { useEffect, useState } from "react";
import { useAuth } from "context/AuthContext";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  updateDoc,
  deleteDoc,
  orderBy,
  query,
} from "firebase/firestore";

// MUI components
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Skeleton from "@mui/material/Skeleton";
import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import Tooltip from "@mui/material/Tooltip";
import Badge from "@mui/material/Badge";

// Material Dashboard components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

// Layout components
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import DataTable from "examples/Tables/DataTable";

function CMSContactSubmissions() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState([]);
  const [viewDialog, setViewDialog] = useState({ open: false, submission: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, submission: null });
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const isSuperAdmin = user?.role === "super admin";

  // Fetch contact submissions
  useEffect(() => {
    const fetchSubmissions = async () => {
      if (!isSuperAdmin) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const db = getFirestore();

      try {
        const q = query(collection(db, "contactSubmissions"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
        }));
        setSubmissions(data);
      } catch (error) {
        console.error("Error fetching contact submissions:", error);
        setSnackbar({
          open: true,
          message: "Failed to load contact submissions",
          severity: "error",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, [isSuperAdmin]);

  // Mark as read
  const handleMarkAsRead = async (submission) => {
    const db = getFirestore();

    try {
      await updateDoc(doc(db, "contactSubmissions", submission.id), {
        read: true,
      });

      setSubmissions((prev) =>
        prev.map((s) => (s.id === submission.id ? { ...s, read: true } : s))
      );

      setSnackbar({
        open: true,
        message: "Marked as read",
        severity: "success",
      });
    } catch (error) {
      console.error("Error marking as read:", error);
      setSnackbar({
        open: true,
        message: "Failed to update submission",
        severity: "error",
      });
    }
  };

  // Delete submission
  const handleDelete = async () => {
    const db = getFirestore();
    const { submission } = deleteDialog;

    try {
      await deleteDoc(doc(db, "contactSubmissions", submission.id));
      setSubmissions((prev) => prev.filter((s) => s.id !== submission.id));
      setDeleteDialog({ open: false, submission: null });
      setSnackbar({
        open: true,
        message: "Submission deleted",
        severity: "success",
      });
    } catch (error) {
      console.error("Error deleting submission:", error);
      setSnackbar({
        open: true,
        message: "Failed to delete submission",
        severity: "error",
      });
    }
  };

  // View submission details
  const handleView = (submission) => {
    setViewDialog({ open: true, submission });
    if (!submission.read) {
      handleMarkAsRead(submission);
    }
  };

  // Format date
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Access denied
  if (!isSuperAdmin) {
    return (
      <DashboardLayout>
        <DashboardNavbar />
        <MDBox py={3}>
          <Card>
            <MDBox p={3} textAlign="center">
              <Icon fontSize="large" color="error">
                lock
              </Icon>
              <MDTypography variant="h5" mt={2}>
                Access Denied
              </MDTypography>
              <MDTypography variant="body2" color="text">
                Only super admins can access CMS management.
              </MDTypography>
            </MDBox>
          </Card>
        </MDBox>
        <Footer />
      </DashboardLayout>
    );
  }

  // Stats
  const unreadCount = submissions.filter((s) => !s.read).length;

  // Table columns
  const columns = [
    {
      Header: "Status",
      accessor: "read",
      width: "80px",
      Cell: ({ value }) => (
        <Chip
          label={value ? "Read" : "New"}
          size="small"
          color={value ? "default" : "info"}
          variant={value ? "outlined" : "filled"}
        />
      ),
    },
    {
      Header: "Name",
      accessor: "name",
      Cell: ({ row }) => (
        <MDBox display="flex" alignItems="center">
          {!row.original.read && (
            <Badge color="info" variant="dot" sx={{ mr: 1 }}>
              <span />
            </Badge>
          )}
          <MDTypography variant="button" fontWeight={row.original.read ? "regular" : "medium"}>
            {row.original.name}
          </MDTypography>
        </MDBox>
      ),
    },
    { Header: "Email", accessor: "email" },
    { Header: "Company", accessor: "company" },
    {
      Header: "Date",
      accessor: "createdAt",
      Cell: ({ value }) => (
        <MDTypography variant="caption">{formatDate(value)}</MDTypography>
      ),
    },
    {
      Header: "Actions",
      accessor: "actions",
      width: "120px",
      Cell: ({ row }) => (
        <MDBox display="flex" gap={0.5}>
          <Tooltip title="View">
            <IconButton size="small" onClick={() => handleView(row.original)}>
              <Icon>visibility</Icon>
            </IconButton>
          </Tooltip>
          {!row.original.read && (
            <Tooltip title="Mark as Read">
              <IconButton size="small" onClick={() => handleMarkAsRead(row.original)}>
                <Icon>mark_email_read</Icon>
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Delete">
            <IconButton
              size="small"
              color="error"
              onClick={() => setDeleteDialog({ open: true, submission: row.original })}
            >
              <Icon>delete</Icon>
            </IconButton>
          </Tooltip>
        </MDBox>
      ),
    },
  ];

  // Table rows
  const rows = submissions.map((submission) => ({
    ...submission,
    company: submission.company || "-",
  }));

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox py={3}>
        <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <MDBox>
            <MDTypography variant="h4" fontWeight="medium">
              Contact Submissions
            </MDTypography>
            <MDTypography variant="body2" color="text">
              {submissions.length} total submissions
              {unreadCount > 0 && ` (${unreadCount} unread)`}
            </MDTypography>
          </MDBox>
          {unreadCount > 0 && (
            <Chip
              icon={<Icon>mail</Icon>}
              label={`${unreadCount} New`}
              color="info"
              variant="filled"
            />
          )}
        </MDBox>

        <Card>
          {loading ? (
            <MDBox p={3}>
              <Skeleton variant="rectangular" height={400} />
            </MDBox>
          ) : submissions.length === 0 ? (
            <MDBox p={4} textAlign="center">
              <Icon fontSize="large" color="disabled">
                inbox
              </Icon>
              <MDTypography variant="h6" mt={2}>
                No Submissions
              </MDTypography>
              <MDTypography variant="body2" color="text">
                Contact form submissions will appear here.
              </MDTypography>
            </MDBox>
          ) : (
            <DataTable
              table={{ columns, rows }}
              entriesPerPage={{ defaultValue: 10 }}
              canSearch
              showTotalEntries
            />
          )}
        </Card>
      </MDBox>
      <Footer />

      {/* View Dialog */}
      <Dialog
        open={viewDialog.open}
        onClose={() => setViewDialog({ open: false, submission: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <MDBox display="flex" justifyContent="space-between" alignItems="center">
            <span>Contact Submission</span>
            {viewDialog.submission && (
              <Chip
                label={viewDialog.submission.read ? "Read" : "New"}
                size="small"
                color={viewDialog.submission.read ? "default" : "info"}
              />
            )}
          </MDBox>
        </DialogTitle>
        <DialogContent>
          {viewDialog.submission && (
            <MDBox>
              <MDBox mb={2}>
                <MDTypography variant="caption" color="text" fontWeight="medium">
                  From
                </MDTypography>
                <MDTypography variant="body1">{viewDialog.submission.name}</MDTypography>
                <MDTypography variant="body2" color="text">
                  {viewDialog.submission.email}
                </MDTypography>
                {viewDialog.submission.company && (
                  <MDTypography variant="body2" color="text">
                    {viewDialog.submission.company}
                  </MDTypography>
                )}
              </MDBox>

              <MDBox mb={2}>
                <MDTypography variant="caption" color="text" fontWeight="medium">
                  Date
                </MDTypography>
                <MDTypography variant="body2">
                  {formatDate(viewDialog.submission.createdAt)}
                </MDTypography>
              </MDBox>

              <MDBox>
                <MDTypography variant="caption" color="text" fontWeight="medium">
                  Message
                </MDTypography>
                <Card variant="outlined" sx={{ p: 2, mt: 0.5, bgcolor: "grey.50" }}>
                  <MDTypography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                    {viewDialog.submission.message}
                  </MDTypography>
                </Card>
              </MDBox>
            </MDBox>
          )}
        </DialogContent>
        <DialogActions>
          <MDButton
            color="info"
            href={`mailto:${viewDialog.submission?.email}?subject=Re: Contact Form Submission`}
          >
            <Icon sx={{ mr: 1 }}>reply</Icon>
            Reply
          </MDButton>
          <MDButton onClick={() => setViewDialog({ open: false, submission: null })}>
            Close
          </MDButton>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, submission: null })}
      >
        <DialogTitle>Delete Submission</DialogTitle>
        <DialogContent>
          <MDTypography variant="body2">
            Are you sure you want to delete this submission from &quot;
            {deleteDialog.submission?.name}&quot;? This action cannot be undone.
          </MDTypography>
        </DialogContent>
        <DialogActions>
          <MDButton onClick={() => setDeleteDialog({ open: false, submission: null })}>
            Cancel
          </MDButton>
          <MDButton variant="gradient" color="error" onClick={handleDelete}>
            Delete
          </MDButton>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </DashboardLayout>
  );
}

export default CMSContactSubmissions;
