#!/usr/bin/env node
/**
 * Seed 110 demo jobs on The Model Cloud platform.
 *
 * All jobs are attributed to info@themodel.cloud and tagged with isSeedData: true
 * so they can be identified and removed at any time.
 *
 * Usage (from the /functions directory):
 *   node seed-jobs.js          → seed 110 jobs
 *   node seed-jobs.js --clear  → delete all seed jobs
 *
 * Credentials:
 *   Option A (recommended): firebase login, then set application default creds:
 *     npx firebase-tools login
 *     gcloud auth application-default login  (if gcloud installed)
 *
 *   Option B: Download a service account key from Firebase Console →
 *     Project Settings → Service Accounts → Generate new private key
 *     Save as functions/service-account.json
 *     The script will pick it up automatically.
 */

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

// ─── Initialise Firebase Admin ────────────────────────────────────────────────
const PROJECT_ID = "model-cloud";

if (!admin.apps.length) {
  const serviceAccountPath = path.join(__dirname, "service-account.json");

  if (fs.existsSync(serviceAccountPath)) {
    // Option A: local service-account.json (download from Firebase Console →
    //   Project Settings → Service Accounts → Generate new private key)
    admin.initializeApp({
      credential: admin.credential.cert(require(serviceAccountPath)),
      projectId: PROJECT_ID,
    });
    console.log("Using service-account.json credentials.");

  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // Option B: GOOGLE_APPLICATION_CREDENTIALS env var pointing to a key file
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: PROJECT_ID,
    });
    console.log(`Using GOOGLE_APPLICATION_CREDENTIALS: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);

  } else {
    console.error(`
ERROR: No Firebase credentials found.

To run this script you need one of:

  Option A (easiest) — Download a service account key:
    1. Go to Firebase Console → Project Settings → Service Accounts
    2. Click "Generate new private key"
    3. Save the file as:  functions/service-account.json
    4. Re-run: node seed-jobs.js

  Option B — Use gcloud Application Default Credentials:
    gcloud auth application-default login
    (requires Google Cloud SDK: https://cloud.google.com/sdk/docs/install)

  Option C — Set GOOGLE_APPLICATION_CREDENTIALS env var:
    $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\\path\\to\\service-account.json"
    node seed-jobs.js
`);
    process.exit(1);
  }
}

const db = admin.firestore();
const SEED_CLIENT_EMAIL = "info@themodel.cloud";

// ─── Locations ────────────────────────────────────────────────────────────────
const LOCATIONS = [
  { country: "United Kingdom", county: "Greater London",       city: "London" },
  { country: "United Kingdom", county: "Greater Manchester",   city: "Manchester" },
  { country: "United Kingdom", county: "West Midlands",        city: "Birmingham" },
  { country: "United Kingdom", county: "West Yorkshire",       city: "Leeds" },
  { country: "United Kingdom", county: "Lanarkshire",          city: "Glasgow" },
  { country: "United Kingdom", county: "Merseyside",           city: "Liverpool" },
  { country: "United Kingdom", county: "City of Bristol",      city: "Bristol" },
  { country: "United Kingdom", county: "South Yorkshire",      city: "Sheffield" },
  { country: "United Kingdom", county: "City of Edinburgh",    city: "Edinburgh" },
  { country: "United Kingdom", county: "South Glamorgan",      city: "Cardiff" },
  { country: "United Kingdom", county: "Tyne and Wear",        city: "Newcastle" },
  { country: "United Kingdom", county: "Nottinghamshire",      city: "Nottingham" },
  { country: "United Kingdom", county: "Hampshire",            city: "Southampton" },
  { country: "United Kingdom", county: "East Sussex",          city: "Brighton" },
  { country: "United Kingdom", county: "Oxfordshire",          city: "Oxford" },
  { country: "United Kingdom", county: "Cambridgeshire",       city: "Cambridge" },
  { country: "United Kingdom", county: "Leicestershire",       city: "Leicester" },
  { country: "United Kingdom", county: "North Yorkshire",      city: "York" },
  { country: "United Kingdom", county: "Somerset",             city: "Bath" },
  { country: "United Kingdom", county: "Norfolk",              city: "Norwich" },
  { country: "United Kingdom", county: "Berkshire",            city: "Reading" },
  { country: "United Kingdom", county: "County Antrim",        city: "Belfast" },
  { country: "United Kingdom", county: "Devon",                city: "Exeter" },
  { country: "United Kingdom", county: "West Sussex",          city: "Worthing" },
  { country: "United Kingdom", county: "Cheshire",             city: "Chester" },
  { country: "Ireland",                                         city: "Dublin" },
  { country: "United States",  state: "New York",              city: "New York" },
  { country: "France",                                          city: "Paris" },
  { country: "Netherlands",                                     city: "Amsterdam" },
  { country: "United Arab Emirates",                            city: "Dubai" },
];

// ─── Job Templates ────────────────────────────────────────────────────────────
const TEMPLATES = [
  // ── FASHION / EDITORIAL ───────────────────────────────────────────────────
  {
    title: "SS26 Fashion Week Editorial Casting",
    description: "<p>We are seeking exceptional editorial models for our SS26 Fashion Week casting. This is an exciting opportunity to work with renowned photographers and stylists for a high-profile editorial feature.</p><p>Previous editorial experience preferred but not essential. Full hair, makeup and styling provided on the day.</p>",
    usage: "<p>Images for editorial print and digital publication for 12 months. No exclusivity required.</p>",
    jobType: ["Casting"],
    gender: ["Woman"],
    categories: ["Editorial/Commercial"],
    budget: 500, currency: "GBP", rateType: "Flat Fee", qty: "5",
    minHeight: 170, maxHeight: 182, dressSize: ["8", "10"],
  },
  {
    title: "Luxury Fashion Brand AW26 Campaign",
    description: "<p>A prestigious luxury fashion house is seeking models for their AW26 global campaign. Full creative team on set — hair, makeup, styling all provided. Two-day shoot in a stunning studio location.</p>",
    usage: "<p>Global print, digital and out-of-home advertising for 24 months.</p>",
    jobType: ["Photoshoot"],
    gender: ["Woman"],
    categories: ["Editorial/Commercial"],
    budget: 1500, currency: "GBP", rateType: "Per Day", qty: "3",
    minHeight: 172, maxHeight: 182, dressSize: ["8", "10"],
  },
  {
    title: "Street Style Lookbook — Emerging Designer",
    description: "<p>An exciting emerging UK designer needs fresh faces for their debut lookbook. The aesthetic is contemporary street style with a bold artistic edge. Great portfolio opportunity with a brand rapidly gaining industry recognition.</p>",
    usage: "<p>Brand website, social media and press for 12 months.</p>",
    jobType: ["Photoshoot"],
    gender: ["Woman", "Man"],
    categories: ["Editorial/Commercial"],
    budget: 300, currency: "GBP", rateType: "Flat Fee", qty: "4",
  },
  {
    title: "High Fashion Magazine Editorial",
    description: "<p>A leading fashion magazine needs striking models for an upcoming editorial spread. We want individuals who bring character and personality to the camera. Shoot expected to last one full day — all styling provided.</p>",
    usage: "<p>Editorial use — print magazine and online digital edition for 6 months.</p>",
    jobType: ["Photoshoot"],
    gender: ["Woman"],
    categories: ["Editorial/Commercial"],
    budget: 750, currency: "GBP", rateType: "Flat Fee", qty: "2",
    minHeight: 168, maxHeight: 182,
  },
  {
    title: "Avant-Garde Fashion Film Production",
    description: "<p>An internationally recognised fashion director is producing an avant-garde fashion film exploring identity and sustainability. Seeking bold, expressive models comfortable with artistic direction and movement.</p>",
    usage: "<p>International fashion film festivals and brand promotion for 18 months.</p>",
    jobType: ["Video Shoot"],
    gender: ["Woman", "Man", "Non-binary person"],
    categories: ["Editorial/Commercial"],
    budget: 2000, currency: "GBP", rateType: "Flat Fee", qty: "6",
  },
  {
    title: "Autumn/Winter Knitwear Collection Shoot",
    description: "<p>An established British knitwear brand needs models for their AW collection. Warm lifestyle feel, shot in a stunning country house setting. All clothing provided on the day.</p>",
    usage: "<p>E-commerce, social media and seasonal print catalogue for 6 months.</p>",
    jobType: ["Photoshoot"],
    gender: ["Woman", "Man"],
    categories: ["Editorial/Commercial"],
    budget: 550, currency: "GBP", rateType: "Flat Fee", qty: "4",
  },
  {
    title: "Paris Fashion Week Showroom Model",
    description: "<p>A Parisian fashion house is looking for showroom models for Paris Fashion Week presentations. You will wear the collection during private buyer appointments and press viewings over 4 days. Accommodation and travel provided.</p>",
    usage: "<p>Showroom only — no photography.</p>",
    jobType: ["Event"],
    gender: ["Woman"],
    categories: ["Editorial/Commercial"],
    budget: 3000, currency: "EUR", rateType: "Flat Fee", qty: "6",
    minHeight: 175, maxHeight: 182, dressSize: ["6", "8"],
  },

  // ── FITNESS / ACTIVEWEAR ──────────────────────────────────────────────────
  {
    title: "Premium Activewear Brand Campaign",
    description: "<p>A leading premium activewear brand is shooting their new seasonal collection. Looking for athletic, toned models who can showcase performance wear authentically in both studio and outdoor locations.</p>",
    usage: "<p>Global e-commerce, social media and print for 12 months.</p>",
    jobType: ["Photoshoot"],
    gender: ["Woman"],
    categories: ["Fitness", "Athlete"],
    budget: 1000, currency: "GBP", rateType: "Per Day", qty: "3",
    minHeight: 165, maxHeight: 178,
  },
  {
    title: "Men's Gym Wear Lookbook",
    description: "<p>A fast-growing men's gym wear brand needs athletic male models for their new lookbook. Covering gym, outdoor and urban contexts — models should have a genuinely athletic physique and feel confident in activewear.</p>",
    usage: "<p>Digital and print across brand's owned channels for 12 months.</p>",
    jobType: ["Photoshoot"],
    gender: ["Man"],
    categories: ["Fitness", "Athlete"],
    budget: 800, currency: "GBP", rateType: "Flat Fee", qty: "4",
    minHeight: 178, maxHeight: 192,
  },
  {
    title: "Fitness Studio Promotional Video",
    description: "<p>An upscale fitness studio chain is producing a promo video for new location launches. Looking for energetic, fitness-focused models for group workout scenes and testimonial segments.</p>",
    usage: "<p>Website, social media and paid advertising for 24 months.</p>",
    jobType: ["Video Shoot"],
    gender: ["Woman", "Man"],
    categories: ["Fitness", "Qualified Personal Trainer"],
    budget: 600, currency: "GBP", rateType: "Flat Fee", qty: "8",
  },
  {
    title: "Sports Nutrition Brand Product Shoot",
    description: "<p>A top sports nutrition brand is launching a new product range and needs models with a genuinely athletic physique. Dynamic lifestyle settings showcasing protein shakes, energy bars and supplements.</p>",
    usage: "<p>Product packaging, website and social media for 18 months.</p>",
    jobType: ["Photoshoot"],
    gender: ["Man"],
    categories: ["Athlete", "Fitness"],
    budget: 700, currency: "GBP", rateType: "Flat Fee", qty: "2",
    minHeight: 180, maxHeight: 195,
  },
  {
    title: "Yoga & Wellness Brand Campaign",
    description: "<p>A holistic wellness brand is shooting content for their yoga and mindfulness range. Looking for models with genuine yoga experience who can hold poses and project calm, authentic energy.</p>",
    usage: "<p>Website, app, social media and email marketing for 12 months.</p>",
    jobType: ["Photoshoot"],
    gender: ["Woman"],
    categories: ["Yoga", "Fitness"],
    budget: 550, currency: "GBP", rateType: "Flat Fee", qty: "3",
  },
  {
    title: "Gym & Supplement Brand Regional Tour",
    description: "<p>A growing supplement brand is running a promotional tour across major UK cities. Looking for fitness-focused, sociable models to visit gyms, engage with members and demonstrate products. Travel expenses covered.</p>",
    usage: "<p>Brand social media for 6 months.</p>",
    jobType: ["Promotion"],
    gender: ["Woman", "Man"],
    categories: ["Fitness", "Qualified Personal Trainer"],
    budget: 175, currency: "GBP", rateType: "Per Day", qty: "3",
  },
  {
    title: "Sports Retailer Seasonal Campaign",
    description: "<p>A major sports retailer is shooting their seasonal campaign across running, football, cycling and yoga. Looking for models who are genuinely active in one or more of these disciplines.</p>",
    usage: "<p>In-store, website and national advertising for 6 months.</p>",
    jobType: ["Photoshoot"],
    gender: ["Woman", "Man"],
    categories: ["Athlete", "Fitness"],
    budget: 1200, currency: "GBP", rateType: "Per Day", qty: "6",
  },
  {
    title: "Marathon & Running Brand Outdoor Shoot",
    description: "<p>A running shoe and apparel brand needs authentic runner models — ideally actual marathon runners or serious recreational runners. Shoot takes place on real outdoor routes. High energy and natural running form essential.</p>",
    usage: "<p>Brand website, social media and print for 12 months.</p>",
    jobType: ["Photoshoot"],
    gender: ["Woman", "Man"],
    categories: ["Athlete"],
    budget: 700, currency: "GBP", rateType: "Flat Fee", qty: "4",
  },
  {
    title: "Football Club Season Strip Launch",
    description: "<p>A professional football club needs models for the launch of their new season strip. Shoot takes place at the club's stadium with professional sports photographers.</p>",
    usage: "<p>Match day programmes, website, social media and advertising boards for 12 months.</p>",
    jobType: ["Photoshoot"],
    gender: ["Man"],
    categories: ["Athlete", "Fitness"],
    budget: 500, currency: "GBP", rateType: "Flat Fee", qty: "5",
    minHeight: 175, maxHeight: 195,
  },

  // ── COMMERCIAL / LIFESTYLE ────────────────────────────────────────────────
  {
    title: "Lifestyle App National Campaign",
    description: "<p>A consumer lifestyle app is looking for relatable, real-looking models for their national advertising campaign. The concept celebrates everyday life — we need warm, approachable individuals of varied backgrounds and ages.</p>",
    usage: "<p>App store, digital advertising and social media for 12 months.</p>",
    jobType: ["Photoshoot"],
    gender: ["Woman", "Man"],
    categories: ["Editorial/Commercial"],
    budget: 450, currency: "GBP", rateType: "Flat Fee", qty: "6",
  },
  {
    title: "E-Commerce Fashion Catalogue",
    description: "<p>An established online fashion retailer needs models for a new season catalogue. High-volume shoot covering 100+ outfits over multiple days. Professional, reliable models with previous e-commerce experience preferred.</p>",
    usage: "<p>E-commerce website and email marketing for 6 months.</p>",
    jobType: ["Photoshoot"],
    gender: ["Woman"],
    categories: ["Editorial/Commercial"],
    budget: 900, currency: "GBP", rateType: "Per Day", qty: "3",
    dressSize: ["8", "10", "12"],
  },
  {
    title: "Insurance Brand TV Commercial Casting",
    description: "<p>A major UK insurance brand is casting for a national TV commercial. Looking for natural, believable actors/models to portray a family in everyday domestic situations. Non-speaking roles, direction provided on set.</p>",
    usage: "<p>UK television broadcast and digital for 12 months.</p>",
    jobType: ["Video Shoot", "Casting"],
    gender: ["Woman", "Man"],
    categories: ["Editorial/Commercial"],
    budget: 2500, currency: "GBP", rateType: "Flat Fee", qty: "4",
  },
  {
    title: "Home Interiors Brand Campaign",
    description: "<p>A premium home interiors brand is shooting their new collection in a stunning show home. Need models who can style naturally within a domestic environment — couple shots, family scenes and individual lifestyle images.</p>",
    usage: "<p>Print catalogue, website and social media for 12 months.</p>",
    jobType: ["Photoshoot"],
    gender: ["Woman", "Man"],
    categories: ["Editorial/Commercial"],
    budget: 600, currency: "GBP", rateType: "Per Day", qty: "4",
  },
  {
    title: "Food & Drink Brand Lifestyle Shoot",
    description: "<p>A premium food and drink brand is looking for models to feature in a lifestyle campaign showcasing their products in social, outdoor and home settings. Natural smiles and genuine enjoyment are key.</p>",
    usage: "<p>Social media, website and point-of-sale materials for 12 months.</p>",
    jobType: ["Photoshoot"],
    gender: ["Woman", "Man"],
    categories: ["Influencer"],
    budget: 500, currency: "GBP", rateType: "Flat Fee", qty: "5",
  },
  {
    title: "Banking App Empowerment Campaign",
    description: "<p>A digital banking app is shooting a campaign celebrating financial empowerment across all demographics. Looking for diverse models of varied ages and backgrounds who can project confidence and aspiration.</p>",
    usage: "<p>National digital advertising, social media and app store for 12 months.</p>",
    jobType: ["Photoshoot"],
    gender: ["Woman", "Man"],
    categories: ["Editorial/Commercial"],
    budget: 800, currency: "GBP", rateType: "Flat Fee", qty: "8",
  },
  {
    title: "University Open Day Promotional Video",
    description: "<p>A leading UK university is producing a promotional video for open days and international recruitment. Looking for students or young-looking models aged 18–25 to authentically represent campus life.</p>",
    usage: "<p>University website, prospectus and international recruitment for 3 years.</p>",
    jobType: ["Video Shoot"],
    gender: ["Woman", "Man"],
    categories: ["Editorial/Commercial"],
    budget: 300, currency: "GBP", rateType: "Flat Fee", qty: "8",
  },
  {
    title: "Children's Clothing Brand — Parent Models",
    description: "<p>A popular children's clothing brand is looking for parent models — ideally with children aged 2–10 available to shoot together. Authentic family moments and natural interactions are the focus.</p>",
    usage: "<p>E-commerce, social media and print catalogue for 12 months.</p>",
    jobType: ["Photoshoot"],
    gender: ["Woman", "Man"],
    categories: ["Editorial/Commercial"],
    budget: 500, currency: "GBP", rateType: "Flat Fee", qty: "4",
  },
  {
    title: "Men's Grooming Brand Campaign",
    description: "<p>A leading men's grooming brand is launching a new product range. Needs masculine, well-groomed male models for face, hair and body product shots. Close-up and three-quarter shots required.</p>",
    usage: "<p>UK and European digital, retail and print for 12 months.</p>",
    jobType: ["Photoshoot"],
    gender: ["Man"],
    categories: ["Editorial/Commercial"],
    budget: 900, currency: "GBP", rateType: "Flat Fee", qty: "3",
  },
  {
    title: "Dental Brand Smile Campaign",
    description: "<p>A dental health brand is looking for models with genuinely great smiles for their new whitening product campaign. Close-up smiling shots and lifestyle imagery. Comfortable with dental close-up photography essential.</p>",
    usage: "<p>UK digital, in-pharmacy and social media for 12 months.</p>",
    jobType: ["Photoshoot"],
    gender: ["Woman", "Man"],
    categories: ["Editorial/Commercial"],
    budget: 600, currency: "GBP", rateType: "Flat Fee", qty: "4",
  },
  {
    title: "Jewellery Collection Lookbook",
    description: "<p>An independent fine jewellery brand needs beauty models for their new collection lookbook. Hand, neck and ear shots are the primary focus. Beautiful hands and defined bone structure are essential.</p>",
    usage: "<p>E-commerce website and social media for 12 months.</p>",
    jobType: ["Photoshoot"],
    gender: ["Woman"],
    categories: ["Editorial/Commercial"],
    budget: 400, currency: "GBP", rateType: "Flat Fee", qty: "3",
  },
  {
    title: "Mature Model — Luxury Skincare Campaign",
    description: "<p>A luxury skincare brand is celebrating natural ageing with a campaign featuring models aged 45+. Looking for confident, elegant models who embody grace and sophistication. High-profile global production.</p>",
    usage: "<p>Global digital and print for 24 months.</p>",
    jobType: ["Photoshoot"],
    gender: ["Woman"],
    categories: ["Editorial/Commercial"],
    budget: 1500, currency: "GBP", rateType: "Flat Fee", qty: "3",
  },

  // ── CURVE / INCLUSIVE ─────────────────────────────────────────────────────
  {
    title: "Inclusive Fashion Brand Campaign",
    description: "<p>A pioneering inclusive fashion brand is shooting their new collection celebrating bodies of all shapes and sizes. Specifically need curve and plus-size models who are confident, expressive and passionate about inclusive fashion.</p>",
    usage: "<p>Website, social media and print for 18 months.</p>",
    jobType: ["Photoshoot"],
    gender: ["Woman"],
    categories: ["Curve", "Editorial/Commercial"],
    budget: 800, currency: "GBP", rateType: "Flat Fee", qty: "5",
    dressSize: ["14", "16", "18", "20"],
  },
  {
    title: "Plus-Size Swimwear Collection",
    description: "<p>A body-positive swimwear brand is shooting their summer collection. Looking for confident, curves-celebrating models who love the water and can shoot in swimwear with energy and positivity.</p>",
    usage: "<p>E-commerce and social media for 12 months.</p>",
    jobType: ["Photoshoot"],
    gender: ["Woman"],
    categories: ["Curve"],
    budget: 700, currency: "GBP", rateType: "Flat Fee", qty: "4",
    dressSize: ["16", "18", "20"],
  },
  {
    title: "Diversity Campaign — All Bodies Welcome",
    description: "<p>A well-known UK retailer is launching a diversity and inclusion campaign celebrating all bodies, ethnicities and abilities. Seeking models of all sizes, backgrounds and abilities who want to be part of a powerful, positive message.</p>",
    usage: "<p>National out-of-home advertising, digital and social media for 12 months.</p>",
    jobType: ["Photoshoot"],
    gender: ["Woman", "Man", "Non-binary person"],
    categories: ["Curve", "Petite", "Disabled", "Editorial/Commercial"],
    budget: 1200, currency: "GBP", rateType: "Flat Fee", qty: "8",
  },
  {
    title: "Hospital Charity Annual Report Shoot",
    description: "<p>A hospital charity needs diverse models to represent patients, carers and medical professionals for their annual report and fundraising materials. A meaningful project with genuine social impact.</p>",
    usage: "<p>Annual report, website and fundraising materials for 2 years.</p>",
    jobType: ["Photoshoot"],
    gender: ["Woman", "Man"],
    categories: ["Editorial/Commercial", "Disabled"],
    budget: 350, currency: "GBP", rateType: "Flat Fee", qty: "6",
  },
  {
    title: "Petite Fashion Brand Lookbook",
    description: "<p>A petite fashion brand (specialising in styles for heights 5'3\" and under) is shooting their new collection. Models must be 5'3\" or under with a petite frame. Previous petite or high-street modelling experience preferred.</p>",
    usage: "<p>E-commerce website and social media for 12 months.</p>",
    jobType: ["Photoshoot"],
    gender: ["Woman"],
    categories: ["Petite", "Editorial/Commercial"],
    budget: 600, currency: "GBP", rateType: "Flat Fee", qty: "3",
    maxHeight: 160, dressSize: ["6", "8", "10"],
  },
  {
    title: "Inclusive Brand — Disability Representation",
    description: "<p>A forward-thinking retailer is committed to inclusive representation in all their marketing. Specifically seeking models with visible disabilities who want to be part of a powerful campaign celebrating ability and diversity.</p>",
    usage: "<p>National press, website and social media for 12 months.</p>",
    jobType: ["Photoshoot"],
    gender: ["Woman", "Man"],
    categories: ["Disabled", "Editorial/Commercial"],
    budget: 1000, currency: "GBP", rateType: "Flat Fee", qty: "5",
  },

  // ── BEAUTY ────────────────────────────────────────────────────────────────
  {
    title: "Luxury Beauty Brand Skincare Campaign",
    description: "<p>A world-renowned luxury beauty house is shooting content for their new skincare range. Need models with exceptional skin who can project elegance and sophistication. Beauty close-ups required throughout the day.</p>",
    usage: "<p>Global digital, print and TV advertising for 24 months.</p>",
    jobType: ["Photoshoot"],
    gender: ["Woman"],
    categories: ["Editorial/Commercial"],
    budget: 2000, currency: "GBP", rateType: "Flat Fee", qty: "2",
    minHeight: 168, hairColour: ["Blonde", "Brunette"],
  },
  {
    title: "Makeup Artist Portfolio — Collaborative Shoot",
    description: "<p>A talented independent makeup artist is building their professional portfolio and looking for collaborative models for a creative shoot. Great portfolio opportunity — images shared across both parties' social media.</p>",
    usage: "<p>Portfolio and social media use for both model and MUA.</p>",
    jobType: ["Photoshoot"],
    gender: ["Woman"],
    categories: ["Editorial/Commercial"],
    budget: 50, currency: "GBP", rateType: "Flat Fee", qty: "3",
  },
  {
    title: "Haircare Brand Product Launch",
    description: "<p>A leading professional haircare brand is launching a new product range and needs models with specific hair types. Studio and lifestyle shots across one day covering a range of hair textures and colours.</p>",
    usage: "<p>UK and European advertising — digital, print and in-salon for 12 months.</p>",
    jobType: ["Photoshoot"],
    gender: ["Woman"],
    categories: ["Editorial/Commercial"],
    budget: 800, currency: "GBP", rateType: "Flat Fee", qty: "4",
    hairColour: ["Blonde", "Brunette", "Black", "Red"],
  },

  // ── WELLNESS ──────────────────────────────────────────────────────────────
  {
    title: "Mindfulness App Video Campaign",
    description: "<p>A leading mindfulness and meditation app is shooting video content for their new feature launch. Looking for calm, serene models who can authentically portray meditation, breathing exercises and digital wellbeing moments.</p>",
    usage: "<p>App onboarding, digital advertising and social media for 18 months.</p>",
    jobType: ["Video Shoot"],
    gender: ["Woman", "Man"],
    categories: ["Yoga"],
    budget: 800, currency: "GBP", rateType: "Flat Fee", qty: "4",
  },
  {
    title: "Spa & Wellness Centre Promotional Shoot",
    description: "<p>A luxury spa and wellness retreat needs lifestyle photography to showcase their treatments and facilities. Models photographed enjoying treatments, relaxation areas and the grounds. Polished, professional look required.</p>",
    usage: "<p>Website, brochure and social media for 24 months.</p>",
    jobType: ["Photoshoot"],
    gender: ["Woman"],
    categories: ["Editorial/Commercial"],
    budget: 450, currency: "GBP", rateType: "Flat Fee", qty: "3",
  },

  // ── EVENTS ────────────────────────────────────────────────────────────────
  {
    title: "Brand Activation — Shopping Centre",
    description: "<p>A consumer brand is running a 3-day activation in a major shopping centre. Looking for enthusiastic, outgoing models to engage with the public, demonstrate the product and create social media content live on the day.</p>",
    usage: "<p>Brand social media for the campaign duration.</p>",
    jobType: ["Event", "Promotion"],
    gender: ["Woman", "Man"],
    categories: ["Influencer"],
    budget: 200, currency: "GBP", rateType: "Per Day", qty: "6",
  },
  {
    title: "Fashion Show Runway Models",
    description: "<p>A mid-sized fashion brand is holding a runway show as part of their seasonal collection launch. Previous catwalk experience essential. Fittings required the day before the show.</p>",
    usage: "<p>Event photography and video for brand website and social media.</p>",
    jobType: ["Event"],
    gender: ["Woman"],
    categories: ["Editorial/Commercial"],
    budget: 350, currency: "GBP", rateType: "Flat Fee", qty: "10",
    minHeight: 172, maxHeight: 182,
  },
  {
    title: "Corporate Awards Ceremony Hosts",
    description: "<p>A corporate events company requires professional, presentable models to host a prestigious awards ceremony. Role includes greeting guests, directing attendees and presenting on stage. Excellent presentation skills essential.</p>",
    usage: "<p>Event images for client's internal communications only.</p>",
    jobType: ["Event"],
    gender: ["Woman", "Man"],
    categories: ["Editorial/Commercial"],
    budget: 250, currency: "GBP", rateType: "Flat Fee", qty: "4",
    minHeight: 168,
  },
  {
    title: "Charity Gala Evening",
    description: "<p>A prestigious charity gala is seeking elegant, professional models to assist at their black-tie fundraising evening. You will represent the charity, engage with high-profile donors and assist with the charity auction.</p>",
    usage: "<p>Photography for charity's annual report and press release.</p>",
    jobType: ["Event"],
    gender: ["Woman", "Man"],
    categories: ["Editorial/Commercial"],
    budget: 300, currency: "GBP", rateType: "Flat Fee", qty: "6",
  },
  {
    title: "Trade Show Brand Representatives",
    description: "<p>A technology company exhibiting at a major industry trade show needs brand representatives to man their stand, demonstrate their product and engage with attendees. Full product training provided beforehand.</p>",
    usage: "<p>Marketing materials from the event for 6 months.</p>",
    jobType: ["Event", "Promotion"],
    gender: ["Woman", "Man"],
    categories: ["Editorial/Commercial"],
    budget: 180, currency: "GBP", rateType: "Per Day", qty: "4",
  },
  {
    title: "Sports Event Promotional Hosts",
    description: "<p>A major UK motorsport event requires professional promotional models to host VIP areas, grid walks and sponsor activations. Full uniform provided. Must be comfortable in a fast-paced outdoor environment across a full weekend.</p>",
    usage: "<p>Event photography for sponsor reports.</p>",
    jobType: ["Event", "Promotion"],
    gender: ["Woman"],
    categories: ["Editorial/Commercial"],
    budget: 220, currency: "GBP", rateType: "Per Day", qty: "8",
    minHeight: 168,
  },

  // ── PROMOTIONS ────────────────────────────────────────────────────────────
  {
    title: "Music Festival Promotional Staff",
    description: "<p>A major music festival is looking for high-energy promotional staff to represent their brand across the festival grounds. Role involves brand engagement, distributing merchandise and creating engaging social content throughout the event.</p>",
    usage: "<p>Festival social media accounts for 3 months.</p>",
    jobType: ["Promotion"],
    gender: ["Woman", "Man"],
    categories: ["Influencer"],
    budget: 150, currency: "GBP", rateType: "Per Day", qty: "11+",
  },
  {
    title: "Nightclub Brand Promotion Night",
    description: "<p>A popular nightclub brand is hosting a series of brand nights and needs high-energy promotional models. The role involves engaging VIP guests, social media content creation and brand representation throughout the evening.</p>",
    usage: "<p>Club's social media for 1 month per event.</p>",
    jobType: ["Promotion"],
    gender: ["Woman"],
    categories: ["Influencer"],
    budget: 200, currency: "GBP", rateType: "Flat Fee", qty: "4",
    minHeight: 168,
  },
  {
    title: "Supermarket Product Sampling Campaign",
    description: "<p>A FMCG brand is running an in-store sampling campaign across supermarket locations. Looking for friendly, approachable promotional models to set up sampling stations and engage shoppers with their new product range.</p>",
    usage: "<p>Internal reporting only.</p>",
    jobType: ["Promotion"],
    gender: ["Woman", "Man"],
    categories: ["Editorial/Commercial"],
    budget: 120, currency: "GBP", rateType: "Per Day", qty: "5",
  },

  // ── INFLUENCER / SOCIAL ───────────────────────────────────────────────────
  {
    title: "Social Media Content Creator Campaign",
    description: "<p>A D2C consumer brand is working with model-influencers to create authentic UGC-style content. Both studio shots and self-created content required. Ideal for influencer-models with a genuine and engaged following of 5k+.</p>",
    usage: "<p>Brand social media channels and paid social advertising for 6 months.</p>",
    jobType: ["Photoshoot"],
    gender: ["Woman"],
    categories: ["Influencer"],
    budget: 400, currency: "GBP", rateType: "Flat Fee", qty: "5",
  },
  {
    title: "Fitness Influencer Brand Collaboration",
    description: "<p>A sports supplement brand is seeking fitness-focused influencers with a minimum 10k social following for a collaborative campaign. Create content in our products and publish across your own channels as well as ours.</p>",
    usage: "<p>Shared across brand and model's social media channels for 3 months.</p>",
    jobType: ["Photoshoot"],
    gender: ["Woman", "Man"],
    categories: ["Fitness", "Influencer"],
    budget: 500, currency: "GBP", rateType: "Flat Fee", qty: "4",
  },

  // ── INTERNATIONAL ─────────────────────────────────────────────────────────
  {
    title: "Dubai Luxury Brand Regional Campaign",
    description: "<p>A luxury brand is shooting their Middle East regional campaign in Dubai. Models must be available to travel — flights and accommodation fully covered. Three-day high-profile production with international distribution.</p>",
    usage: "<p>Regional print and digital advertising across GCC countries for 24 months.</p>",
    jobType: ["Photoshoot"],
    gender: ["Woman"],
    categories: ["Editorial/Commercial"],
    budget: 5000, currency: "USD", rateType: "Flat Fee", qty: "3",
    minHeight: 172,
  },
  {
    title: "Amsterdam Sustainable Fashion Campaign",
    description: "<p>A pioneering sustainable fashion brand based in Amsterdam is producing a campaign for their first UK collection launch. Concept celebrates natural environments and sustainable living with a raw, authentic aesthetic.</p>",
    usage: "<p>European and UK digital and print for 12 months.</p>",
    jobType: ["Photoshoot"],
    gender: ["Woman", "Man"],
    categories: ["Editorial/Commercial"],
    budget: 1800, currency: "EUR", rateType: "Per Day", qty: "4",
  },
  {
    title: "New York Fashion Brand — UK Casting",
    description: "<p>A successful New York fashion brand is casting UK-based models for an international campaign to be shot in both London and New York. Must be available to travel. All expenses fully covered by the brand.</p>",
    usage: "<p>Global advertising across all channels for 18 months.</p>",
    jobType: ["Casting"],
    gender: ["Woman"],
    categories: ["Editorial/Commercial"],
    budget: 4000, currency: "USD", rateType: "Flat Fee", qty: "2",
    minHeight: 173, maxHeight: 182,
  },
];

// ─── Future job event dates (June–December 2026) ─────────────────────────────
const EVENT_DATES = [
  { dayDate: "9",  monthDate: "June",      yearDate: "2026" },
  { dayDate: "12", monthDate: "June",      yearDate: "2026" },
  { dayDate: "16", monthDate: "June",      yearDate: "2026" },
  { dayDate: "19", monthDate: "June",      yearDate: "2026" },
  { dayDate: "23", monthDate: "June",      yearDate: "2026" },
  { dayDate: "26", monthDate: "June",      yearDate: "2026" },
  { dayDate: "30", monthDate: "June",      yearDate: "2026" },
  { dayDate: "3",  monthDate: "July",      yearDate: "2026" },
  { dayDate: "7",  monthDate: "July",      yearDate: "2026" },
  { dayDate: "10", monthDate: "July",      yearDate: "2026" },
  { dayDate: "14", monthDate: "July",      yearDate: "2026" },
  { dayDate: "17", monthDate: "July",      yearDate: "2026" },
  { dayDate: "21", monthDate: "July",      yearDate: "2026" },
  { dayDate: "24", monthDate: "July",      yearDate: "2026" },
  { dayDate: "28", monthDate: "July",      yearDate: "2026" },
  { dayDate: "4",  monthDate: "August",    yearDate: "2026" },
  { dayDate: "11", monthDate: "August",    yearDate: "2026" },
  { dayDate: "18", monthDate: "August",    yearDate: "2026" },
  { dayDate: "25", monthDate: "August",    yearDate: "2026" },
  { dayDate: "1",  monthDate: "September", yearDate: "2026" },
  { dayDate: "8",  monthDate: "September", yearDate: "2026" },
  { dayDate: "15", monthDate: "September", yearDate: "2026" },
  { dayDate: "22", monthDate: "September", yearDate: "2026" },
  { dayDate: "29", monthDate: "September", yearDate: "2026" },
  { dayDate: "6",  monthDate: "October",   yearDate: "2026" },
  { dayDate: "13", monthDate: "October",   yearDate: "2026" },
  { dayDate: "20", monthDate: "October",   yearDate: "2026" },
  { dayDate: "27", monthDate: "October",   yearDate: "2026" },
  { dayDate: "3",  monthDate: "November",  yearDate: "2026" },
  { dayDate: "10", monthDate: "November",  yearDate: "2026" },
  { dayDate: "17", monthDate: "November",  yearDate: "2026" },
  { dayDate: "24", monthDate: "November",  yearDate: "2026" },
  { dayDate: "1",  monthDate: "December",  yearDate: "2026" },
  { dayDate: "8",  monthDate: "December",  yearDate: "2026" },
  { dayDate: "15", monthDate: "December",  yearDate: "2026" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Spread createdAt across Jan–Jun 2026 */
function getCreatedAt(index, total) {
  const start = new Date("2026-01-06T09:00:00Z").getTime();
  const end   = new Date("2026-06-01T17:00:00Z").getTime();
  const step  = (end - start) / total;
  // Add some jitter so times don't look mechanical
  const jitter = (index % 7) * 3600000; // 0–6 hour offset
  return new Date(start + step * index + jitter).toISOString();
}

function generateReference(createdAt, index) {
  const d    = new Date(createdAt);
  const date = d.toISOString().slice(0, 10).replace(/-/g, "");
  const time = d.toISOString().slice(11, 19).replace(/:/g, "");
  return `TMC-${date}-${time}-S${String(index).padStart(3, "0")}`;
}

// ─── Seed ─────────────────────────────────────────────────────────────────────

async function seedJobs() {
  // Look up info@themodel.cloud
  const userSnap = await db
    .collection("users")
    .where("email", "==", SEED_CLIENT_EMAIL)
    .limit(1)
    .get();

  if (userSnap.empty) {
    console.error(`ERROR: No user found with email "${SEED_CLIENT_EMAIL}". Make sure the account exists in Firestore.`);
    process.exit(1);
  }

  const clientDoc  = userSnap.docs[0];
  const clientId   = clientDoc.id;
  const clientData = clientDoc.data();
  console.log(`Client found: ${clientData.firstName || ""} ${clientData.lastName || ""} <${SEED_CLIENT_EMAIL}> (uid: ${clientId})`);

  const TOTAL = 110;
  const jobs  = [];

  for (let i = 0; i < TOTAL; i++) {
    const template  = TEMPLATES[i % TEMPLATES.length];
    const location  = LOCATIONS[i % LOCATIONS.length];
    const eventDate = EVENT_DATES[i % EVENT_DATES.length];
    const createdAt = getCreatedAt(i, TOTAL);
    const reference = generateReference(createdAt, i);

    const job = {
      // Content
      title:       template.title,
      description: template.description,
      usage:       template.usage || "",

      // Location
      country: location.country,
      city:    location.city,
      ...(location.county && { county: location.county }),
      ...(location.state  && { state:  location.state  }),

      // Job details
      jobType:  template.jobType,
      gender:   template.gender,
      categories: template.categories,
      budget:   template.budget,
      currency: template.currency,
      rateType: template.rateType,
      qty:      template.qty || "1",

      // Event date
      ...eventDate,

      // Optional model requirements
      ...(template.minHeight  && { minHeight:  template.minHeight  }),
      ...(template.maxHeight  && { maxHeight:  template.maxHeight  }),
      ...(template.dressSize  && { dressSize:  template.dressSize  }),
      ...(template.eyeColour  && { eyeColour:  template.eyeColour  }),
      ...(template.hairColour && { hairColour: template.hairColour }),

      // Meta
      reference,
      status:          "open",
      userId:          clientId,
      organisationId:  null,
      teamId:          null,
      createdAt,
      updatedAt:       createdAt,
      applicants:      [],
      appliedTimestamps: {},
      media:           [],

      // Seed marker — allows bulk delete; hidden from normal UI
      isSeedData: true,
    };

    jobs.push(job);
  }

  // Firestore batch writes (max 500 ops per batch)
  let batch   = db.batch();
  let opCount = 0;
  const committed = [];

  for (const job of jobs) {
    const ref = db.collection("jobs").doc();
    batch.set(ref, job);
    opCount++;

    if (opCount % 500 === 0) {
      committed.push(batch.commit());
      batch   = db.batch();
    }
  }

  if (opCount % 500 !== 0) {
    committed.push(batch.commit());
  }

  await Promise.all(committed);
  console.log(`✓ Seeded ${jobs.length} demo jobs.`);

  // Write all references into the client user's jobs array so they show in My Jobs
  const references = jobs.map((j) => j.reference);
  const chunkSize  = 450;
  for (let i = 0; i < references.length; i += chunkSize) {
    const chunk = references.slice(i, i + chunkSize);
    await db
      .collection("users")
      .doc(clientId)
      .update({
        jobs: admin.firestore.FieldValue.arrayUnion(...chunk),
      });
  }
  console.log(`✓ Added ${references.length} references to ${SEED_CLIENT_EMAIL}'s jobs array.`);
}

// ─── Clear ────────────────────────────────────────────────────────────────────

async function clearSeedJobs() {
  console.log("Querying seed jobs...");
  const snap = await db.collection("jobs").where("isSeedData", "==", true).get();

  if (snap.empty) {
    console.log("No seed jobs found.");
    return;
  }

  // Collect references before deleting so we can remove them from the user doc
  const references = [];
  snap.forEach((doc) => {
    const ref = doc.data().reference;
    if (ref) references.push(ref);
  });

  // Delete all seed job documents
  let batch   = db.batch();
  let opCount = 0;
  const committed = [];

  snap.forEach((doc) => {
    batch.delete(doc.ref);
    opCount++;
    if (opCount % 500 === 0) {
      committed.push(batch.commit());
      batch = db.batch();
    }
  });

  if (opCount % 500 !== 0) {
    committed.push(batch.commit());
  }

  await Promise.all(committed);
  console.log(`✓ Deleted ${opCount} seed jobs.`);

  // Remove references from the client user's jobs array
  const userSnap = await db
    .collection("users")
    .where("email", "==", SEED_CLIENT_EMAIL)
    .limit(1)
    .get();

  if (!userSnap.empty) {
    const clientId  = userSnap.docs[0].id;
    const chunkSize = 450;
    for (let i = 0; i < references.length; i += chunkSize) {
      const chunk = references.slice(i, i + chunkSize);
      await db
        .collection("users")
        .doc(clientId)
        .update({
          jobs: admin.firestore.FieldValue.arrayRemove(...chunk),
        });
    }
    console.log(`✓ Removed ${references.length} references from ${SEED_CLIENT_EMAIL}'s jobs array.`);
  }
}

// ─── Fix: backfill references into the client user document ──────────────────
// Run this once to fix already-seeded jobs that aren't showing in My Jobs.

async function fixSeedJobReferences() {
  // Find the client user
  const userSnap = await db
    .collection("users")
    .where("email", "==", SEED_CLIENT_EMAIL)
    .limit(1)
    .get();

  if (userSnap.empty) {
    console.error(`ERROR: No user found with email "${SEED_CLIENT_EMAIL}".`);
    process.exit(1);
  }

  const clientId = userSnap.docs[0].id;
  console.log(`Client uid: ${clientId}`);

  // Collect references from all existing seed jobs
  const jobsSnap = await db.collection("jobs").where("isSeedData", "==", true).get();

  if (jobsSnap.empty) {
    console.log("No seed jobs found in Firestore. Run without flags to seed first.");
    return;
  }

  const references = [];
  jobsSnap.forEach((doc) => {
    const ref = doc.data().reference;
    if (ref) references.push(ref);
  });

  // Firestore arrayUnion supports up to 500 items per call; batch if needed
  const chunkSize = 450;
  for (let i = 0; i < references.length; i += chunkSize) {
    const chunk = references.slice(i, i + chunkSize);
    await db
      .collection("users")
      .doc(clientId)
      .update({
        jobs: admin.firestore.FieldValue.arrayUnion(...chunk),
      });
  }

  console.log(`✓ Added ${references.length} job references to ${SEED_CLIENT_EMAIL}'s jobs array.`);
  console.log("  Jobs will now appear under My Jobs when logged in as this account.");
}

// ─── Entry point ──────────────────────────────────────────────────────────────

const args    = process.argv.slice(2);
const isClear = args.includes("--clear");
const isFix   = args.includes("--fix");

let fn;
if (isClear)     fn = clearSeedJobs;
else if (isFix)  fn = fixSeedJobReferences;
else             fn = seedJobs;

fn()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fatal error:", err.message || err);
    process.exit(1);
  });
