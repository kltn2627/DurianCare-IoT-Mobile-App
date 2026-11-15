const fs = require("fs");
const path = require("path");

/**
 * app.json stays the source of truth; this only adds the Firebase file, because prebuild fails when
 * googleServicesFile names a missing file. EAS passes it as the GOOGLE_SERVICES_JSON file secret, a local
 * build reads ./google-services.json (git-ignored). Without either, the app builds with push turned off.
 */
module.exports = ({ config }) => {
  const localFile = path.join(__dirname, "google-services.json");
  const googleServicesFile =
    process.env.GOOGLE_SERVICES_JSON ?? (fs.existsSync(localFile) ? "./google-services.json" : undefined);

  return {
    ...config,
    android: {
      ...config.android,
      ...(googleServicesFile ? { googleServicesFile } : {}),
    },
  };
};
