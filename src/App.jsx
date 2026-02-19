import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { AuthProvider } from "./context/AuthContext";
import CoachPushTriggers from "./components/CoachPushTriggers";
import PushNotificationsBootstrap from "./components/PushNotificationsBootstrap";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

import Login from "./pages/Login";
import Register from "./pages/Register";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import AddTransaction from "./pages/AddTransaction";
import HouseShopping from "./pages/HouseShopping";
import Subscriptions from "./pages/Subscriptions";
import EditProfile from "./pages/EditProfile";
import SapaAI from "./pages/SapaAI";
import Settings from "./pages/Settings";

import CoachPage from "./features/coach/CoachPage";
import EntriesPage from "./features/entries/EntriesPage";
import EntryFormPage from "./features/entries/EntryFormPage";
import LoansPage from "./features/loans/LoansPage";
import BudgetsPage from "./features/budgets/BudgetsPage";

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <ToastContainer position="top-right" autoClose={2500} />
        <PushNotificationsBootstrap />
        <CoachPushTriggers />
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/coach" element={<CoachPage />} />

            <Route path="/add-transaction" element={<AddTransaction />} />
            <Route path="/transactions" element={<Transactions />} />

            <Route path="/entries" element={<EntriesPage />} />
            <Route path="/entries/new" element={<EntryFormPage />} />
            <Route path="/entries/:id/edit" element={<EntryFormPage />} />

            <Route path="/loans" element={<LoansPage />} />
            <Route path="/budgets" element={<BudgetsPage />} />

            <Route path="/house-shopping" element={<HouseShopping />} />
            <Route path="/subscriptions" element={<Subscriptions />} />
            <Route path="/ai" element={<SapaAI />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/edit-profile" element={<EditProfile />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}
