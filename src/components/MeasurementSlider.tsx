import { Host, Slider } from '@expo/ui';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Text from './AppText';
import { colors } from '@/constants/colors';
import { layoutTokens } from '@/constants/responsive';

export default function MeasurementSlider({ label, value, onChange, unit, min, max, fallback, disabled, icon }: {
  label: string; value: string; onChange: (v: string) => void; unit: string; min: number; max: number; fallback: number; disabled?: boolean;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
}) {
  const current = value ? Number(value) : fallback;
  const [expanded, setExpanded] = useState(false);
  const low = Math.min(expanded ? (unit === 'cm' ? 50 : 20) : min, current), high = Math.max(expanded ? (unit === 'cm' ? 300 : 500) : max, current);
  const change = (n: number) => onChange(String(Math.max(low, Math.min(high, Math.round(n * 10) / 10))));

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
        <MaterialCommunityIcons name={icon} size={19} color={colors.muted} />
        <Text style={{ flex: 1, color: colors.text }}>{label}</Text>
        <Text accessibilityLiveRegion="polite" style={{ color: colors.primaryDark, fontSize: 24, fontWeight: '700' }}>
          {value || '—'} <Text style={{ fontSize: 12, color: colors.muted }}>{unit}</Text>
        </Text>
      </View>
      <View accessibilityLabel={label}>
        <Host colorScheme="light" seedColor={colors.primary} style={{ minHeight: 44, width: '100%' }}>
          <Slider testID={`slider-${unit}`} value={current} min={low} max={high} step={unit === 'cm' ? 1 : 0.1} onValueChange={change} disabled={disabled} />
        </Host>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {[low, (low + high) / 2, high].map(n => (
          <Text key={n} style={{ color: colors.muted, fontSize: 11 }}>{n} {unit}</Text>
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Giảm ${label}`}
          disabled={disabled}
          onPress={() => change(current - (unit === 'cm' ? 1 : 0.1))}
          hitSlop={layoutTokens.hitSlop48From44}
          style={{ backgroundColor: colors.secondary, borderRadius: 12, width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ color: colors.primaryDark, fontSize: 24, fontWeight: '700' }}>−</Text>
        </Pressable>
        <Text style={{ flex: 1, textAlign: 'center', color: colors.muted, fontSize: 12 }}>
          Kéo để chọn · Chạm + / − để chỉnh
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Tăng ${label}`}
          disabled={disabled}
          onPress={() => change(current + (unit === 'cm' ? 1 : 0.1))}
          hitSlop={layoutTokens.hitSlop48From44}
          style={{ backgroundColor: colors.secondary, borderRadius: 12, width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ color: colors.primaryDark, fontSize: 24, fontWeight: '700' }}>+</Text>
        </Pressable>
      </View>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={() => setExpanded(v => !v)}
        style={{ minHeight: 48, justifyContent: 'center', alignItems: 'center' }}
      >
        <Text style={{ color: colors.primaryDark, fontSize: 12, fontWeight: '600' }}>
          {expanded ? 'Thu gọn khoảng đo' : 'Mở rộng khoảng đo'}
        </Text>
      </Pressable>
    </View>
  );
}
