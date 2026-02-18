import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/app.css";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="page-card"><p>Loading...</p></div></div>;
  if (!user) return <Navigate to="/" replace />;
  return children;
}
