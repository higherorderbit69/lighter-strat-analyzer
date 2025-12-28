// Auth and session constants
export const COOKIE_NAME = "strat-session";
export const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
export const UNAUTHED_ERR_MSG = "Unauthorized";

// API configuration
export const LIGHTER_API_BASE = "https://mainnet.zklighter.elliot.ai";
export const API_VERSION = "v1";

// Rate limiting
export const API_RATE_LIMIT_MS = 500; // Minimum ms between API calls

// Feature flags
export const FTC_ENABLED = process.env.FTC_ENABLED === "true"; // Default OFF
