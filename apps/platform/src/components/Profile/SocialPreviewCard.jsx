import { Card, Grid } from "@mui/material";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

import InstagramIcon from "@mui/icons-material/Instagram";
import YouTubeIcon from "@mui/icons-material/YouTube";
import FacebookIcon from "@mui/icons-material/Facebook";
import TwitterIcon from "@mui/icons-material/Twitter";
import MusicVideoIcon from "@mui/icons-material/MusicVideo";

const iconMap = {
  instagram: <InstagramIcon />,
  tiktok: <MusicVideoIcon />,
  youtube: <YouTubeIcon />,
  facebook: <FacebookIcon />,
  twitter: <TwitterIcon />,
};

const SocialPreviewCard = ({ links }) => {
  return (
    <Card>
      <MDBox p={3}>
        <MDTypography variant="h6" mb={2}>
          Social Media
        </MDTypography>
        <Grid container spacing={2}>
          {Object.entries(links).map(([platform, url]) => (
            url ? (
              <Grid item xs={12} sm={6} key={platform}>
                <MDBox display="flex" alignItems="center" gap={1}>
                  {iconMap[platform]}
                  <MDTypography variant="body2">
                    <a href={url} target="_blank" rel="noreferrer">{url}</a>
                  </MDTypography>
                </MDBox>
              </Grid>
            ) : null
          ))}
        </Grid>
      </MDBox>
    </Card>
  );
};

export default SocialPreviewCard;
