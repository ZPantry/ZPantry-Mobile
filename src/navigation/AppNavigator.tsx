import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { colors } from "@/constants/colors";
import AddIngredientScreen from "@/screens/AddIngredientScreen";
import HomeScreen from "@/screens/HomeScreen";
import LoginScreen from "@/screens/LoginScreen";
import MealSuggestionScreen from "@/screens/MealSuggestionScreen";
import PantryScreen from "@/screens/PantryScreen";
import PlanScreen from "@/screens/PlanScreen";
import ProfileScreen from "@/screens/ProfileScreen";
import RecipeDetailScreen from "@/screens/RecipeDetailScreen";
import type { RootStackParamList, TabParamList } from "@/types";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          height: 78,
          paddingTop: 8,
          paddingBottom: 12,
          backgroundColor: colors.card,
          borderTopWidth: 0,
          boxShadow: "0 -8px 22px rgba(29, 36, 40, 0.08)"
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: "800" },
        tabBarIcon: ({ color, size, focused }) => {
          const iconSize = focused ? size + 2 : size;
          if (route.name === "Home") return <Ionicons name="home" size={iconSize} color={color} />;
          if (route.name === "Pantry") return <MaterialCommunityIcons name="fridge" size={iconSize} color={color} />;
          if (route.name === "MealSuggestion") return <MaterialCommunityIcons name="silverware-fork-knife" size={iconSize} color={color} />;
          if (route.name === "Plan") return <Ionicons name="calendar" size={iconSize} color={color} />;
          return <Ionicons name="person" size={iconSize} color={color} />;
        }
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: "Home" }} />
      <Tab.Screen name="Pantry" component={PantryScreen} options={{ title: "Kho" }} />
      <Tab.Screen name="MealSuggestion" component={MealSuggestionScreen} options={{ title: "Công thức" }} />
      <Tab.Screen name="Plan" component={PlanScreen} options={{ title: "Kế hoạch" }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: "Cá nhân" }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Tabs" component={Tabs} />
      <Stack.Screen name="AddIngredient" component={AddIngredientScreen} />
      <Stack.Screen name="RecipeDetail" component={RecipeDetailScreen} />
    </Stack.Navigator>
  );
}
