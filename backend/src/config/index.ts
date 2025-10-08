export const cfg = {
  filesDir: process.env.FILES_DIR || "./data/services",
  robleApp: {
    dbName: process.env.ROBLE_APP_DB_NAME || "",
    accessToken: process.env.ROBLE_APP_ACCESS_TOKEN || "",
    refreshToken: process.env.ROBLE_APP_REFRESH_TOKEN || "",
    timeoutMs: Number(process.env.ROBLE_TIMEOUT_MS || 5000),
  },
};