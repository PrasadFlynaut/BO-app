const { withProjectBuildGradle } = require('@expo/config-plugins');

/**
 * Custom Expo config plugin to force minSdkVersion to 26
 * Required because react-native-health-connect depends on
 * androidx.health.connect:connect-client which requires API 26+
 */
const withMinSdkVersion = (config, { minSdkVersion = 26 } = {}) => {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.contents) {
      // Replace minSdkVersion in build.gradle
      config.modResults.contents = config.modResults.contents.replace(
        /minSdkVersion\s*=\s*Integer\.parseInt\(findProperty\('android\.minSdkVersion'\)\s*\?\:\s*'\d+'\)/,
        `minSdkVersion = Integer.parseInt(findProperty('android.minSdkVersion') ?: '${minSdkVersion}')`
      );
      // Also handle direct minSdkVersion assignments
      config.modResults.contents = config.modResults.contents.replace(
        /minSdkVersion\s*=\s*(\d+)/g,
        (match, version) => {
          if (parseInt(version) < minSdkVersion) {
            return `minSdkVersion = ${minSdkVersion}`;
          }
          return match;
        }
      );
    }
    return config;
  });
};

module.exports = withMinSdkVersion;
