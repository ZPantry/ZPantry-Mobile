import { useCallback } from "react";
import { subscriptionApi, type Quota } from "@/api/subscription";
import { useToast } from "@/context/ToastContext";

type LimitedFeature = "MEAL_SUGGESTION" | "OCR";

function labelFor(feature: LimitedFeature) {
  return feature === "OCR" ? "Nhận diện ảnh" : "Gợi ý món";
}

/** Displays the server-owned remaining allowance after a successful limited action. */
export function useQuotaWarning() {
  const toast = useToast();

  return useCallback(async (feature: LimitedFeature) => {
    try {
      const subscription = await subscriptionApi.current();
      const quota: Quota | undefined = subscription.quotas.find((item) => item.feature === feature);
      if (quota?.remaining !== null && quota?.remaining !== undefined && quota.remaining < 5) {
        toast.show(`${labelFor(feature)}: còn ${quota.remaining} lượt trước khi đặt lại.`, quota.remaining === 0 ? "danger" : "info");
      }
    } catch {
      // A non-essential notice must never block the completed action.
    }
  }, [toast]);
}
