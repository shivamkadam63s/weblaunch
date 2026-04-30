import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/common/Layout";
import Dashboard from "./pages/Dashboard";
import Deploy from "./pages/Deploy";
import DeploymentDetail from "./pages/DeploymentDetail";
import Monitoring from "./pages/Monitoring";
import CodeQuality from "./pages/CodeQuality";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/deploy" element={<Deploy />} />
        <Route path="/deployments/:id" element={<DeploymentDetail />} />
        <Route path="/monitoring" element={<Monitoring />} />
        <Route path="/code-quality" element={<CodeQuality />} />
      </Route>
    </Routes>
  );
}
