import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import ScrollView from '@/components/ScreenScrollView';
import Text from '@/components/AppText';
import FigmaAsset from '@/components/FigmaAsset';
import { overviewAssets as assets } from '@/constants/figmaAssets';
import { colors } from '@/constants/colors';
import { useSizeClass } from '@/hooks/useSizeClass';

export default function OnboardingScreen({ onStart }: { onStart: () => void }) {
  const { width, height, isLandscape, isCompact } = useSizeClass();
  const plateSize = isLandscape
    ? Math.min(Math.round(height * 0.42), 220)
    : Math.min(width - 80, Math.round(height * 0.32), 300);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.dark }} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: isCompact ? 20 : 36,
          paddingVertical: isLandscape ? 16 : 36,
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <View
          style={{
            flexDirection: isLandscape ? 'row' : 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: isLandscape ? 28 : 14,
            width: '100%',
            maxWidth: isLandscape ? 840 : 440
          }}
        >
          <View style={{ alignItems: 'center', gap: isLandscape ? 8 : 12 }}>
            <FigmaAsset asset={assets.imgLogoZPantryVer51} label="Z Pantry" />
            <FigmaAsset
              asset={assets.imgChatGptImage00274118Thg620261}
              style={{ width: plateSize, height: plateSize }}
              label="Đĩa cá hồi với rau củ trong thiết kế Z Pantry"
            />
          </View>
          <View
            style={{
              flex: isLandscape ? 1 : undefined,
              alignItems: isLandscape ? 'flex-start' : 'center',
              gap: 8,
              width: '100%'
            }}
          >
            <Text
              style={{
                color: colors.white,
                fontFamily: 'Inter_700Bold',
                fontWeight: '700',
                fontSize: isLandscape ? 18 : isCompact ? 20 : 23,
                lineHeight: isLandscape ? 24 : isCompact ? 28 : 34,
                textAlign: isLandscape ? 'left' : 'center'
              }}
            >
              GỢI Ý CÔNG THỨC NẤU ĂN TỪ NHỮNG NGUYÊN LIỆU CÓ SẴN
            </Text>
            <Text
              style={{
                color: colors.white,
                fontFamily: 'Inter_500Medium',
                fontSize: isLandscape ? 13 : isCompact ? 14 : 17,
                lineHeight: isLandscape ? 18 : 22,
                textAlign: isLandscape ? 'left' : 'center'
              }}
            >
              Không còn phải băn khoăn hôm nay ăn gì. Mọi bữa ăn đều được cá nhân hóa theo nhu cầu của riêng bạn.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Bắt đầu"
              onPress={onStart}
              style={({ pressed }) => ({
                marginTop: isLandscape ? 8 : 12,
                minHeight: 52,
                width: isLandscape ? 240 : isCompact ? '100%' : 280,
                borderRadius: 14,
                paddingHorizontal: 20,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                backgroundColor: colors.primary,
                boxShadow: '0 4px 4px rgba(0,0,0,0.25)',
                opacity: pressed ? 0.8 : 1
              })}
            >
              <Text style={{ color: colors.white, fontSize: 20, fontWeight: '700', fontFamily: 'Inter_700Bold' }}>
                BẮT ĐẦU
              </Text>
              <FigmaAsset asset={assets.imgArrowRightLine} />
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
