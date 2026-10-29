// Fixed rather than read from request headers, which a client can spoof
// (X-Forwarded-Host) and which differ on preview hostnames.
export const SITE_URL = "https://jplearn.app";
