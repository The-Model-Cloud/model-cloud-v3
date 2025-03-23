import { useMemo } from "react";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDDropzone from "components/MDDropzone";

function Media() {
  return (
    <MDBox>
      <MDTypography variant="h5">Upload Reference Material</MDTypography>
      <MDBox mt={3}>
        <MDBox mb={1} ml={0.5}>
          <MDTypography component="label" variant="button" fontWeight="regular" color="text">
            Attach example images, references, or moodboards
          </MDTypography>
        </MDBox>
        {useMemo(() => (
          <MDDropzone options={{ addRemoveLinks: true }} />
        ), [])}
      </MDBox>
    </MDBox>
  );
}

export default Media;
