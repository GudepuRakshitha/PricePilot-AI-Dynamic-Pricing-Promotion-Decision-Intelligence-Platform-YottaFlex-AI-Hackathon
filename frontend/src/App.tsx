import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import About from "./pages/About";
import Analytics from "./pages/Analytics";
import Audit from "./pages/Audit";
import Competitors from "./pages/Competitors";
import Costs from "./pages/Costs";
import Dashboard from "./pages/Dashboard";
import Decisions from "./pages/Decisions";
import Exceptions from "./pages/Exceptions";
import Inventory from "./pages/Inventory";
import Login from "./pages/Login";
import Products from "./pages/Products";
import Promotions from "./pages/Promotions";
import Settings from "./pages/Settings";
import Simulator from "./pages/Simulator";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="products" element={<Products />} />
        <Route path="costs" element={<Costs />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="competitors" element={<Competitors />} />
        <Route path="promotions" element={<Promotions />} />
        <Route path="simulator" element={<Simulator />} />
        <Route path="decisions" element={<Decisions />} />
        <Route path="exceptions" element={<Exceptions />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="audit" element={<Audit />} />
        <Route path="settings" element={<Settings />} />
      <Route path="about" element={<About />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
