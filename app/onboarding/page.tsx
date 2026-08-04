import { redirectToSavedStep } from "@/lib/onboarding";

export const dynamic = "force-dynamic";
export default async function OnboardingIndex() { await redirectToSavedStep(); }
