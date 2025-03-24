export const doesModelMatchJob = (model, job) => {
    if (!model || !job) return false;
  
    // ✅ Exact gender match (must match at least one)
    const genderMatch =
      job.gender?.length > 0 && model.gender?.length > 0 &&
      job.gender.every((g) => model.gender.includes(g));
  
    // ✅ Partial category match (intersection)
    const categoryMatch =
      job.categories?.some((cat) => model.categories?.includes(cat));
  
    return genderMatch && categoryMatch;
  };
  