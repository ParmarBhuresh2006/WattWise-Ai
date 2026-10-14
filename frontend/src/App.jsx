import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './layouts/AppLayout';

import LoginPage          from './pages/LoginPage';
import RegisterPage       from './pages/RegisterPage';
import DashboardPage      from './pages/DashboardPage';
import EnergyPage         from './pages/EnergyPage';
import AnalyticsPage      from './pages/AnalyticsPage';
import ForecastPage       from './pages/ForecastPage';
import AnomaliesPage      from './pages/AnomaliesPage';
import RecommendationsPage from './pages/RecommendationsPage';
import GoalsPage          from './pages/GoalsPage';
import ReportsPage        from './pages/ReportsPage';
import SettingsPage       from './pages/SettingsPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard"       element={<DashboardPage />} />
              <Route path="/energy"          element={<EnergyPage />} />
              <Route path="/analytics"       element={<AnalyticsPage />} />
              <Route path="/forecast"        element={<ForecastPage />} />
              <Route path="/anomalies"       element={<AnomaliesPage />} />
              <Route path="/recommendations" element={<RecommendationsPage />} />
              <Route path="/goals"           element={<GoalsPage />} />
              <Route path="/reports"         element={<ReportsPage />} />
              <Route path="/settings"        element={<SettingsPage />} />
            </Route>
          </Route>

          {/* Default redirect */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
