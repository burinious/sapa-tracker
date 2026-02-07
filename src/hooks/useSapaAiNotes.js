import { useMemo } from "react";
import { generateSapaInsights } from "../ai/sapaEngine";

export default function useSapaAiNotes({
  transactions = [],
  subscriptions = [],
  computed = null,
  profile = { currency: "NGN", riskWindowDays: 7 },
}) {
  const notes = useMemo(() => {
    return generateSapaInsights({ transactions, subscriptions, computed, profile });
  }, [transactions, subscriptions, computed, profile]);

  return { notes };
}
