const path = require('path');

module.exports = function(env) {
  return {
    expo: {
      name: "SiteWeave",
      slug: "siteweave-mobile",
      version: "1.0.0",
      orientation: "portrait",
      icon: "./assets/icon.png",
      userInterfaceStyle: "light",
      newArchEnabled: true,
      scheme: "siteweave",
      splash: {
        image: "./assets/splash-icon.png",
        resizeMode: "contain",
        backgroundColor: "#ffffff"
      },
      ios: {
        supportsTablet: true,
        bundleIdentifier: "com.siteweave.mobile"
      },
      android: {
        adaptiveIcon: {
          foregroundImage: "./assets/adaptive-icon.png",
          backgroundColor: "#ffffff"
        },
        edgeToEdgeEnabled: true,
        package: "com.siteweave.mobile"
      },
      web: {
        favicon: "./assets/favicon.png",
        bundler: "webpack"
      },
      experiments: {
        typedRoutes: true
      },
      plugins: [
        "expo-router"
      ],
      extra: {
        router: {
          origin: false
        },
        eas: {
          projectId: "siteweave-mobile"
        }
      }
    }
  };
};

