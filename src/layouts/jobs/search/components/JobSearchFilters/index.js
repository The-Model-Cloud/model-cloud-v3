import { useState, useEffect } from "react";
import { collection, query, where, getDocs, getDoc, doc } from "firebase/firestore";
import { auth, db } from "config/firebase";
import Grid from "@mui/material/Grid";
import MDBox from "components/MDBox";
import MDInput from "components/MDInput";
import MDButton from "components/MDButton";
import Autocomplete from "@mui/material/Autocomplete";

import { doesModelMatchJob } from "utils/matching";

import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";

import selectData from "layouts/pages/account/settings/components/BasicInfo/data/selectData";

const genderOptions = selectData.gender;
const categoryOptions = selectData.skills;

function JobSearchFilters({ setFilters, setResults, setLoading }) {
    const [location, setLocation] = useState("");
    const [gender, setGender] = useState([]);
    const [categories, setCategories] = useState([]);
    const [matchOnly, setMatchOnly] = useState(false);

    const handleSearch = async () => {
        setLoading(true);
        localStorage.setItem("recentJobSearch", JSON.stringify({ location, gender, categories, matchOnly }));

        const user = auth.currentUser;
        const userSnap = await getDoc(doc(db, "users", user.uid));
        const model = userSnap.exists() ? userSnap.data() : null;

        const jobRef = collection(db, "jobs");
        let q = query(jobRef);

        // You can expand this to use multiple Firestore filters
        if (location) {
            q = query(q, where("location", "==", location));
        }

        const snapshot = await getDocs(q);
        const jobs = [];

        // Get user's applied jobs to check application status
        const appliedJobs = model?.appliedJobs || [];
        const appliedJobRefs = appliedJobs.map(aj => aj.jobReference);

        snapshot.forEach((doc) => {
            const job = doc.data();

            // Filter out closed jobs - they shouldn't appear in search
            if (job.status?.toLowerCase() === "closed") {
                return;
            }

            const genderMatch =
                gender.length === 0 || gender.some((g) => job.gender?.includes(g));

            const categoryMatch =
                categories.length === 0 || categories.some((c) => job.categories?.includes(c));

            if (genderMatch && categoryMatch) {
                if (!matchOnly || (matchOnly && doesModelMatchJob(model, job))) {
                    // Determine application status for the model
                    const hasApplied = appliedJobRefs.includes(job.reference);
                    jobs.push({
                        ...job,
                        applicationStatus: hasApplied ? "Applied" : "Not Applied",
                    });
                }
            }
        });

        setResults(jobs);
        setFilters({ location, gender, categories });
        setLoading(false);
    };

    useEffect(() => {
        const cached = localStorage.getItem("recentJobSearch");
        if (cached) {
            const { location, gender, categories, matchOnly } = JSON.parse(cached);
            setLocation(location || "");
            setGender(gender || []);
            setCategories(categories || []);
            setMatchOnly(matchOnly || false);
        }
    }, []);


    return (
        <MDBox mb={3}>
            <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                    <MDInput
                        label="Location"
                        fullWidth
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                    />
                </Grid>

                <Grid item xs={12} sm={4}>
                    <Autocomplete
                        multiple
                        options={genderOptions}
                        value={gender}
                        onChange={(_, value) => setGender(value)}
                        renderInput={(params) => <MDInput {...params} label="Gender" />}
                    />
                </Grid>

                <Grid item xs={12} sm={4}>
                    <Autocomplete
                        multiple
                        options={categoryOptions}
                        value={categories}
                        onChange={(_, value) => setCategories(value)}
                        renderInput={(params) => <MDInput {...params} label="Categories" />}
                    />
                </Grid>

                <Grid item xs={12} textAlign="right">
                    <FormControlLabel
                        control={<Switch checked={matchOnly} onChange={(e) => setMatchOnly(e.target.checked)} />}
                        label="Only show jobs I match with"
                    />
                    <MDButton color="info" onClick={handleSearch}>
                        Search Jobs
                    </MDButton>
                </Grid>
            </Grid>
        </MDBox>
    );
}

export default JobSearchFilters;
