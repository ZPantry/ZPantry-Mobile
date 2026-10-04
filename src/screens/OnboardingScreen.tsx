import { Pressable, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import ScrollView from '@/components/ScreenScrollView';
import Text from '@/components/AppText';
import FigmaAsset from '@/components/FigmaAsset';
import { overviewAssets as assets } from '@/constants/figmaAssets';
import { colors } from '@/constants/colors';

export default function OnboardingScreen({ onStart }: { onStart: () => void }) {
  const { width } = useWindowDimensions();
  const plateSize = Math.min(width - 80, 360);
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.dark }}>
    <StatusBar style="light" />
    <ScrollView contentContainerStyle={{ flexGrow: 1, maxWidth: 440, paddingHorizontal: 42, paddingTop: 99, paddingBottom: 80, alignItems: 'center' }}>
      <FigmaAsset asset={assets.imgLogoZPantryVer51} label="Z Pantry" />
      <FigmaAsset asset={assets.imgChatGptImage00274118Thg620261} style={{ width: plateSize, height: plateSize }} label="Đĩa cá hồi với rau củ trong thiết kế Z Pantry" />
      <Text style={{ color: colors.white, fontFamily: 'Inter_700Bold', fontWeight: '700', fontSize: 23, lineHeight: 34, textAlign: 'center' }}>GỢI Ý CÔNG THỨC NẤU ĂN TỪ NHỮNG NGUYÊN LIỆU CÓ SẴN</Text>
      <Text style={{ marginTop: 4, color: colors.white, fontFamily: 'Inter_500Medium', fontSize: 18, lineHeight: 22, textAlign: 'center' }}>Không còn phải băn khoăn hôm nay ăn gì. Mọi bữa ăn đều được cá nhân hóa theo nhu cầu của riêng bạn.</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Bắt đầu" onPress={onStart} style={({ pressed }) => ({ marginTop: 21, minHeight: 88, borderRadius: 12, paddingHorizontal: 19, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: colors.primary, boxShadow: '0 4px 4px rgba(0,0,0,0.25)', opacity: pressed ? 0.8 : 1 })}>
        <Text style={{ color: colors.white, fontSize: 32, fontWeight: '700', fontFamily: 'Inter_700Bold' }}>BẮT ĐẦU</Text><FigmaAsset asset={assets.imgArrowRightLine} />
      </Pressable>
    </ScrollView>
  </SafeAreaView>;
}
