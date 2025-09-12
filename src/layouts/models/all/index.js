import { useEffect, useState } from "react";
import { collection, getDocs, getFirestore, query, where } from "firebase/firestore";

// MUI and MD components
import Card from "@mui/material/Card";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import { Link } from "react-router-dom";

// Dashboard layout components
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import DataTable from "examples/Tables/DataTable";

function AllModels() {
  const [tableData, setTableData] = useState({ columns: [], rows: [] });

  useEffect(() => {
    const fetchModels = async () => {
      const db = getFirestore();
      const modelsQuery = query(collection(db, "users"), where("role", "==", "model"));
      const snapshot = await getDocs(modelsQuery);

      const rows = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          uid: doc.id, // <-- ✅ Needed for link
          name: `${data.firstName || ""} ${data.lastName || ""}`.trim(),
          email: data.email || "",
          instagram: data.instagram || "",
          location: data.location || "",
          status: data.status || "",
        };
      });

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
        ],
        rows,
      });
    };

    fetchModels();
  }, []);

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
    </DashboardLayout>
  );
}

export default AllModels;
