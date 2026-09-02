/**
 * Institution identity in one place, so a rename or a campus change is a
 * single edit rather than a hunt through the components.
 */
export const BRAND = {
  institution: "XLRI Delhi-NCR",
  institutionFull: "XLRI — Xavier School of Management",
  campus: "Delhi-NCR",
  tagline: "For the greater good",
  motto: "Excellence & Integrity",
  established: "1949",

  unit: "Institute for Entrepreneurship & Venturing",
  unitShort: "IEV",
  product: "Student Activity Portal",
} as const;

/** Colours sampled from the XLRI identity, mirrored by the CSS tokens. */
export const BRAND_COLORS = {
  blue: "#1C3F94",
  blueDeep: "#16337F",
  green: "#8DC63F",
  grey: "#939598",
} as const;
