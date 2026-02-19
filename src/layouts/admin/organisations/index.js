import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getAllOrganisations, getOrganisationUsers } from "utils/organisations";

// MUI and MD components
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Chip from "@mui/material/Chip";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

// Dashboard layout components
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import DataTable from "examples/Tables/DataTable";

// Auth context
import { useAuth } from "context/AuthContext";

function Organisations() {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [tableData, setTableData] = useState({ columns: [], rows: [] });
  const [organisations, setOrganisations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Determine user role
  const userRole = currentUser?.role?.toLowerCase();
  const isAdmin = userRole === "admin" || userRole === "super admin";
  const isAccountManager = userRole === "account manager";

  // Handle clicking on company name to view details
  const handleViewOrganisation = useCallback((org) => {
    navigate(`/admin/organisations/${org.id}`);
  }, [navigate]);

  // Fetch organisations on mount
  useEffect(() => {
    const fetchOrganisations = async () => {
      setLoading(true);

      try {
        // Fetch all organisations from the organisations collection
        let allOrganisations = await getAllOrganisations();
        console.log("📋 Organisations fetched:", allOrganisations.length, allOrganisations);

        // For account managers, filter to only their organisation
        if (isAccountManager && currentUser?.organisationId) {
          allOrganisations = allOrganisations.filter(
            (org) => org.id === currentUser.organisationId
          );
        }

        // Fetch users for each organisation to get primary contact info
        const orgsWithDetails = await Promise.all(
          allOrganisations.map(async (org) => {
            const users = await getOrganisationUsers(org.id);

            // Find primary contact (prefer account manager, otherwise first client)
            const accountManager = users.find((u) => u.role === "account manager");
            const primaryContact = accountManager || users[0] || null;

            return {
              ...org,
              contactName: primaryContact
                ? `${primaryContact.firstName || ""} ${primaryContact.lastName || ""}`.trim()
                : "—",
              phone: primaryContact?.phone || "—",
              userCount: users.length,
              users, // Store users for reference
            };
          })
        );

        setOrganisations(orgsWithDetails);
      } catch (error) {
        console.error("Error fetching organisations:", error);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      fetchOrganisations();
    }
  }, [currentUser, isAccountManager]);

  // Update table data when organisations change
  useEffect(() => {
    setTableData({
      columns: [
        {
          Header: "Company Name",
          accessor: "companyName",
          Cell: ({ row }) => (
            <MDBox
              component="span"
              sx={{
                color: "info.main",
                cursor: "pointer",
                fontWeight: "medium",
                "&:hover": {
                  textDecoration: "underline",
                },
              }}
              onClick={() => handleViewOrganisation(row.original)}
            >
              {row.original.companyName}
            </MDBox>
          ),
        },
        {
          Header: "Contact Name",
          accessor: "contactName",
          Cell: ({ row }) => row.original.contactName || "—",
        },
        {
          Header: "Company Number",
          accessor: "companyNumber",
          Cell: ({ row }) => row.original.companyNumber || "—",
        },
        {
          Header: "Phone Number",
          accessor: "phone",
          Cell: ({ row }) => row.original.phone || "—",
        },
        {
          Header: "Users",
          accessor: "userCount",
          width: "10%",
          Cell: ({ row }) => (
            <Chip
              label={row.original.userCount}
              size="small"
              color="primary"
              variant="outlined"
            />
          ),
        },
        {
          Header: "Actions",
          accessor: "actions",
          width: "10%",
          Cell: ({ row }) => {
            const org = row.original;
            return (
              <MDBox display="flex" gap={0.5}>
                <Tooltip title="View Organisation">
                  <IconButton
                    size="small"
                    onClick={() => handleViewOrganisation(org)}
                    sx={{ color: "#1976d2" }}
                  >
                    <Icon fontSize="small">visibility</Icon>
                  </IconButton>
                </Tooltip>
              </MDBox>
            );
          },
        },
      ],
      rows: organisations,
    });
  }, [organisations, handleViewOrganisation]);

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox pt={6} pb={3}>
        <Card>
          <MDBox p={3} lineHeight={1}>
            <MDTypography variant="h5" fontWeight="medium">
              {isAccountManager ? "My Organisation" : "Organisations"}
            </MDTypography>
            <MDTypography variant="button" color="text">
              {loading
                ? "Loading..."
                : `${organisations.length} organisation${organisations.length !== 1 ? "s" : ""} found`}
            </MDTypography>
          </MDBox>
          <DataTable
            table={tableData}
            canSearch
            entriesPerPage={{ defaultValue: 25 }}
          />
        </Card>
      </MDBox>
      <Footer />
    </DashboardLayout>
  );
}

export default Organisations;
