import { apiRequest } from "@/api/client";
import { endpoints } from "@/api/endpoints";

export type ProductEvent =
  | "SCREEN_VIEW" | "AI_RECOGNITION_STARTED" | "AI_RECOGNITION_COMPLETED"
  | "AI_RECIPE_REQUESTED" | "AI_RECIPE_COMPLETED" | "RECIPE_SELECTED"
  | "PANTRY_ITEM_ADDED" | "MEAL_COMPLETED" | "UPGRADE_VIEWED"
  | "CHECKOUT_STARTED" | "PAYMENT_COMPLETED";

export const analyticsApi = {
  track(eventName: ProductEvent, screenName?: string, properties?: Record<string, unknown>) {
    return apiRequest(endpoints.analytics.events, { method: "POST", auth: true,
      body: JSON.stringify({ eventName, screenName, properties }) });
  },
  recognitionFeedback(analysisId: string, feedback: "LIKE" | "DISLIKE", reason?: string, correction?: string) {
    return apiRequest(endpoints.analytics.recognitionFeedback(analysisId), { method: "POST", auth: true,
      body: JSON.stringify({ feedback, reason, correction }) });
  }
};
