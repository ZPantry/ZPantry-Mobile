import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import Text from './AppText';
import SelectField from './SelectField';
import { colors } from '@/constants/colors';
import { layoutTokens } from '@/constants/responsive';

type Props = { label: string; value: string; onChange: (value: string) => void; disabled?: boolean; optional?: boolean; birthday?: boolean };
const pad = (n: number) => String(n).padStart(2, '0');
const parts = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) ? s.split('-') : ['', '', ''];

/** Keep date-only API values independent of the device timezone. */
export default function DateField({ label, value, onChange, disabled, optional, birthday }: Props) {
  const [draft, setDraft] = useState(() => parts(value));
  useEffect(() => { if (/^\d{4}-\d{2}-\d{2}$/.test(value)) setDraft(parts(value)); }, [value]);
  const [year, month, day] = draft;
  const now = new Date();
  const endYear = birthday ? now.getFullYear() : now.getFullYear() + 20;
  const startYear = Math.min(birthday ? 1900 : now.getFullYear() - 5, Number(year) || endYear);
  const days = month ? new Date(Number(year) || 2000, Number(month), 0).getDate() : 31;
  const update = (index: number, next: string) => {
    const updated = [...draft]; updated[index] = next;
    if (updated[1] && updated[2]) updated[2] = pad(Math.min(Number(updated[2]), new Date(Number(updated[0]) || 2000, Number(updated[1]), 0).getDate()));
    if (birthday && updated.every(Boolean)) {
      const selected = updated.join('-');
      const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      if (selected > today) updated.splice(0, 3, ...parts(today));
    }
    setDraft(updated); onChange(updated.some(Boolean) ? updated.join('-') : '');
  };

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: colors.text, fontWeight: '600', fontSize: 13 }}>{label}</Text>
        {optional && draft.some(Boolean) ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Xóa ${label}`}
            disabled={disabled}
            onPress={() => { setDraft(['', '', '']); onChange(''); }}
            hitSlop={layoutTokens.hitSlop48From44}
            style={{ minHeight: 44, paddingHorizontal: 8, justifyContent: 'center' }}
          >
            <Text style={{ color: colors.primaryDark, fontSize: 12, fontWeight: '600' }}>Bỏ ngày</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', gap: 6, backgroundColor: colors.surface, borderRadius: 16, padding: 8 }}>
        <View style={{ flex: 0.9, minWidth: 0 }}>
          <SelectField label={`${label} · Ngày`} displayLabel="Ngày" value={day} disabled={disabled} onValueChange={v => update(2, v)} options={[{ value: '', label: 'Ngày' }, ...Array.from({ length: days }, (_, i) => ({ value: pad(i + 1), label: pad(i + 1) }))]} />
        </View>
        <View style={{ flex: 1.1, minWidth: 0 }}>
          <SelectField label={`${label} · Tháng`} displayLabel="Tháng" value={month} disabled={disabled} onValueChange={v => update(1, v)} options={[{ value: '', label: 'Tháng' }, ...Array.from({ length: 12 }, (_, i) => ({ value: pad(i + 1), label: `Tháng ${pad(i + 1)}` }))]} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <SelectField label={`${label} · Năm`} displayLabel="Năm" value={year} disabled={disabled} onValueChange={v => update(0, v)} options={[{ value: '', label: 'Năm' }, ...Array.from({ length: endYear - startYear + 1 }, (_, i) => ({ value: String(endYear - i), label: String(endYear - i) }))]} />
        </View>
      </View>
    </View>
  );
}
