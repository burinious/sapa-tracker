import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ minHeight:"100vh", display:"grid", placeItems:"center" }}><p>Loading...</p></div>;
  if (!user) return <Navigate to="/" replace />;
  return children;
}
