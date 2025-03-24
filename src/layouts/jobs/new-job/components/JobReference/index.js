import React, { useEffect, useState } from "react";

// Function to generate the job reference based on current timestamp
const generateJobReference = () => {
    const today = new Date();
    const formattedDate = today.toISOString().split("T")[0].replace(/-/g, "");
    const hours = today.getHours().toString().padStart(2, "0");
    const minutes = today.getMinutes().toString().padStart(2, "0");
    const seconds = today.getSeconds().toString().padStart(2, "0");
    const milliseconds = today.getMilliseconds().toString().padStart(3, "0");
    const random = seconds + milliseconds; // Add randomness for uniqueness
    return `TMC-${formattedDate}-${hours}${minutes}${random}`;
  };
  

const JobReference = ({ setJobRef }) => {
  const [jobReference, setJobReference] = useState("");

  useEffect(() => {
    if (!jobReference) {
      const newJobReference = generateJobReference();
      setJobReference(newJobReference);
      setJobRef(newJobReference);
    }
  }, [jobReference, setJobRef]);
  
  return <span>{jobReference}</span>; // Display the job reference if needed
};

export default JobReference;


