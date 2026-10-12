import { userDisplayName } from '@/utils/userProfile';
import FigmaAsset from '@/components/FigmaAsset';
import { profileAssets as assets } from '@/constants/figmaAssets';
import Text from "@/components/AppText";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { Pressable, View } from "react-native";
import ScrollView from "@/components/ScreenScrollView";
import { SafeAreaView } from "react-native-safe-area-context";
import { ActionRow } from "@/components/BrandPanel";
import PrimaryButton from "@/components/PrimaryButton";
import LogoutConfirmModal from "@/components/LogoutConfirmModal";
import { colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

import { useUnavailableFeature } from "@/context/UnavailableFeatureContext";

import { useSizeClass } from "@/hooks/useSizeClass";
import { layoutTokens } from "@/constants/responsive";

export default function ProfileScreen() {
  const { isCompact, isLandscape } = useSizeClass();
  const showUnavailable = useUnavailableFeature();
  const navigation = useNavigation<any>();
  const { user, signOut } = useAuth();
  const [isLogoutVisible, setIsLogoutVisible] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const displayName = userDisplayName(user);
  const displayEmail = user?.email || "Chưa có email";

  const confirmSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
    } finally {
      setIsSigningOut(false);
      setIsLogoutVisible(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top", "bottom", "left", "right"]}>
      <ScrollView
        testID="profile-scroll"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingHorizontal: isCompact ? 16 : 24,
          paddingTop: isLandscape ? 16 : isCompact ? 52 : 32,
          paddingBottom: isCompact ? 116 : 40,
          gap: 18,
          maxWidth: 680,
          width: "100%",
          alignSelf: "center"
        }}
      >
        <View style={{ alignItems: "center", gap: 10, paddingVertical: 16 }}>
          <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: colors.surface2, borderWidth: 4, borderColor: "#FFDBBD", alignItems: "center", justifyContent: "center" }}>
            <FigmaAsset asset={assets.imgNguynThuyLinh} style={{ borderRadius: 44 }} />
          </View>
          <Text style={{ color: colors.text, fontSize: 24, fontWeight: "700" }}>{displayName}</Text>
          <View style={{ backgroundColor: "#FFDCC6", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, flexDirection: "row", gap: 6, alignItems: "center" }}>
            <FigmaAsset asset={assets.imgContainer1} /><Text style={{ color: "#311300", fontSize: 11, fontWeight: "600" }}>Thành viên Z-Pantry</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12 }}>
            <FigmaAsset asset={assets.imgContainer2} /><Text selectable style={{ color: colors.muted, fontSize: 12 }}>{displayEmail}</Text>
          </View>
        </View>
        <View style={{ padding: 20, borderRadius: 12, backgroundColor: "#00291A", gap: 16, overflow: "hidden" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}><FigmaAsset asset={assets.imgContainer5} /></View>
            <View style={{ flex: 1, gap: 3 }}><Text style={{ color: "#FFDCC6", fontSize: 11, fontWeight: "600", letterSpacing: 0.55 }}>ĐẶC QUYỀN HỘI VIÊN</Text><Text style={{ color: "white", fontSize: 20, fontWeight: "700" }}>PANTRY VIP</Text></View>
            <Text style={{ color: "#F9F9F7", backgroundColor: "#FFFFFF26", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, fontSize: 11 }}>Z-Plus</Text>
          </View>
          <Text style={{ color: "#E2E3E1", fontSize: 14, lineHeight: 21 }}>Nâng tầm trải nghiệm bếp với gợi ý món không giới hạn và nhiều lượt nhận diện ảnh hơn mỗi ngày.</Text>
          <View style={{ backgroundColor: "#FFFFFF1A", borderRadius: 8, padding: 14, gap: 10 }}>
            <Text style={{ color: "#FFFFFF", fontSize: 12, lineHeight: 18 }}>Xem quyền lợi, hạn mức và nâng cấp gói an toàn qua PayOS.</Text>
            <Pressable accessibilityRole="button" onPress={() => navigation.navigate("ProfileSetup", { editing: true })} style={{ minHeight: 48, justifyContent: "center" }}><Text style={{ color: "#FFDCC6", fontSize: 12, fontWeight: "600" }}>Cá nhân hóa khẩu vị →</Text></Pressable>
          </View>
          <PrimaryButton title="Khám phá gói VIP" onPress={() => navigation.navigate("Subscription")} />
        </View>
        <View style={{ gap: 2, backgroundColor: colors.surface, borderRadius: 12, overflow: "hidden" }}>
          <ActionRow icon="account-outline" title="Thông tin tài khoản" subtitle="Tên hiển thị, email và thông tin cá nhân" onPress={() => navigation.navigate("AccountSettings")} />
          <ActionRow asset={assets.imgContainer8} icon="fridge-outline" title="Quản lý tủ thực phẩm" subtitle="Các nguyên liệu đang có trong kho" onPress={() => navigation.navigate("Pantry")} />
          <ActionRow asset={assets.imgContainer10} icon="history" title="Lịch sử nấu ăn" subtitle="Xem lại các bữa ăn của bạn" onPress={() => navigation.navigate("CookingHistory")} />
          <ActionRow icon="tune-variant" title="Cài đặt khẩu vị & Dị ứng" subtitle="Mục tiêu, chế độ ăn và dị ứng thực phẩm" onPress={() => navigation.navigate("ProfileSetup", { editing: true })} />
          <ActionRow icon="help-circle-outline" title="Hướng dẫn sử dụng Z-Pantry" subtitle="Khám phá cách dùng ứng dụng" onPress={() => navigation.navigate("InteractiveGuide", { isReplay: true })} />
        </View>
        <View style={{ gap: 2, backgroundColor: colors.surface, borderRadius: 12, overflow: "hidden" }}>
          <ActionRow icon="devices" title="Kết nối thiết bị" upcoming onPress={() => showUnavailable("Kết nối thiết bị")} />
          <ActionRow asset={assets.imgContainer11} icon="bell-outline" title="Cài đặt thông báo" upcoming onPress={() => showUnavailable("Cài đặt thông báo")} />
          <ActionRow asset={assets.imgContainer13} icon="headset" title="Hỗ trợ & Phản hồi" upcoming onPress={() => showUnavailable("Hỗ trợ & Phản hồi")} />
        </View>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <PrimaryButton title="Nhập từ ảnh" icon="camera-outline" variant="soft" style={{ flex: 1 }} onPress={() => navigation.navigate("PantryImport")} />
          <PrimaryButton title="Gợi ý món" icon="silverware-fork-knife" variant="soft" style={{ flex: 1 }} onPress={() => navigation.navigate("MealSuggestion")} />
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Đăng xuất" onPress={() => setIsLogoutVisible(true)}
          style={({ pressed }) => ({ minHeight: 48, flexDirection: "row", gap: 8, justifyContent: "center", alignItems: "center", opacity: pressed ? 0.6 : 1 })}>
          <FigmaAsset asset={assets.imgContainer7} /><Text style={{ color: colors.danger, fontSize: 14, fontWeight: "600" }}>Đăng xuất</Text>
        </Pressable>
        <Text style={{ color: colors.muted, fontSize: 11, textAlign: "center" }}>Z-Pantry · Bếp nhỏ, cảm hứng lớn</Text>
      </ScrollView>
      <LogoutConfirmModal visible={isLogoutVisible} isSigningOut={isSigningOut} onStay={() => setIsLogoutVisible(false)} onConfirm={confirmSignOut} />
    </SafeAreaView>
  );
}
