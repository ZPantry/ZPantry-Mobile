// Preserve app.json configuration; add the iOS callback only when its OAuth
// client exists. Android Google Sign-In uses autolinking, without Firebase.
module.exports = ({ config }) => {
  // Match the runtime font aliases exactly, including vector-icon family names.
  // Native screens must not download these fonts from Metro when first mounted.
  const androidFonts = [
    ['BeVietnamPro_400Regular', '@expo-google-fonts/be-vietnam-pro/400Regular/BeVietnamPro_400Regular.ttf'],
    ['BeVietnamPro_500Medium', '@expo-google-fonts/be-vietnam-pro/500Medium/BeVietnamPro_500Medium.ttf'],
    ['BeVietnamPro_600SemiBold', '@expo-google-fonts/be-vietnam-pro/600SemiBold/BeVietnamPro_600SemiBold.ttf'],
    ['PlusJakartaSans_600SemiBold', '@expo-google-fonts/plus-jakarta-sans/600SemiBold/PlusJakartaSans_600SemiBold.ttf'],
    ['PlusJakartaSans_700Bold', '@expo-google-fonts/plus-jakarta-sans/700Bold/PlusJakartaSans_700Bold.ttf'],
    ['Inter_500Medium', '@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf'],
    ['Inter_700Bold', '@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf'],
    ['ionicons', '@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf'],
    ['material-community', '@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf']
  ].map(([fontFamily, file]) => ({
    fontFamily,
    fontDefinitions: [{ path: `./node_modules/${file}`, weight: 400 }]
  }));
  config = { ...config, plugins: [...(config.plugins || []), 'expo-image', ['expo-font', { android: { fonts: androidFonts } }]] };
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
