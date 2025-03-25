import { Link } from "react-router-dom";
import DataTable from "examples/Tables/DataTable";
import MDTypography from "components/MDTypography";

function JobSearchResults({ results, loading }) {
  const tableData = {
    columns: [
      {
        Header: "reference",
        accessor: "reference",
        Cell: ({ value }) => (
          <Link to={`/jobs/${value}`}>
            <MDTypography variant="button" color="info">{value}</MDTypography>
          </Link>
        ),
      },
      { Header: "title", accessor: "title" },
      { Header: "location", accessor: "location" },
      { Header: "status", accessor: "status" },
      { Header: "budget", accessor: "budget" },
      {
        Header: "created",
        accessor: "createdAt",
        Cell: ({ value }) => new Date(value).toLocaleDateString("en-UK"),
      },
    ],
    rows: results || [],
  };

  return (
    <DataTable
      table={tableData}
      isSorted
      canSearch
      showTotalEntries
      noEndBorder
      entriesPerPage={{ defaultValue: 5, entries: [5, 10, 20] }}
      loading={loading}
    />
  );
}

export default JobSearchResults;
