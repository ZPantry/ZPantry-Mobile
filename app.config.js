// Preserve app.json configuration; add the iOS callback only when its OAuth
// client exists. Android Google Sign-In uses autolinking, without Firebase.
module.exports = ({ config }) => {
  config = { ...config, plugins: [...(config.plugins || []), 'expo-image'] };
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();
  if (!iosClientId) return config;
  return {
    ...config,
    plugins: [
      ...(config.plugins || []),
      ["@react-native-google-signin/google-signin", {
        iosUrlScheme: iosClientId.split(".").reverse().join(".")
      }]
    ]
  };
};
