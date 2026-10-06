// Shared settings for the College Scorecard import (fetch → normalize → SQL).
// Field names were checked against the live API; see
// https://collegescorecard.ed.gov/data/api-documentation/

export const API_URL = "https://api.data.gov/ed/collegescorecard/v1/schools";

// Which schools: currently operating, mainly award bachelor's degrees, and
// publish an admission rate.
export const FILTERS = {
  "school.operating": "1",
  "school.degrees_awarded.predominant": "3",
  "latest.admissions.admission_rate.overall__range": "0..1",
};

export const FIELDS = [
  "id",
  "school.name",
  "school.city",
  "school.state",
  "school.ownership",
  "school.region_id",
  "school.degrees_awarded.highest",
  "school.carnegie_basic",
  "latest.admissions.admission_rate.overall",
  "latest.admissions.sat_scores.25th_percentile.critical_reading",
  "latest.admissions.sat_scores.75th_percentile.critical_reading",
  "latest.admissions.sat_scores.25th_percentile.math",
  "latest.admissions.sat_scores.75th_percentile.math",
  "latest.admissions.sat_scores.midpoint.critical_reading",
  "latest.admissions.sat_scores.midpoint.math",
  "latest.cost.tuition.in_state",
  "latest.cost.tuition.out_of_state",
  "latest.cost.avg_net_price.public",
  "latest.cost.avg_net_price.private",
  "latest.cost.roomboard.oncampus",
  "latest.cost.otherexpense.oncampus",
  "latest.student.size",
  "latest.completion.completion_rate_4yr_150nt",
  "latest.student.retention_rate.four_year.full_time",
  "latest.earnings.10_yrs_after_entry.median",
  "latest.academics.program_percentage",
  // The credential level of every program the school reports (field-of-study
  // data): which degree levels it actually awards.
  "latest.programs.cip_4_digit.credential.level",
];

// One school whose year-specific fields are compared with `latest` to find
// which Scorecard data year `latest` currently is (Purdue, main campus).
export const YEAR_PROBE_SCHOOL_ID = 243780;

// Scorecard ownership codes.
export const OWNERSHIP = { 1: "public", 2: "private nonprofit", 3: "private for-profit" };

// Carnegie Classification "basic" codes, as published in Scorecard's
// school.carnegie_basic. Only the three doctoral codes say anything about
// research activity; every other positive code (associate, master's,
// baccalaureate, special focus, tribal) is a non-doctoral institution.
// 0 / -2 / missing mean "not classified" and stay null. Checked against
// schools with well-known classifications: MIT, Purdue and Northeastern
// report 15, Ball State 16, Amherst and Williams 21.
// Definitions: https://carnegieclassifications.acenet.edu/
export const CARNEGIE_RESEARCH = {
  15: "very_high", // Doctoral Universities: Very High Research Activity ("R1")
  16: "high", // Doctoral Universities: High Research Activity ("R2")
  17: "doctoral_professional", // Doctoral/Professional Universities
};

// Scorecard (IPEDS) region codes.
export const REGIONS = {
  0: "US Service Schools",
  1: "New England",
  2: "Mid East",
  3: "Great Lakes",
  4: "Plains",
  5: "Southeast",
  6: "Southwest",
  7: "Rocky Mountains",
  8: "Far West",
  9: "Outlying Areas",
};

// Scorecard's broad fields of study → the major names the app uses, so a
// student's "Computer Science" matches the official `computer` field.
export const PROGRAM_LABELS = {
  agriculture: "Agriculture",
  architecture: "Architecture",
  biological: "Biological Sciences",
  business_marketing: "Business",
  communication: "Communication",
  communications_technology: "Communications Technology",
  computer: "Computer Science",
  construction: "Construction",
  education: "Education",
  engineering: "Engineering",
  engineering_technology: "Engineering Technology",
  english: "English",
  ethnic_cultural_gender: "Cultural Studies",
  family_consumer_science: "Family & Consumer Sciences",
  health: "Health Professions",
  history: "History",
  humanities: "Liberal Arts & Humanities",
  language: "Languages",
  legal: "Legal Studies",
  library: "Library Science",
  mathematics: "Mathematics",
  mechanic_repair_technology: "Mechanics & Repair",
  military: "Military Technologies",
  multidiscipline: "Interdisciplinary Studies",
  parks_recreation_fitness: "Sports & Recreation",
  personal_culinary: "Culinary & Personal Services",
  philosophy_religious: "Philosophy",
  physical_science: "Physical Sciences",
  precision_production: "Precision Production",
  psychology: "Psychology",
  public_administration_social_service: "Public Administration",
  resources: "Natural Resources",
  science_technology: "Science Technologies",
  security_law_enforcement: "Criminal Justice",
  social_science: "Social Sciences",
  theology_religious_vocation: "Theology",
  transportation: "Transportation",
  visual_performing: "Arts",
};

// The hand-written sample schools that also exist in Scorecard, matched by
// hand and checked against the API. Their admission and cost figures are
// replaced with official ones (their names and illustrative rankings stay).
export const EXISTING_SCHOOL_IDS = {
  "Massachusetts Institute of Technology": 166683,
  "Harvard University": 166027,
  "Stanford University": 243744,
  "Purdue University": 243780,
  "University of Texas at Austin": 228778,
  "Arizona State University": 104151,
  "University of California, Berkeley": 110635,
  "University of California, Los Angeles": 110662,
  "University of Michigan": 170976,
  "Georgia Institute of Technology": 139755,
  "University of Illinois Urbana-Champaign": 145637,
  "University of Washington": 236948,
  "New York University": 193900,
  "Northeastern University": 167358,
};
