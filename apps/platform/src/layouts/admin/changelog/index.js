import { useEffect, useMemo, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "config/firebase";

// MUI
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Alert from "@mui/material/Alert";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Icon from "@mui/material/Icon";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";

// MD components
import MDBox from "components/MDBox";
import MDButton from "components/MDButton";
import MDTypography from "components/MDTypography";

// Layout
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

import { parseChangelog, splitInline } from "./parseChangelog";

const SECTION_COLOURS = {
  security: "error",
  added: "success",
  fixed: "warning",
  changed: "info",
};

const sectionColour = (title) => SECTION_COLOURS[String(title).toLowerCase()] || "default";

// One line of text, with `code`, **bold** and [links](https://...) shown properly. Plain React elements only,
// never raw HTML, so nothing in the changelog can inject markup.
function Inline({ text }) {
  return splitInline(text).map((piece, index) => {
    if (piece.type === "code") {
      return (
        <MDBox
          key={index}
          component="code"
          sx={{
            px: 0.5,
            borderRadius: "4px",
            fontSize: "0.85em",
            fontFamily: "Consolas, Monaco, monospace",
            backgroundColor: "rgba(128, 128, 128, 0.18)",
            wordBreak: "break-word",
          }}
        >
          {piece.value}
        </MDBox>
      );
    }
    if (piece.type === "bold") return <strong key={index}>{piece.value}</strong>;
    if (piece.type === "link") {
      return (
        <a key={index} href={piece.href} target="_blank" rel="noopener noreferrer">
          {piece.value}
        </a>
      );
    }
    return <span key={index}>{piece.value}</span>;
  });
}

const itemCount = (release) => release.sections.reduce((total, section) => total + section.items.length, 0);

function Changelog() {
  const [status, setStatus] = useState("loading"); // loading | ready | empty | error
  const [content, setContent] = useState("");
  const [syncedAt, setSyncedAt] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null); // null until the first load decides the default

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, "changelog", "current"));
        if (!snap.exists()) {
          setStatus("empty");
          return;
        }
        const data = snap.data();
        setContent(data.content || "");
        setSyncedAt(data.syncedAt?.toDate ? data.syncedAt.toDate() : null);
        setStatus("ready");
      } catch (error) {
        console.error("Could not load the changelog:", error);
        setErrorMessage(error.code === "permission-denied"
          ? "You do not have permission to read the changelog (or the Firestore rules have not been deployed yet)."
          : error.message);
        setStatus("error");
      }
    };
    load();
  }, []);

  const { intro, releases } = useMemo(() => parseChangelog(content), [content]);

  // Open the newest two releases to start with
  useEffect(() => {
    if (status === "ready" && expanded === null) {
      setExpanded(new Set(releases.slice(0, 2).map((_, index) => index)));
    }
  }, [status, releases, expanded]);

  const query = search.trim().toLowerCase();

  // With a search term, keep only the items that match (a matching release or section title keeps everything under it)
  const visibleReleases = useMemo(() => {
    return releases
      .map((release, index) => {
        if (!query) return { release, index, sections: release.sections };
        const releaseMatches = `${release.label} ${release.subtitle}`.toLowerCase().includes(query);
        const sections = release.sections
          .map((section) => {
            const sectionMatches = releaseMatches || section.title.toLowerCase().includes(query);
            const items = sectionMatches
              ? section.items
              : section.items.filter((item) => item.toLowerCase().includes(query));
            return { ...section, items };
          })
          .filter((section) => section.items.length > 0 || (releaseMatches && section.notes.length > 0));
        return { release, index, sections };
      })
      .filter(({ release, sections }) => !query || sections.length > 0 || `${release.label} ${release.subtitle}`.toLowerCase().includes(query));
  }, [releases, query]);

  const toggle = (index) => {
    setExpanded((current) => {
      const next = new Set(current || []);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  };

  const isOpen = (index) => Boolean(query) || Boolean(expanded && expanded.has(index));

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox py={3}>
        <MDBox mb={3} display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2}>
          <MDBox>
            <MDTypography variant="h4" fontWeight="medium">
              Changelog
            </MDTypography>
            <MDTypography variant="body2" color="text">
              Everything that has changed in The Model Cloud, newest first.
              {syncedAt && ` Last updated ${syncedAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}.`}
            </MDTypography>
          </MDBox>

          {status === "ready" && (
            <MDBox display="flex" alignItems="center" gap={1} flexWrap="wrap">
              <TextField
                size="small"
                placeholder="Search the changelog"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                sx={{ minWidth: { xs: "100%", sm: 280 } }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Icon fontSize="small">search</Icon>
                    </InputAdornment>
                  ),
                  endAdornment: search ? (
                    <InputAdornment position="end">
                      <Icon fontSize="small" sx={{ cursor: "pointer", opacity: 0.6 }} onClick={() => setSearch("")}>
                        close
                      </Icon>
                    </InputAdornment>
                  ) : null,
                }}
              />
              <MDButton
                variant="outlined"
                color="info"
                size="small"
                onClick={() => setExpanded(new Set(releases.map((_, index) => index)))}
              >
                Expand all
              </MDButton>
              <MDButton variant="outlined" color="secondary" size="small" onClick={() => setExpanded(new Set())}>
                Collapse all
              </MDButton>
            </MDBox>
          )}
        </MDBox>

        {status === "loading" && (
          <MDBox display="flex" justifyContent="center" py={6}>
            <CircularProgress />
          </MDBox>
        )}

        {status === "error" && <Alert severity="error">Could not load the changelog. {errorMessage}</Alert>}

        {status === "empty" && (
          <Alert severity="info">
            The changelog has not been synced yet. Run <strong>npm run sync:changelog</strong> in the project folder
            (it also runs as part of <strong>npm run deploy:platform</strong>), then reload this page.
          </Alert>
        )}

        {status === "ready" && (
          <>
            {intro.length > 0 && !query && (
              <MDTypography variant="body2" color="text" mb={2}>
                {intro.map((line, index) => (
                  <span key={index}>
                    <Inline text={line} />{" "}
                  </span>
                ))}
              </MDTypography>
            )}

            {visibleReleases.length === 0 ? (
              <Alert severity="info">Nothing in the changelog matches &ldquo;{search}&rdquo;.</Alert>
            ) : (
              visibleReleases.map(({ release, index, sections }) => (
                <Accordion
                  key={index}
                  expanded={isOpen(index)}
                  onChange={() => !query && toggle(index)}
                  disableGutters
                  sx={{ mb: 1.5, "&:before": { display: "none" } }}
                >
                  <AccordionSummary expandIcon={<Icon>expand_more</Icon>}>
                    <MDBox display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
                      <MDTypography variant="h6" fontWeight="medium">
                        {release.label}
                      </MDTypography>
                      {release.subtitle && (
                        <MDTypography variant="button" color="text" fontWeight="regular">
                          {release.subtitle}
                        </MDTypography>
                      )}
                      {release.label.toLowerCase() === "unreleased" && (
                        <Chip label="Not yet released" color="warning" size="small" />
                      )}
                      <Chip label={`${itemCount(release)} change${itemCount(release) !== 1 ? "s" : ""}`} size="small" variant="outlined" />
                    </MDBox>
                  </AccordionSummary>

                  <AccordionDetails>
                    {release.notes.map((note, noteIndex) => (
                      <MDTypography key={noteIndex} variant="body2" color="text" mb={1.5} sx={{ fontStyle: "italic" }}>
                        <Inline text={note} />
                      </MDTypography>
                    ))}

                    {sections.map((section, sectionIndex) => (
                      <MDBox key={sectionIndex} mb={2}>
                        {section.title && (
                          <Chip label={section.title} color={sectionColour(section.title)} size="small" sx={{ mb: 1, fontWeight: 600 }} />
                        )}
                        {section.notes.map((note, noteIndex) => (
                          <MDTypography key={noteIndex} variant="body2" color="text" mb={1}>
                            <Inline text={note} />
                          </MDTypography>
                        ))}
                        <MDBox component="ul" sx={{ m: 0, pl: 3 }}>
                          {section.items.map((item, itemIndex) => (
                            <MDBox component="li" key={itemIndex} sx={{ mb: 1, lineHeight: 1.6 }}>
                              <MDTypography variant="body2" color="text" component="span">
                                <Inline text={item} />
                              </MDTypography>
                            </MDBox>
                          ))}
                        </MDBox>
                      </MDBox>
                    ))}
                  </AccordionDetails>
                </Accordion>
              ))
            )}
          </>
        )}
      </MDBox>
      <Footer />
    </DashboardLayout>
  );
}

export default Changelog;
