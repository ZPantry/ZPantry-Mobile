import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Pressable, Text, useWindowDimensions, View } from "react-native";
import { colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import AddIngredientScreen from "@/screens/AddIngredientScreen";
import HomeScreen from "@/screens/HomeScreen";
import LoginScreen from "@/screens/LoginScreen";
import MealSuggestionScreen from "@/screens/MealSuggestionScreen";
import OnboardingScreen from "@/screens/OnboardingScreen";
import PantryScreen from "@/screens/PantryScreen";
import PlanScreen from "@/screens/PlanScreen";
import ProfileScreen from "@/screens/ProfileScreen";
import RecipeDetailScreen from "@/screens/RecipeDetailScreen";
import CreateRecipeScreen from "@/screens/CreateRecipeScreen";
import SplashScreen from "@/screens/SplashScreen";
import type { RootStackParamList, TabParamList } from "@/types";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const tabMeta = {
  Home: { label: "Hôm nay", icon: "home-outline", activeIcon: "home", family: "ion" },
  Pantry: { label: "Tủ", icon: "fridge-outline", activeIcon: "fridge", family: "mci" },
  MealSuggestion: { label: "Công thức", icon: "silverware-fork-knife", activeIcon: "silverware-fork-knife", family: "mci" },
  Plan: { label: "Thực đơn", icon: "calendar-outline", activeIcon: "calendar", family: "ion" },
  Profile: { label: "Cá nhân", icon: "person-outline", activeIcon: "person", family: "ion" }
} as const;

function TabIcon({ routeName, focused }: { routeName: keyof typeof tabMeta; focused: boolean }) {
  const meta = tabMeta[routeName];
  const name = focused ? meta.activeIcon : meta.icon;
  const color = focused ? colors.primary : colors.tabText;
  if (meta.family === "mci") {
    return <MaterialCommunityIcons name={name as never} size={22} color={color} />;
  }
  return <Ionicons name={name as never} size={22} color={color} />;
}

function AnimatedTabButton({
  routeName,
  focused,
  label,
  onPress,
  onLongPress
}: {
  routeName: keyof typeof tabMeta;
  focused: boolean;
  label: string;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const progress = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(progress, {
      toValue: focused ? 1 : 0,
      useNativeDriver: true,
      damping: 13,
      stiffness: 180,
      mass: 0.65
    }).start();
  }, [focused, progress]);

  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] });
  const labelOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] });

  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Animated.View
        style={{
          width: 52,
          height: 46,
          borderRadius: 23,
          alignItems: "center",
          justifyContent: "center",
          transform: [{ scale }]
        }}
      >
        <TabIcon routeName={routeName} focused={focused} />
      </Animated.View>
      <Animated.Text
        numberOfLines={1}
        style={{
          marginTop: -4,
          color: focused ? colors.primary : colors.tabText,
          fontSize: 10,
          fontWeight: "900",
          opacity: labelOpacity
        }}
      >
        {label}
      </Animated.Text>
    </Pressable>
  );
}

function GlassTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { width } = useWindowDimensions();
  const indicator = useRef(new Animated.Value(state.index)).current;
  const tabWidth = useMemo(() => (width - 36 - 16) / state.routes.length, [state.routes.length, width]);
  const translateX = Animated.multiply(indicator, tabWidth);

  useEffect(() => {
    Animated.spring(indicator, {
      toValue: state.index,
      useNativeDriver: true,
      damping: 16,
      stiffness: 170,
      mass: 0.8
    }).start();
  }, [indicator, state.index]);

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 18,
        right: 18,
        bottom: 34,
        height: 66,
        borderRadius: 28,
        borderCurve: "continuous",
        backgroundColor: "rgba(255,255,255,0.30)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.45)",
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 8,
        boxShadow: "0 -8px 28px rgba(0,0,0,0.28)",
        overflow: "visible"
      }}
    >
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: 8,
          top: 4,
          width: tabWidth,
          alignItems: "center",
          transform: [{ translateX }]
        }}
      >
        <View
          style={{
            width: 54,
            height: 54,
            borderRadius: 27,
            backgroundColor: "rgba(244,162,28,0.22)",
            borderWidth: 1,
            borderColor: "rgba(244,162,28,0.86)",
            boxShadow: "0 8px 22px rgba(244,162,28,0.34)"
          }}
        />
      </Animated.View>

      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const options = descriptors[route.key].options;
        const label = typeof options.title === "string" ? options.title : tabMeta[route.name as keyof typeof tabMeta].label;

        const onPress = () => {
          const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <AnimatedTabButton
            key={route.key}
            routeName={route.name as keyof typeof tabMeta}
            focused={focused}
            label={label}
            onPress={onPress}
            onLongPress={() => navigation.emit({ type: "tabLongPress", target: route.key })}
          />
        );
      })}
    </View>
  );
}

function Tabs() {
  return (
    <Tab.Navigator tabBar={(props) => <GlassTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: "Hôm nay" }} />
      <Tab.Screen name="Pantry" component={PantryScreen} options={{ title: "Tủ" }} />
      <Tab.Screen name="MealSuggestion" component={MealSuggestionScreen} options={{ title: "Công thức" }} />
      <Tab.Screen name="Plan" component={PlanScreen} options={{ title: "Thực đơn" }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: "Cá nhân" }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  const [introStage, setIntroStage] = useState<"splash" | "onboarding" | "ready">("splash");

  useEffect(() => {
    if (isLoading) return;

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

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      {isAuthenticated ? (
        <>
          <Stack.Screen name="Tabs" component={Tabs} />
          <Stack.Screen name="AddIngredient" component={AddIngredientScreen} />
          <Stack.Screen name="CreateRecipe" component={CreateRecipeScreen} />
          <Stack.Screen name="RecipeDetail" component={RecipeDetailScreen} />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}
