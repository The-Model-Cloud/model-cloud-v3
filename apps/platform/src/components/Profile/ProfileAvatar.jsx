import Avatar from "@mui/material/Avatar";
import Badge from "@mui/material/Badge";
import { styled } from "@mui/material/styles";
import PropTypes from 'prop-types'; // Import PropTypes

import burceMars from "assets/images/bruce-mars.jpg";

const StyledBadge = styled(Badge)(({ theme }) => ({
  "& .MuiBadge-badge": {
    backgroundColor: "#44b700",
    color: "#44b700",
    boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
    "&::after": {
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      borderRadius: "50%",
      animation: "ripple 1.2s infinite ease-in-out",
      border: "1px solid currentColor",
      content: '""',
    },
  },
  "@keyframes ripple": {
    "0%": { transform: "scale(.8)", opacity: 1 },
    "100%": { transform: "scale(2.4)", opacity: 0 },
  },
}));

const transformCloudinary = (url, size = 56) => {
  if (!url || !url.includes("res.cloudinary.com")) return url;
  const parts = url.split("/upload/");
  return `${parts[0]}/upload/c_thumb,g_face,w_${size},h_${size}/${parts[1]}`;
};

export default function ProfileAvatar({
  src,
  alt = "Avatar",
  size = 56,
  showStatusDot = false,
  borderRadius = "50%", // Add borderRadius prop with default value
}) {
  const transformed = transformCloudinary(src, size);

  const avatar = (
    <Avatar
      alt={alt}
      src={transformed || burceMars}
      sx={{ width: size, height: size, borderRadius: borderRadius }} // Apply borderRadius
    />
  );

  return showStatusDot ? (
    <StyledBadge
      overlap="circular"
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      variant="dot"
    >
      {avatar}
    </StyledBadge>
  ) : (
    avatar
  );
}

// Add PropTypes for type checking
ProfileAvatar.propTypes = {
  src: PropTypes.string,
  alt: PropTypes.string,
  size: PropTypes.number,
  showStatusDot: PropTypes.bool,
  borderRadius: PropTypes.string, // Add borderRadius propType
};