import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CategoryChip from "@/components/CategoryChip";
import PrimaryButton from "@/components/PrimaryButton";
import { colors } from "@/constants/colors";
import { userProfile } from "@/constants/mockData";

export default function ProfileScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 20, paddingBottom: 112, gap: 18 }}>
        <View style={{ backgroundColor: colors.card, borderRadius: 32, borderCurve: "continuous", padding: 20, alignItems: "center", gap: 13, boxShadow: "0 10px 24px rgba(29, 36, 40, 0.10)" }}>
          <Image source={{ uri: userProfile.avatar }} style={{ width: 96, height: 96, borderRadius: 34, backgroundColor: colors.secondary }} />
          <Text style={{ color: colors.dark, fontSize: 28, fontWeight: "900" }} selectable>
            {userProfile.name}
          </Text>
          <Text style={{ color: colors.muted, fontWeight: "700" }} selectable>
            Food saver level 6
          </Text>
        </View>

        <View style={{ backgroundColor: colors.card, borderRadius: 28, borderCurve: "continuous", padding: 18, gap: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Ionicons name="flag" size={22} color={colors.primary} />
            <Text style={{ color: colors.dark, fontSize: 20, fontWeight: "900" }} selectable>
              Mục tiêu
            </Text>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {userProfile.goals.map((goal) => (
              <CategoryChip key={goal} label={goal} icon="check-circle-outline" />
            ))}
          </View>
        </View>

        <View style={{ backgroundColor: colors.card, borderRadius: 28, borderCurve: "continuous", padding: 18, gap: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <MaterialCommunityIcons name="silverware-fork-knife" size={22} color={colors.primary} />
            <Text style={{ color: colors.dark, fontSize: 20, fontWeight: "900" }} selectable>
              Cài đặt khẩu vị
            </Text>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {userProfile.preferences.map((preference) => (
              <CategoryChip key={preference} label={preference} icon="heart-outline" />
            ))}
          </View>
        </View>

        <View style={{ backgroundColor: colors.dark, borderRadius: 30, borderCurve: "continuous", padding: 20, gap: 14 }}>
          <View style={{ width: 54, height: 54, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" }}>
            <MaterialCommunityIcons name="crown" size={28} color={colors.primary} />
          </View>
          <Text style={{ color: colors.white, fontSize: 22, fontWeight: "900" }} selectable>
            Z-Pantry Premium
          </Text>
          <Text style={{ color: colors.secondary, fontWeight: "700", lineHeight: 22 }} selectable>
            Mock premium: lập kế hoạch thông minh, danh sách mua sắm tự động và báo cáo tiết kiệm mỗi tháng.
          </Text>
          <PrimaryButton title="Xem gói nâng cấp" icon="star-four-points" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
