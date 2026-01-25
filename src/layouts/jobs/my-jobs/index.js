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

    const userData = userSnap.data();
    const jobRefs = userData.jobs || [];
    const appliedJobs = userData.appliedJobs || [];

    // Combine both created jobs and applied jobs
    const allJobRefs = [...new Set([...jobRefs, ...appliedJobs.map(j => j.jobReference)])];

    if (allJobRefs.length === 0) {
      setTableData({ columns: [], rows: [] });
      setLoading(false);
      return;
    }

    const jobsQuery = query(collection(db, "jobs"), where("reference", "in", allJobRefs));
    const jobDocs = await getDocs(jobsQuery);

    const jobs = [];
    jobDocs.forEach((doc) => {
      const data = doc.data();

      // Check if this is a created job or applied job
      const isCreated = jobRefs.includes(data.reference);
      const appliedJob = appliedJobs.find(aj => aj.jobReference === data.reference);
      const isApplied = !!appliedJob;

      jobs.push({
        reference: data.reference,
        title: data.title,
        location: data.location,
        status: data.status || "Open",
        applicationStatus: isApplied ? (appliedJob.status || "pending") : (isCreated ? "Owner" : "-"),
        budget: {
          amount: data.budget || "-",
          currency: data.currency || "GBP",
        },
        createdAt: isApplied && appliedJob.appliedAt
          ? new Date(appliedJob.appliedAt).toLocaleDateString("en-UK")
          : new Date(data.createdAt).toLocaleDateString("en-UK"),
        isOwner: isCreated,
      });
    });

    const formatCurrency = ({ amount, currency }) => {
      if (!amount || amount === "-") return "-";

      const number = parseFloat(amount);
      const formatter = new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency,
        currencyDisplay: "symbol", // can be "symbol" | "code" | "name"
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      return formatter.format(number);
    };



    const getStatusColor = (status) => {
      switch (status.toLowerCase()) {
        case "pending":
          return "warning";
        case "accepted":
        case "approved":
          return "success";
        case "rejected":
          return "error";
        case "owner":
          return "info";
        default:
          return "text";
      }
    };

    setTableData({
      columns: [
        {
          Header: "reference", accessor: "reference",
          Cell: ({ value }) => (
            <Link to={`/jobs/${value}`}>
              <MDTypography variant="button" color="info">{value}</MDTypography>
            </Link>
          ),
        },
        { Header: "title", accessor: "title" },
        { Header: "location", accessor: "location" },
        { Header: "status", accessor: "status" },
        {
          Header: "application",
          accessor: "applicationStatus",
          Cell: ({ value }) => (
            <MDTypography variant="button" color={getStatusColor(value)} fontWeight="medium">
              {value}
            </MDTypography>
          ),
        },
        {
          Header: "budget",
          accessor: "budget",
          Cell: ({ value }) => (
            <MDTypography variant="button" color="text">
              {formatCurrency(value)}
            </MDTypography>
          ),
        },
        { Header: "date", accessor: "createdAt" },
        {
          Header: "action",
          accessor: "action",
          Cell: ({ row }) => (
            row.original.isOwner ? (
              <Link to={`/jobs/edit/${row.original.reference}`}>
                <MDButton variant="text" color="info" size="small">
                  <Icon>edit</Icon>&nbsp;Edit
                </MDButton>
              </Link>
            ) : (
              <Link to={`/jobs/${row.original.reference}`}>
                <MDButton variant="text" color="info" size="small">
                  <Icon>visibility</Icon>&nbsp;View
                </MDButton>
              </Link>
            )
          ),
        },
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
