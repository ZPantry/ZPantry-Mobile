import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Text, View } from "react-native";
import { colors } from "@/constants/colors";

type ToastTone = "success" | "danger" | "info";

type ToastState = {
  message: string;
  tone: ToastTone;
};

type ToastContextValue = {
  show: (message: string, tone?: ToastTone) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function toneMeta(tone: ToastTone) {
  if (tone === "danger") return { icon: "alert-circle", color: colors.danger };
  if (tone === "info") return { icon: "information", color: colors.primary };
  return { icon: "check-circle", color: colors.success };
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string, tone: ToastTone = "success") => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    setToast({ message, tone });
    timerRef.current = setTimeout(() => {
      setToast(null);
      timerRef.current = null;
    }, 2600);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const value = useMemo(() => ({ show }), [show]);
  const meta = toast ? toneMeta(toast.tone) : null;

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && meta ? (
        <View pointerEvents="none" style={{ position: "absolute", left: 18, right: 18, bottom: 118, alignItems: "center" }}>
          <View
            style={{
              maxWidth: 460,
              width: "100%",
              minHeight: 56,
              borderRadius: 16,
              backgroundColor: colors.white,
              borderWidth: 1,
              borderColor: `${meta.color}66`,
              paddingHorizontal: 14,
              paddingVertical: 12,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              boxShadow: "0 14px 30px rgba(0,0,0,0.24)"
            }}
          >
            <MaterialCommunityIcons name={meta.icon as never} size={24} color={meta.color} />
            <Text style={{ flex: 1, color: colors.textDark, fontSize: 14, fontWeight: "900", lineHeight: 20 }} selectable>
              {toast.message}
            </Text>
          </View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const value = useContext(ToastContext);
  if (!value) {
    throw new Error("useToast must be used inside ToastProvider.");
  }

  return value;
}
