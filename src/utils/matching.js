export const doesModelMatchJob = (model, job) => {
  if (!model || !job) return false;

  // ✅ At least one gender matches
  const genderMatch =
    job.gender?.length > 0 &&
    model.gender?.length > 0 &&
    job.gender.some((g) => model.gender.includes(g));

  // ✅ At least one category matches
  const categoryMatch =
    job.categories?.some((cat) => model.categories?.includes(cat));

  return genderMatch && categoryMatch;
};
