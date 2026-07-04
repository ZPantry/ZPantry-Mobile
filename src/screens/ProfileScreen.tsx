import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { ComponentProps, ReactNode } from "react";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppBackButton from "@/components/AppBackButton";
import LogoutConfirmModal from "@/components/LogoutConfirmModal";
import { colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { user, signOut } = useAuth();
  const [isLogoutVisible, setIsLogoutVisible] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const displayName = user?.fullName || "Bạn";
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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 22, paddingBottom: 118, gap: 22 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <AppBackButton onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate("Home"))} />
          <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="notifications-outline" size={21} color={colors.text} />
            <View style={{ position: "absolute", top: 3, right: 4, width: 12, height: 12, borderRadius: 6, backgroundColor: colors.danger }} />
          </View>
        </View>

        <View style={{ alignItems: "center", gap: 10 }}>
          <View style={{ width: 118, height: 118, borderRadius: 59, borderWidth: 9, borderColor: colors.white, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="person" size={76} color={colors.white} />
            <View style={{ position: "absolute", right: 2, bottom: 6, width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
              <MaterialCommunityIcons name="star-four-points" size={20} color={colors.background} />
            </View>
          </View>
          <Text style={{ color: colors.text, fontSize: 25, fontWeight: "900", textAlign: "center", textTransform: "uppercase" }} selectable>
            {displayName}
          </Text>
          <View style={{ borderRadius: 999, backgroundColor: "rgba(255,255,255,0.20)", paddingHorizontal: 10, paddingVertical: 4, flexDirection: "row", alignItems: "center", gap: 4 }}>
            <MaterialCommunityIcons name="diamond-stone" size={13} color={colors.primary} />
            <Text style={{ color: colors.primary, fontSize: 11, fontWeight: "900" }} selectable>
              Thành viên Z-Pantry
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 14, justifyContent: "center" }}>
          <QuickButton icon="cart-outline" label="Danh sách mua" />
          <QuickButton icon="heart-outline" label="Món yêu thích" />
        </View>

        <Section title="Thông tin cá nhân">
          <InfoRow label="Tên hiển thị" value={displayName} icon="account-outline" editable={false} />
          <InfoRow label="Email" value={displayEmail} icon="email-outline" editable={false} />
        </Section>

        <Section title="Thói quen ăn uống">
          <SettingRow title="Mục tiêu bữa ăn" />
          <SettingRow title="Khẩu vị yêu thích" />
          <SettingRow title="Món cần hạn chế" />
        </Section>

        <Section title="Cài đặt">
          <SettingRow title="Thông tin tài khoản" />
          <SettingRow title="Riêng tư và an toàn" />
          <SettingRow title="Thông báo bữa ăn" />
          <SettingRow title="Trung tâm hỗ trợ" />
          <View style={{ backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 10, padding: 14, borderWidth: 1, borderColor: colors.line }}>
            <Text style={{ color: colors.text, fontSize: 24, fontWeight: "900" }} selectable>
              1900 1009 <Text style={{ color: colors.primary }}>HOTLINE</Text>
            </Text>
            <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "900" }} selectable>
              Gọi cho chúng tôi khi bạn cần hỗ trợ
            </Text>
          </View>
          <Pressable
            onPress={() => setIsLogoutVisible(true)}
            style={({ pressed }) => ({
              minHeight: 50,
              borderRadius: 10,
              backgroundColor: colors.primary,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 8,
              opacity: pressed ? 0.82 : 1
            })}
          >
            <MaterialCommunityIcons name="logout" size={21} color={colors.white} />
            <Text style={{ color: colors.white, fontSize: 15, fontWeight: "900" }} selectable>
              Đăng xuất
            </Text>
          </Pressable>
        </Section>
      </ScrollView>
      <LogoutConfirmModal visible={isLogoutVisible} isSigningOut={isSigningOut} onStay={() => setIsLogoutVisible(false)} onConfirm={confirmSignOut} />
    </SafeAreaView>
  );
}

function QuickButton({ icon, label, onPress }: { icon: ComponentProps<typeof MaterialCommunityIcons>["name"]; label: string; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 70,
        borderRadius: 10,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.line,
        alignItems: "center",
        justifyContent: "center",
        gap: 5,
        opacity: pressed ? 0.82 : 1
      })}
    >
      <MaterialCommunityIcons name={icon} size={32} color={colors.primary} />
      <Text style={{ color: colors.text, fontSize: 13, fontWeight: "900", textAlign: "center" }} selectable>
        {label}
      </Text>
    </Pressable>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: colors.text, fontSize: 16, fontWeight: "900" }} selectable>
        {title}
      </Text>
      <View style={{ backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 12 }}>{children}</View>
    </View>
  );
}

function InfoRow({ label, value, icon, editable = true }: { label: string; value: string; icon: ComponentProps<typeof MaterialCommunityIcons>["name"]; editable?: boolean }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: colors.text, fontSize: 12, fontWeight: "900" }} selectable>
        {label}
      </Text>
      <View style={{ minHeight: 38, borderRadius: 9, backgroundColor: "rgba(255,255,255,0.18)", borderWidth: 1, borderColor: colors.line, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 10 }}>
        <MaterialCommunityIcons name={icon} size={18} color={colors.primary} />
        <Text style={{ flex: 1, color: colors.text, fontSize: 13, fontWeight: "700" }} numberOfLines={1}>
          {value}
        </Text>
        {editable ? (
          <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "900" }} selectable>
            Thay đổi
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function SettingRow({ title }: { title: string }) {
  return (
    <View style={{ minHeight: 42, borderRadius: 9, backgroundColor: "rgba(255,255,255,0.16)", borderWidth: 1, borderColor: colors.line, justifyContent: "center", paddingHorizontal: 12 }}>
      <Text style={{ color: colors.text, fontSize: 13, fontWeight: "700" }} selectable>
        {title}
      </Text>
    </View>
  );
}
