import { useEffect, useState, useCallback } from "react";
import { collection, getDocs, getFirestore, query, where } from "firebase/firestore";

// MUI and MD components
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import { Link } from "react-router-dom";

// Dashboard layout components
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import DataTable from "examples/Tables/DataTable";

// Delete model components
import DeleteModelDialog from "components/DeleteModelDialog";
import useDeleteModel from "hooks/useDeleteModel";

function AllModels() {
  const [tableData, setTableData] = useState({ columns: [], rows: [] });
  const [rawModels, setRawModels] = useState([]);
  const { deleteModel, deleting, error: deleteError, clearError } = useDeleteModel();

  // Delete model state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [modelToDelete, setModelToDelete] = useState(null);
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  // Handle delete click
  const handleDeleteClick = useCallback((model) => {
    setModelToDelete(model);
    setDeleteDialogOpen(true);
  }, []);

  // Handle delete confirmation
  const handleDeleteConfirm = useCallback(async () => {
    if (!modelToDelete) return;

    const result = await deleteModel(modelToDelete.uid, modelToDelete);
    if (result.success) {
      // Remove the deleted model from the local state
      setRawModels((prev) => prev.filter((m) => m.uid !== modelToDelete.uid));
      setDeleteDialogOpen(false);
      setModelToDelete(null);
      setDeleteSuccess(true);
    }
  }, [modelToDelete, deleteModel]);

  // Handle delete dialog close
  const handleDeleteDialogClose = useCallback(() => {
    if (!deleting) {
      setDeleteDialogOpen(false);
      setModelToDelete(null);
      clearError();
    }
  }, [deleting, clearError]);

  // Fetch models on mount
  useEffect(() => {
    const fetchModels = async () => {
      const db = getFirestore();
      const modelsQuery = query(collection(db, "users"), where("role", "==", "model"));
      const snapshot = await getDocs(modelsQuery);

      const modelsList = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          uid: doc.id,
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          name: `${data.firstName || ""} ${data.lastName || ""}`.trim(),
          email: data.email || "",
          instagram: data.instagram || "",
          location: data.location || "",
          status: data.status || "",
          profileAvatar: data.profileAvatar || "",
        };
      });

      setRawModels(modelsList);
    };

    fetchModels();
  }, []);

  // Update table data when rawModels changes
  useEffect(() => {
    setTableData({
      columns: [
        {
          Header: "Name",
          accessor: "name",
          Cell: ({ row }) => {
            const { uid, name } = row.original;
            return (
              <Link to={`/admin/model/${uid}/settings`} style={{ color: "#1976d2", textDecoration: "none" }}>
                {name}
              </Link>
            );
          },
        },
        { Header: "Instagram", accessor: "instagram" },
        { Header: "Location", accessor: "location" },
        { Header: "Status", accessor: "status", width: "10%" },
        {
          Header: "Actions",
          accessor: "actions",
          width: "8%",
          Cell: ({ row }) => {
            const model = row.original;
            return (
              <Tooltip title="Delete model">
                <IconButton
                  size="small"
                  onClick={() => handleDeleteClick(model)}
                  sx={{ color: "#d32f2f" }}
                >
                  <Icon>delete</Icon>
                </IconButton>
              </Tooltip>
            );
          },
        },
      ],
      rows: rawModels,
    });
  }, [rawModels, handleDeleteClick]);

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox pt={6} pb={3}>
        <Card>
          <MDBox p={3} lineHeight={1}>
            <MDTypography variant="h5" fontWeight="medium">
              All Models
            </MDTypography>
            <MDTypography variant="button" color="text">
              List of all model accounts in the system.
            </MDTypography>
          </MDBox>
          <DataTable table={tableData} canSearch entriesPerPage={{ defaultValue: 25 }} />
        </Card>
      </MDBox>
      <Footer />

      {/* Delete Model Dialog */}
      <DeleteModelDialog
        open={deleteDialogOpen}
        onClose={handleDeleteDialogClose}
        onConfirm={handleDeleteConfirm}
        model={modelToDelete}
        loading={deleting}
        error={deleteError}
      />

      {/* Success Snackbar */}
      <Snackbar
        open={deleteSuccess}
        autoHideDuration={4000}
        onClose={() => setDeleteSuccess(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={() => setDeleteSuccess(false)} severity="success" sx={{ width: "100%" }}>
          Model deleted successfully
        </Alert>
      </Snackbar>
    </DashboardLayout>
  );
}

export default AllModels;
