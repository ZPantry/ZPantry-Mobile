import { apiRequest } from "@/api/client";
export type Quota={feature:"MEAL_SUGGESTION"|"OCR";limit:number|null;used:number;remaining:number|null;resetsOn:string};
export type Subscription={planCode:"Z_FREE"|"Z_PLUS";status:string;startedAt:string|null;expiresAt:string|null;autoRenew:boolean;quotas:Quota[]};
export type Plan={code:"Z_FREE"|"Z_PLUS";name:string;priceVnd:number;durationDays:number;description:string};
export const subscriptionApi={current:()=>apiRequest<Subscription>("/api/me/subscription",{auth:true}),plans:()=>apiRequest<Plan[]>("/api/me/subscription/plans",{auth:true}),checkout:()=>apiRequest<{transactionId:string;checkoutUrl:string|null}>("/api/me/subscription/checkout",{method:"POST",auth:true,body:JSON.stringify({provider:"PAYOS"})}),cancel:()=>apiRequest<{message:string}>("/api/me/subscription/cancel",{method:"POST",auth:true})};
