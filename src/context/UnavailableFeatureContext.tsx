import { MaterialCommunityIcons } from "@expo/vector-icons";
import { createContext, useContext, useState, type ReactNode } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import PrimaryButton from "@/components/PrimaryButton";
import { colors } from "@/constants/colors";

const UnavailableFeatureContext = createContext<(name: string) => void>(() => {});

export function UnavailableFeatureProvider({ children }: { children: ReactNode }) {
  const [feature, setFeature] = useState<string | null>(null);
  const close = () => setFeature(null);
  return <UnavailableFeatureContext.Provider value={setFeature}>
    {children}
    <Modal transparent visible={feature !== null} animationType="fade" onRequestClose={close}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,24,10,0.45)", justifyContent: "center", alignItems: "center", padding: 24 }}>
        <Pressable accessibilityLabel="Đóng thông báo" onPress={close} style={{ position: "absolute", inset: 0 }} />
        <View accessibilityViewIsModal style={{ width: "100%", maxWidth: 380, backgroundColor: colors.surface, borderRadius: 16, padding: 24, gap: 16 }}>
          <MaterialCommunityIcons name="clock-outline" size={32} color={colors.primaryDark} />
          <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 21, lineHeight: 28, fontWeight: "700" }}>Chức năng này chưa khả dụng</Text>
          <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 22 }}>{feature} đang được hoàn thiện. Bạn có thể tiếp tục sử dụng các tính năng khác.</Text>
          <PrimaryButton title="Đã hiểu" onPress={close} />
        </View>
      </View>
    </Modal>
  </UnavailableFeatureContext.Provider>;
}

export const useUnavailableFeature = () => useContext(UnavailableFeatureContext);
