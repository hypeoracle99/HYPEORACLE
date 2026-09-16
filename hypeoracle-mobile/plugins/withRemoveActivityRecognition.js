const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withRemoveActivityRecognition(config) {
  return withAndroidManifest(config, async (config) => {
    let androidManifest = config.modResults;

    // Ensure manifest uses-permission array exists
    if (!androidManifest.manifest['uses-permission']) {
      androidManifest.manifest['uses-permission'] = [];
    }

    // Add the uses-permission with tools:node="remove"
    androidManifest.manifest['uses-permission'].push({
      $: {
        'android:name': 'android.permission.ACTIVITY_RECOGNITION',
        'tools:node': 'remove',
      },
    });

    return config;
  });
};
