import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import EntriesPage from "./features/entries/EntriesPage";
import EntryFormPage from "./features/entries/EntryFormPage";
import LoansPage from "./features/loans/LoansPage";
import BudgetsPage from "./features/budgets/BudgetsPage";
import CoachPage from "./features/coach/CoachPage";

// NOTE: Replace these props with your real auth/context values.
export default function AppRoutes({ uid, coachInput }) {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/coach" replace />} />

      <Route path="/coach" element={<CoachPage coachInput={coachInput} />} />

      <Route path="/entries" element={<EntriesPage uid={uid} />} />
      <Route path="/entries/new" element={<EntryFormPage uid={uid} />} />
      <Route path="/entries/:id/edit" element={<EntryFormPage uid={uid} />} />

      <Route path="/loans" element={<LoansPage uid={uid} />} />
      <Route path="/budgets" element={<BudgetsPage uid={uid} />} />

      <Route path="*" element={<div style={{ padding: 16 }}>Page not found</div>} />
    </Routes>
  );
}
