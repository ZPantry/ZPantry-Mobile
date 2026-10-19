import type { ReactNode } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/** Dialogs can scroll on short screens and stay clear of landscape cutouts. */
export default function ModalBackdrop({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'rgba(0,24,10,0.58)' }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
