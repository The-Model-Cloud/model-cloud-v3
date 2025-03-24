import { useEffect, useState } from "react";
import { auth, db } from "config/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { Link } from "react-router-dom";

// @mui components
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Divider from "@mui/material/Divider";

// Material Dashboard components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

// Layout components
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import DataTable from "examples/Tables/DataTable";

function MyJobs() {
  const [menu, setMenu] = useState(null);
  const [tableData, setTableData] = useState({ columns: [], rows: [] });
  const [loading, setLoading] = useState(true);

  const openMenu = (event) => setMenu(event.currentTarget);
  const closeMenu = () => setMenu(null);

  const renderMenu = (
    <Menu
      anchorEl={menu}
      anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      transformOrigin={{ vertical: "top", horizontal: "left" }}
      open={Boolean(menu)}
      onClose={closeMenu}
      keepMounted
    >
      <MenuItem onClick={closeMenu}>Status: Open</MenuItem>
      <MenuItem onClick={closeMenu}>Status: Closed</MenuItem>
      <Divider sx={{ margin: "0.5rem 0" }} />
      <MenuItem onClick={closeMenu}>
        <MDTypography variant="button" color="error" fontWeight="regular">
          Remove Filter
        </MDTypography>
      </MenuItem>
    </Menu>
  );

  const fetchJobsForCurrentUser = async () => {
    setLoading(true);
    const user = auth.currentUser;
    if (!user) return;

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) return;

    const jobRefs = userSnap.data().jobs || [];

    if (jobRefs.length === 0) {
      setTableData({ columns: [], rows: [] });
      setLoading(false);
      return;
    }

    const jobsQuery = query(collection(db, "jobs"), where("reference", "in", jobRefs));
    const jobDocs = await getDocs(jobsQuery);

    const jobs = [];
    jobDocs.forEach((doc) => {
      const data = doc.data();
      jobs.push({
        reference: data.reference,
        title: data.title,
        location: data.location,
        status: data.status || "Open",
        budget: data.budget || "-",
        createdAt: new Date(data.createdAt).toLocaleDateString("en-UK"),
      });
    });

    setTableData({
      columns: [
        { Header: "reference", accessor: "reference",
            Cell: ({ value }) => (
              <Link to={`/jobs/${value}`}>
                <MDTypography variant="button" color="info">{value}</MDTypography>
              </Link>
            ), },
        { Header: "title", accessor: "title" },
        { Header: "location", accessor: "location" },
        { Header: "status", accessor: "status" },
        { Header: "budget", accessor: "budget" },
        { Header: "created", accessor: "createdAt" },
      ],
      rows: jobs,
    });

    setLoading(false);
  };

  useEffect(() => {
    fetchJobsForCurrentUser();
  }, []);

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox my={3}>
        <MDBox display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <MDTypography variant="h4">My Jobs</MDTypography>
          <MDBox display="flex">
            <MDButton variant={menu ? "contained" : "outlined"} color="dark" onClick={openMenu}>
              filters&nbsp;
              <Icon>keyboard_arrow_down</Icon>
            </MDButton>
            {renderMenu}
            <MDBox ml={1}>
              <MDButton variant="outlined" color="dark">
                <Icon>description</Icon>
                &nbsp;export csv
              </MDButton>
            </MDBox>
          </MDBox>
        </MDBox>
        <Card>
          <DataTable
            table={tableData}
            entriesPerPage={{ defaultValue: 5, entries: [5, 10, 15, 20] }}
            canSearch
            showTotalEntries
            isSorted
            noEndBorder
          />
        </Card>
      </MDBox>
      <Footer />
    </DashboardLayout>
  );
}

export default MyJobs;
