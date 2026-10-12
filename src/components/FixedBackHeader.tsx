import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackHeaderProps } from '@react-navigation/native-stack';
import AppBackButton from './AppBackButton';
import { colors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { layoutTokens } from '@/constants/responsive';

/** Navigation renders this outside scrolling content, so Back never scrolls away. */
export default function FixedBackHeader({ navigation, route }: NativeStackHeaderProps) {
  const { completeOnboardingStep } = useAuth();
  const firstSurvey = route.name === 'ProfileSetup' && !(route.params as { editing?: boolean } | undefined)?.editing;
  const back = async () => {
    if (firstSurvey) { await completeOnboardingStep('done'); navigation.reset({ index: 0, routes: [{ name: 'Tabs' }] }); }
    else if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('Tabs');
  };

  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: colors.background }}>
      <View
        testID="fixed-back-header"
        style={{
          width: '100%',
          borderBottomWidth: 1,
          borderColor: colors.line,
          backgroundColor: colors.background
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: layoutTokens.contentMaxWidth,
            alignSelf: 'center',
            minHeight: 56,
            paddingHorizontal: 16,
            paddingVertical: 6,
            alignItems: 'flex-start',
            justifyContent: 'center'
          }}
        >
          <AppBackButton label={firstSurvey ? 'Để sau' : 'Quay lại'} onPress={() => void back()} />
        </View>
      </View>
    </SafeAreaView>
  );
}
