import { Pressable, View } from 'react-native';
import AppInput from './AppInput';
import Text from './AppText';
import { colors } from '@/constants/colors';
import { expiryDateFromDays } from '@/utils/expiryDays';
import { layoutTokens } from '@/constants/responsive';

type Props = { value: string; onChange: (value: string) => void; disabled?: boolean };

export default function ExpiryDaysField({ value, onChange, disabled }: Props) {
  let hint = 'Để trống nếu chưa biết hạn dùng. Nhập 0 nếu hết hạn hôm nay.';
  try {
    const date = expiryDateFromDays(value);
    if (date) hint = `Hết hạn ngày ${date.split('-').reverse().join('/')}`;
  } catch {
    hint = Number(value) < 0 ? `Đã hết hạn ${Math.abs(Number(value))} ngày. Có thể nhập hạn dùng mới.` : 'Vui lòng nhập số ngày nguyên, từ 0 đến 36500.';
  }
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: colors.text, fontWeight: '700' }}>Hạn dùng (số ngày còn lại)</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <AppInput
          accessibilityLabel="Hạn dùng (số ngày còn lại)"
          value={value}
          onChangeText={onChange}
          keyboardType="number-pad"
          inputMode="numeric"
          placeholder="Ví dụ: 7"
          placeholderTextColor={colors.muted}
          editable={!disabled}
          style={{ flex: 1 }}
        />
        <Text style={{ color: colors.text, fontWeight: '600' }}>ngày</Text>
        {value ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Xóa hạn dùng"
            disabled={disabled}
            onPress={() => onChange('')}
            hitSlop={layoutTokens.hitSlop48From44}
            style={{ minHeight: 44, paddingHorizontal: 8, justifyContent: 'center' }}
          >
            <Text style={{ color: colors.primaryDark, fontWeight: '600' }}>Xóa</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 20 }}>{hint}</Text>
    </View>
  );
}
