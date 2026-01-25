/**
 * ViewToggle - Toggle between card and list view modes
 * Used in browse models and favourites pages
 */

import PropTypes from "prop-types";

// @mui material components
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Icon from "@mui/material/Icon";
import Tooltip from "@mui/material/Tooltip";

function ViewToggle({ view, onChange }) {
  const handleChange = (event, newView) => {
    // Don't allow deselection (newView would be null)
    if (newView !== null) {
      onChange(newView);
    }
  };

  return (
    <ToggleButtonGroup
      value={view}
      exclusive
      onChange={handleChange}
      size="small"
      sx={{
        "& .MuiToggleButton-root": {
          px: 1.5,
          py: 0.75,
          border: "1px solid",
          borderColor: "grey.300",
          "&.Mui-selected": {
            backgroundColor: "info.main",
            color: "white",
            "&:hover": {
              backgroundColor: "info.dark",
            },
          },
        },
      }}
    >
      <ToggleButton value="card">
        <Tooltip title="Card view">
          <Icon>grid_view</Icon>
        </Tooltip>
      </ToggleButton>
      <ToggleButton value="list">
        <Tooltip title="List view">
          <Icon>view_list</Icon>
        </Tooltip>
      </ToggleButton>
    </ToggleButtonGroup>
  );
}

ViewToggle.propTypes = {
  view: PropTypes.oneOf(["card", "list"]).isRequired,
  onChange: PropTypes.func.isRequired,
};

export default ViewToggle;
