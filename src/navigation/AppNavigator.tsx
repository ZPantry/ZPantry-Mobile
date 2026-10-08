import FixedBackHeader from "@/components/FixedBackHeader";
import AiChefChat from "@/components/AiChefChat";
import FigmaAsset from '@/components/FigmaAsset';
import { homeAssets, pantryAssets, exploreAssets, profileAssets, loginAssets } from '@/constants/figmaAssets';
import Text from "@/components/AppText";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useEffect, useRef, useState } from "react";
import { Pressable, useWindowDimensions, View } from "react-native";
import { colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import AdminIngredientFormScreen from "@/screens/AdminIngredientFormScreen";
import AdminManagementScreen from "@/screens/AdminManagementScreen";
import AdminRecipeFormScreen from "@/screens/AdminRecipeFormScreen";
import AdminUserFormScreen from "@/screens/AdminUserFormScreen";
import AddIngredientScreen from "@/screens/AddIngredientScreen";
import HomeScreen from "@/screens/HomeScreen";
import LoginScreen from "@/screens/LoginScreen";
import ForgotPasswordScreen from "@/screens/ForgotPasswordScreen";
import MealRecommendationResultsScreen from "@/screens/MealRecommendationResultsScreen";
import RecommendationAnalysisSampleScreen from "@/screens/RecommendationAnalysisSampleScreen";
import MealSuggestionScreen from "@/screens/MealSuggestionScreen";
import ManualMealSuggestionScreen from "@/screens/ManualMealSuggestionScreen";
import CreateRecipeScreen from "@/screens/CreateRecipeScreen";
import OnboardingScreen from "@/screens/OnboardingScreen";
import PantryItemDetailScreen from "@/screens/PantryItemDetailScreen";
import PantryScreen from "@/screens/PantryScreen";
import PantryImportScreen from "@/screens/PantryImportScreen";
import InteractiveGuideScreen from "@/screens/InteractiveGuideScreen";
import PlanScreen from "@/screens/PlanScreen";
import ProfileScreen from "@/screens/ProfileScreen";
import ProfileSetupScreen from "@/screens/ProfileSetupScreen";
import RecipeDetailScreen from "@/screens/RecipeDetailScreen";
import SplashScreen from "@/screens/SplashScreen";
import TodayMenuItemDetailScreen from "@/screens/TodayMenuItemDetailScreen";
import type { RootStackParamList, TabParamList } from "@/types";
import { canManageCatalog, canManageUsers } from "@/utils/roles";
import CookingHistoryScreen from "@/screens/CookingHistoryScreen";
import AccountSettingsScreen from "@/screens/AccountSettingsScreen";
import QuickAddScreen from "@/screens/QuickAddScreen";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const tabMeta = {
  Home: { label: "Trang chủ", icon: "home-outline", activeIcon: "home", family: "ion" },
  Pantry: { label: "Kho thực phẩm", icon: "fridge-outline", activeIcon: "fridge", family: "mci" },
  MealSuggestion: { label: "Khám phá", icon: "silverware-fork-knife", activeIcon: "silverware-fork-knife", family: "mci" },
  Plan: { label: "Thực đơn", icon: "calendar-outline", activeIcon: "calendar", family: "ion" },
  Profile: { label: "Cá nhân", icon: "person-outline", activeIcon: "person", family: "ion" }
} as const;

function BrandTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const desktop = width >= 900;
  return <View testID="bottom-tab-bar" style={{ backgroundColor: colors.surface, borderTopWidth: desktop ? 0 : 1,
    borderBottomWidth: desktop ? 1 : 0, borderColor: colors.line, paddingBottom: desktop ? 0 : Math.max(insets.bottom, 8),
    paddingTop: desktop ? 0 : 6 }}>
    <View style={{ width: "100%", maxWidth: 1200, alignSelf: "center", minHeight: desktop ? 76 : 58,
      flexDirection: "row", alignItems: "center", paddingHorizontal: desktop ? 32 : 4, gap: desktop ? 24 : 0 }}>
      {desktop ? <FigmaAsset asset={loginAssets.imgLogoZPantryVer61} style={{ width: 138, height: 35.28, marginRight: "auto" }} label="Z Pantry" /> : null}
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const meta = tabMeta[route.name as keyof typeof tabMeta];
        const color = focused ? '#EF9D1F' : colors.tabText;
        const iconAssets = focused ? { Home: homeAssets.imgContainer13, Pantry: pantryAssets.imgContainer15, MealSuggestion: exploreAssets.imgContainer28, Profile: profileAssets.imgContainer17 } : { Home: pantryAssets.imgContainer14, Pantry: homeAssets.imgContainer14, MealSuggestion: homeAssets.imgContainer15, Profile: homeAssets.imgContainer16 };
        const designIcon = iconAssets[route.name as keyof typeof iconAssets];
        return <Pressable key={route.key} accessibilityRole="tab" accessibilityLabel={meta.label}
          accessibilityState={{ selected: focused }}
          onLongPress={() => navigation.emit({ type: "tabLongPress", target: route.key })}
          onPress={() => {
            const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          }} style={({ pressed }) => ({ flex: desktop ? undefined : 1, minHeight: 52,
            paddingHorizontal: desktop ? 12 : 2, alignItems: "center", justifyContent: "center", gap: 5,
            flexDirection: desktop ? "row" : "column", opacity: pressed ? 0.6 : 1,
            borderBottomWidth: desktop && focused ? 2 : 0, borderColor: colors.primary })}>
          {designIcon ? <FigmaAsset asset={designIcon} /> : <Ionicons name="calendar-outline" size={21} color={color} />}
          <Text numberOfLines={1} style={{ color, fontSize: desktop ? 13 : width < 360 ? 10 : 11, fontWeight: focused ? "700" : "500" }}>{meta.label}</Text>
        </Pressable>;
      })}
    </View>
  </View>;
}

function Tabs() {
  const { width } = useWindowDimensions();
  return (
    <Tab.Navigator tabBar={(props) => <BrandTabBar {...props} />} screenOptions={{ headerShown: false, tabBarPosition: width >= 900 ? "top" : "bottom" }}>
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: "Hôm nay" }} />
      <Tab.Screen name="Pantry" component={PantryScreen} options={{ title: "Tủ" }} />
      <Tab.Screen name="MealSuggestion" component={MealSuggestionScreen} options={{ title: "Công thức" }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: "Cá nhân" }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, isLoading, user, onboardingStep } = useAuth();
  const [introStage, setIntroStage] = useState<"splash" | "onboarding" | "ready">("splash");
  const hasBeenAuthenticated = useRef(false);
  const isAdmin = canManageCatalog(user?.role);

  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated) {
      hasBeenAuthenticated.current = true;
    }

    if (!isAuthenticated && hasBeenAuthenticated.current) {
      setIntroStage("ready");
      return;
    }

    const timer = setTimeout(() => {
      setIntroStage(isAuthenticated ? "ready" : "onboarding");
    }, 1450);

    return () => clearTimeout(timer);
  }, [isAuthenticated, isLoading]);

  if (isLoading || introStage === "splash") {
    return <SplashScreen />;
  }

  if (!isAuthenticated && introStage === "onboarding") {
    return <OnboardingScreen onStart={() => setIntroStage("ready")} />;
  }

  let initialRoute: keyof RootStackParamList = "Tabs";
  if (!isAuthenticated) {
    initialRoute = "Login";
  } else if (isAdmin) {
    initialRoute = "AdminManagement";
  } else {
    initialRoute = onboardingStep === "profile_setup" ? "ProfileSetup" : "Tabs";
  }

  return (
    <View style={{ flex: 1 }}>
    <Stack.Navigator initialRouteName={initialRoute} key={`${isAuthenticated ? "auth" : "guest"}-${isAdmin ? "admin" : "user"}`} screenOptions={({ route }) => ({ headerShown: !['Tabs', 'Login', 'AdminManagement'].includes(route.name), header: props => <FixedBackHeader {...props} />, contentStyle: { backgroundColor: colors.background } })}>
      {isAuthenticated && isAdmin ? (
        <>
          <Stack.Screen name="AdminManagement" component={AdminManagementScreen} initialParams={{ showBackButton: false }} />
          {canManageUsers(user?.role) && <Stack.Screen name="AdminUserForm" component={AdminUserFormScreen} />}
          <Stack.Screen name="AdminRecipeForm" component={AdminRecipeFormScreen} />
          <Stack.Screen name="AdminIngredientForm" component={AdminIngredientFormScreen} />
          <Stack.Screen name="CreateRecipe" component={CreateRecipeScreen} />
        </>
      ) : isAuthenticated ? (
        <>
          <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
          <Stack.Screen name="Tabs" component={Tabs} />
          <Stack.Screen name="Plan" component={PlanScreen} />
          <Stack.Screen name="AddIngredient" component={AddIngredientScreen} />
          <Stack.Screen name="QuickAdd" component={QuickAddScreen} />
          <Stack.Screen name="ManualMealSuggestion" component={ManualMealSuggestionScreen} />
          <Stack.Screen name="PantryImport" component={PantryImportScreen} />
          <Stack.Screen name="CookingHistory" component={CookingHistoryScreen} />
          <Stack.Screen name="AccountSettings" component={AccountSettingsScreen} />
          <Stack.Screen name="InteractiveGuide" component={InteractiveGuideScreen} />
          <Stack.Screen name="PantryItemDetail" component={PantryItemDetailScreen} />
          <Stack.Screen name="MealRecommendationResults" component={MealRecommendationResultsScreen} />
          <Stack.Screen name="RecommendationAnalysisSample" component={RecommendationAnalysisSampleScreen} options={{ title: "Phân tích món ăn" }} />
          <Stack.Screen name="RecipeDetail" component={RecipeDetailScreen} />
          <Stack.Screen name="TodayMenuItemDetail" component={TodayMenuItemDetailScreen} />
        </>
      ) : (
        <>
        <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </>
      )}
    </Stack.Navigator>
    {isAuthenticated && !isAdmin ? <AiChefChat /> : null}
    </View>
  );
}
