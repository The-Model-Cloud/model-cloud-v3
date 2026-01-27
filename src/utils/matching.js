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

/**
 * Calculate a match score for a model against a job (0-100)
 * Higher scores indicate better matches
 * @param {object} model - The model to score
 * @param {object} job - The job to match against
 * @returns {object} - { score: number, breakdown: object }
 */
export const calculateMatchScore = (model, job) => {
  if (!model || !job) return { score: 0, breakdown: {} };

  let totalPoints = 0;
  let earnedPoints = 0;
  const breakdown = {};

  // Gender match (required, 20 points)
  totalPoints += 20;
  const genderMatch =
    job.gender?.length > 0 &&
    model.gender?.length > 0 &&
    job.gender.some((g) => model.gender.includes(g));
  if (genderMatch) {
    earnedPoints += 20;
    breakdown.gender = { matched: true, points: 20 };
  } else {
    breakdown.gender = { matched: false, points: 0 };
  }

  // Category match (required, 20 points)
  totalPoints += 20;
  const matchedCategories = job.categories?.filter((cat) =>
    model.categories?.includes(cat)
  ) || [];
  if (matchedCategories.length > 0) {
    earnedPoints += 20;
    breakdown.categories = { matched: true, points: 20, matchedCategories };
  } else {
    breakdown.categories = { matched: false, points: 0, matchedCategories: [] };
  }

  // Height match (15 points if job specifies)
  if (job.minHeight || job.maxHeight) {
    totalPoints += 15;
    const modelHeight = Number(model.height);
    const minHeight = Number(job.minHeight) || 0;
    const maxHeight = Number(job.maxHeight) || 999;
    if (modelHeight && modelHeight >= minHeight && modelHeight <= maxHeight) {
      earnedPoints += 15;
      breakdown.height = { matched: true, points: 15 };
    } else {
      breakdown.height = { matched: false, points: 0 };
    }
  }

  // Weight match (10 points if job specifies)
  if (job.minWeight || job.maxWeight) {
    totalPoints += 10;
    const modelWeight = Number(model.weight);
    const minWeight = Number(job.minWeight) || 0;
    const maxWeight = Number(job.maxWeight) || 999;
    if (modelWeight && modelWeight >= minWeight && modelWeight <= maxWeight) {
      earnedPoints += 10;
      breakdown.weight = { matched: true, points: 10 };
    } else {
      breakdown.weight = { matched: false, points: 0 };
    }
  }

  // Eye colour match (5 points if job specifies)
  if (job.eyeColour?.length > 0) {
    totalPoints += 5;
    if (model.eyeColour && job.eyeColour.includes(model.eyeColour)) {
      earnedPoints += 5;
      breakdown.eyeColour = { matched: true, points: 5 };
    } else {
      breakdown.eyeColour = { matched: false, points: 0 };
    }
  }

  // Hair colour match (5 points if job specifies)
  if (job.hairColour?.length > 0) {
    totalPoints += 5;
    if (model.hairColour && job.hairColour.includes(model.hairColour)) {
      earnedPoints += 5;
      breakdown.hairColour = { matched: true, points: 5 };
    } else {
      breakdown.hairColour = { matched: false, points: 0 };
    }
  }

  // Dress size match (5 points if job specifies)
  if (job.dressSize?.length > 0) {
    totalPoints += 5;
    if (model.dressSize && job.dressSize.includes(model.dressSize)) {
      earnedPoints += 5;
      breakdown.dressSize = { matched: true, points: 5 };
    } else {
      breakdown.dressSize = { matched: false, points: 0 };
    }
  }

  // Shoe size match (5 points if job specifies)
  if (job.shoeSize?.length > 0) {
    totalPoints += 5;
    if (model.shoeSize && job.shoeSize.includes(model.shoeSize)) {
      earnedPoints += 5;
      breakdown.shoeSize = { matched: true, points: 5 };
    } else {
      breakdown.shoeSize = { matched: false, points: 0 };
    }
  }

  // Location match (10 points bonus if same city/country)
  totalPoints += 10;
  const sameCity = model.city && job.city && model.city.toLowerCase() === job.city.toLowerCase();
  const sameCountry = model.country && job.country && model.country.toLowerCase() === job.country.toLowerCase();
  if (sameCity) {
    earnedPoints += 10;
    breakdown.location = { matched: true, points: 10, type: "city" };
  } else if (sameCountry) {
    earnedPoints += 5;
    breakdown.location = { matched: true, points: 5, type: "country" };
  } else {
    breakdown.location = { matched: false, points: 0 };
  }

  const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

  return { score, breakdown, earnedPoints, totalPoints };
};

/**
 * Get all models that match a job's basic requirements
 * @param {array} models - Array of model objects
 * @param {object} job - The job to match against
 * @param {object} options - Options for filtering
 * @returns {array} - Sorted array of matching models with scores
 */
export const getMatchingModels = (models, job, options = {}) => {
  const { excludeApplicants = [], excludeInvited = [], minScore = 0 } = options;

  return models
    .filter((model) => {
      // Must pass basic matching criteria
      if (!doesModelMatchJob(model, job)) return false;
      // Exclude models who have already applied
      if (excludeApplicants.includes(model.uid)) return false;
      return true;
    })
    .map((model) => {
      const { score, breakdown } = calculateMatchScore(model, job);
      const wasInvited = excludeInvited.includes(model.uid);
      return { ...model, matchScore: score, matchBreakdown: breakdown, wasInvited };
    })
    .filter((model) => model.matchScore >= minScore)
    .sort((a, b) => b.matchScore - a.matchScore);
};
