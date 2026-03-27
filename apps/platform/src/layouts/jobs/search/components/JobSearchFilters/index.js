import { useState, useEffect } from "react";
import { collection, query, getDocs, getDoc, doc, where } from "firebase/firestore";
import { auth, db } from "config/firebase";
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";
import MDBox from "components/MDBox";
import MDInput from "components/MDInput";
import MDButton from "components/MDButton";
import MDTypography from "components/MDTypography";
import Autocomplete from "@mui/material/Autocomplete";

import { doesModelMatchJob } from "utils/matching";

import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";

import selectData from "layouts/pages/account/settings/components/BasicInfo/data/selectData";

// Import countries and cities
import { getCountries, getCities } from "countries-cities";
import ukCounties from "uk-counties-cities-towns";
import stateCities from "state-cities";

const genderOptions = selectData.gender;
const categoryOptions = selectData.skills;

function JobSearchFilters({ setFilters, setResults, setLoading }) {
    // Location state
    const [country, setCountry] = useState("");
    const [county, setCounty] = useState("");
    const [state, setState] = useState("");
    const [city, setCity] = useState("");
    const [countries, setCountries] = useState([]);
    const [cities, setCities] = useState([]);

    // Other filter state
    const [gender, setGender] = useState([]);
    const [categories, setCategories] = useState([]);
    const [matchOnly, setMatchOnly] = useState(false);

    // Load countries on mount
    useEffect(() => {
        const allCountries = getCountries();
        const priorityCountries = ["United Kingdom", "Italy", "Spain", "France", "Germany", "United States"];
        const sortedOthers = allCountries
            .filter((c) => !priorityCountries.includes(c))
            .sort((a, b) => a.localeCompare(b));
        setCountries([...priorityCountries, "────────", ...sortedOthers]);
    }, []);

    // Load cities when country/county/state changes
    useEffect(() => {
        if (country === "United Kingdom" && county) {
            setCities(ukCounties[county] || []);
        } else if (country === "United States" && state) {
            setCities((stateCities.getCities(state) || []).sort((a, b) => a.localeCompare(b)));
        } else if (country && country !== "United Kingdom" && country !== "United States") {
            setCities((getCities(country) || []).sort((a, b) => a.localeCompare(b)));
        }
    }, [country, county, state]);

    // Load cached search on mount
    useEffect(() => {
        const cached = localStorage.getItem("recentJobSearch");
        if (cached) {
            const data = JSON.parse(cached);
            setCountry(data.country || "");
            setCounty(data.county || "");
            setState(data.state || "");
            setCity(data.city || "");
            setGender(data.gender || []);
            setCategories(data.categories || []);
            setMatchOnly(data.matchOnly || false);
        }
    }, []);

    const handleCountryChange = (event, value) => {
        if (!value || value === "────────") {
            setCountry("");
            setCounty("");
            setState("");
            setCity("");
            setCities([]);
            return;
        }

        setCountry(value);
        setCounty("");
        setState("");
        setCity("");

        if (value === "United Kingdom" || value === "United States") {
            setCities([]);
        } else {
            setCities((getCities(value) || []).sort((a, b) => a.localeCompare(b)));
        }
    };

    const handleCountyChange = (event, value) => {
        setCounty(value || "");
        setCity("");
        setCities(ukCounties[value] || []);
    };

    const handleStateChange = (event, value) => {
        setState(value || "");
        setCity("");
        setCities((stateCities.getCities(value) || []).sort((a, b) => a.localeCompare(b)));
    };

    const handleCityChange = (event, value) => {
        setCity(value || "");
    };

    const handleSearch = async () => {
        setLoading(true);
        localStorage.setItem("recentJobSearch", JSON.stringify({
            country, county, state, city, gender, categories, matchOnly
        }));

        try {
            const user = auth.currentUser;
            const userSnap = await getDoc(doc(db, "users", user.uid));
            const model = userSnap.exists() ? userSnap.data() : null;

            const jobRef = collection(db, "jobs");
            // Only query open jobs - this is required for Firestore security rules
            // Jobs with status "open" are publicly browseable by models
            const q = query(jobRef, where("status", "==", "open"));

            const snapshot = await getDocs(q);
            const jobs = [];

            // Get user's applied jobs to check application status
            const appliedJobs = model?.appliedJobs || [];
            const appliedJobRefs = appliedJobs.map(aj => aj.jobReference);

            // Filter jobs first, then check invitations for qualifying jobs
            const qualifyingJobs = [];

            snapshot.forEach((docSnap) => {
                const job = docSnap.data();

                // Location filtering
                if (country) {
                    // Check if job's country matches
                    if (job.country !== country) {
                        return;
                    }

                    // If UK, check county
                    if (country === "United Kingdom" && county) {
                        if (job.county !== county) {
                            return;
                        }
                    }

                    // If US, check state
                    if (country === "United States" && state) {
                        if (job.state !== state) {
                            return;
                        }
                    }

                    // Check city/town
                    if (city) {
                        if (job.city !== city) {
                            return;
                        }
                    }
                }

                const genderMatch =
                    gender.length === 0 || gender.some((g) => job.gender?.includes(g));

                const categoryMatch =
                    categories.length === 0 || categories.some((c) => job.categories?.includes(c));

                if (genderMatch && categoryMatch) {
                    // Calculate if model matches this job using the algorithm
                    const isMatch = doesModelMatchJob(model, job);

                    if (!matchOnly || (matchOnly && isMatch)) {
                        qualifyingJobs.push({ docSnap, job, isMatch });
                    }
                }
            });

            // Check invitation status for all qualifying jobs in parallel
            const invitationChecks = await Promise.all(
                qualifyingJobs.map(async ({ docSnap, job, isMatch }) => {
                    // Check if this model has been invited to this job
                    const invitationRef = doc(db, "jobs", docSnap.id, "invitations", user.uid);
                    const invitationSnap = await getDoc(invitationRef);
                    const isInvited = invitationSnap.exists();

                    // Determine application status for the model
                    const hasApplied = appliedJobRefs.includes(job.reference);

                    return {
                        ...job,
                        applicationStatus: hasApplied ? "Applied" : "Not Applied",
                        isMatch: isMatch,
                        isInvited: isInvited,
                    };
                })
            );

            jobs.push(...invitationChecks);

            // Sort jobs: matches first, then by creation date
            jobs.sort((a, b) => {
                if (a.isMatch && !b.isMatch) return -1;
                if (!a.isMatch && b.isMatch) return 1;
                return (b.createdAt || 0) - (a.createdAt || 0);
            });

            setResults(jobs);
            setFilters({ country, county, state, city, gender, categories });
        } catch (err) {
            console.error("Error searching jobs:", err);
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleClearFilters = () => {
        setCountry("");
        setCounty("");
        setState("");
        setCity("");
        setCities([]);
        setGender([]);
        setCategories([]);
        setMatchOnly(false);
        localStorage.removeItem("recentJobSearch");
    };

    return (
        <Card sx={{ p: 3 }}>
            <MDBox mb={2}>
                <MDTypography variant="h6" fontWeight="medium" color="dark">
                    Find Your Perfect Job
                </MDTypography>
                <MDTypography variant="body2" color="text">
                    Filter jobs by location, gender preferences, and skill categories
                </MDTypography>
            </MDBox>

            <Grid container spacing={2}>
                {/* Country */}
                <Grid item xs={12} sm={6} md={3}>
                    <Autocomplete
                        value={country || ""}
                        options={countries}
                        onChange={handleCountryChange}
                        getOptionDisabled={(option) => option === "────────"}
                        renderOption={(props, option) =>
                            option === "────────" ? (
                                <li {...props} style={{ fontStyle: "italic", opacity: 0.5 }}>
                                    ────────
                                </li>
                            ) : (
                                <li {...props}>{option}</li>
                            )
                        }
                        renderInput={(params) => (
                            <MDInput
                                {...params}
                                label="Country"
                                InputLabelProps={{ shrink: true }}
                            />
                        )}
                    />
                </Grid>

                {/* UK County */}
                {country === "United Kingdom" && (
                    <Grid item xs={12} sm={6} md={3}>
                        <Autocomplete
                            value={county || ""}
                            options={Object.keys(ukCounties)}
                            onChange={handleCountyChange}
                            renderInput={(params) => (
                                <MDInput
                                    {...params}
                                    label="County"
                                    InputLabelProps={{ shrink: true }}
                                />
                            )}
                        />
                    </Grid>
                )}

                {/* US State */}
                {country === "United States" && (
                    <Grid item xs={12} sm={6} md={3}>
                        <Autocomplete
                            value={state || ""}
                            options={stateCities.getStates().sort((a, b) => a.localeCompare(b))}
                            onChange={handleStateChange}
                            renderInput={(params) => (
                                <MDInput
                                    {...params}
                                    label="State"
                                    InputLabelProps={{ shrink: true }}
                                />
                            )}
                        />
                    </Grid>
                )}

                {/* City/Town - shown when UK county or US state is selected, or for other countries */}
                {((country === "United Kingdom" && county) ||
                  (country === "United States" && state) ||
                  (country && country !== "United Kingdom" && country !== "United States")) && (
                    <Grid item xs={12} sm={6} md={3}>
                        <Autocomplete
                            value={city || ""}
                            options={cities}
                            onChange={handleCityChange}
                            renderInput={(params) => (
                                <MDInput
                                    {...params}
                                    label="City/Town"
                                    InputLabelProps={{ shrink: true }}
                                />
                            )}
                        />
                    </Grid>
                )}

                {/* Gender */}
                <Grid item xs={12} sm={6} md={3}>
                    <Autocomplete
                        multiple
                        options={genderOptions}
                        value={gender}
                        onChange={(_, value) => setGender(value)}
                        renderInput={(params) => <MDInput {...params} label="Gender" />}
                    />
                </Grid>

                {/* Categories */}
                <Grid item xs={12} sm={6} md={3}>
                    <Autocomplete
                        multiple
                        options={categoryOptions}
                        value={categories}
                        onChange={(_, value) => setCategories(value)}
                        renderInput={(params) => <MDInput {...params} label="Categories / Skills" />}
                    />
                </Grid>

                {/* Actions Row */}
                <Grid item xs={12}>
                    <MDBox
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                        flexWrap="wrap"
                        gap={2}
                    >
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={matchOnly}
                                    onChange={(e) => setMatchOnly(e.target.checked)}
                                    color="success"
                                />
                            }
                            label={
                                <MDBox display="flex" alignItems="center" gap={0.5}>
                                    <Icon sx={{ color: matchOnly ? "success.main" : "text.secondary" }}>
                                        verified
                                    </Icon>
                                    <MDTypography variant="button" fontWeight="regular" color="text">
                                        Only show jobs I match with
                                    </MDTypography>
                                </MDBox>
                            }
                        />
                        <MDBox display="flex" gap={1}>
                            <MDButton
                                variant="outlined"
                                color="secondary"
                                onClick={handleClearFilters}
                                startIcon={<Icon>clear</Icon>}
                            >
                                Clear
                            </MDButton>
                            <MDButton
                                variant="gradient"
                                color="info"
                                onClick={handleSearch}
                                startIcon={<Icon>search</Icon>}
                            >
                                Search Jobs
                            </MDButton>
                        </MDBox>
                    </MDBox>
                </Grid>
            </Grid>
        </Card>
    );
}

export default JobSearchFilters;
