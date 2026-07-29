import React, { Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/auth-context";
import { ThemeProvider } from "@/contexts/theme-context";
import { ProtectedRoute } from "@/components/layout/protected-route";
import { DashboardLayout } from "@/layouts/dashboard-layout";
import { ErrorBoundary } from "@/components/layout/error-boundary";
import { BrainCircuit } from "lucide-react";

// Lazy-loaded pages for performance
const LoginPage = React.lazy(() => import("@/pages/auth/login").then(module => ({ default: module.LoginPage })));
const NotFoundPage = React.lazy(() => import("@/pages/not-found").then(module => ({ default: module.NotFoundPage })));
const AIModelsPage = React.lazy(() => import("@/pages/ai-models").then(module => ({ default: module.AIModelsPage })));
const DashboardPage = React.lazy(() => import("@/pages/dashboard").then(module => ({ default: module.DashboardPage })));
const LiveFeedPage = React.lazy(() => import("@/pages/live-feed").then(module => ({ default: module.LiveFeedPage })));
const TrafficAnalyticsPage = React.lazy(() => import("@/pages/traffic").then(module => ({ default: module.TrafficAnalyticsPage })));
const IncidentsPage = React.lazy(() => import("@/pages/incidents").then(module => ({ default: module.IncidentsPage })));
const SocCenterPage = React.lazy(() => import("@/pages/soc").then(module => ({ default: module.SocCenterPage })));
const ThreatIntelPage = React.lazy(() => import("@/pages/threats").then(module => ({ default: module.ThreatIntelPage })));
const MapPage = React.lazy(() => import("@/pages/map").then(module => ({ default: module.MapPage })));
const ReportsPage = React.lazy(() => import("@/pages/reports").then(module => ({ default: module.ReportsPage })));
const UsersPage = React.lazy(() => import("@/pages/users").then(module => ({ default: module.UsersPage })));
const SettingsPage = React.lazy(() => import("@/pages/settings").then(module => ({ default: module.SettingsPage })));
const ObjectAlertsPage = React.lazy(() => import("@/pages/object-alerts").then(module => ({ default: module.ObjectAlertsPage })));
const WatchlistPage = React.lazy(() => import("@/pages/watchlist").then(module => ({ default: module.WatchlistPage })));
const CaseBoardPage = React.lazy(() => import("@/pages/case-board").then(module => ({ default: module.CaseBoardPage })));
const TimelinePage = React.lazy(() => import("@/pages/timeline").then(module => ({ default: module.TimelinePage })));
const PlaybookBuilderPage = React.lazy(() => import("@/pages/playbook-builder").then(module => ({ default: module.PlaybookBuilderPage })));
const ApprovalsPage = React.lazy(() => import("@/pages/approvals").then(module => ({ default: module.ApprovalsPage })));
const CamerasPage = React.lazy(() => import("@/pages/cameras").then(module => ({ default: module.CamerasPage })));
const NovaDashboardPage = React.lazy(() => import("@/pages/nova-dashboard").then(module => ({ default: module.NovaDashboardPage })));

// Global loading fallback
const PageLoader = () => (
  <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] w-full">
    <BrainCircuit className="text-blue-500 animate-pulse mb-4" size={48} />
    <span className="text-muted-foreground text-sm font-medium tracking-wide">Loading module...</span>
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/login" element={<LoginPage />} />
                
                <Route element={<ProtectedRoute />}>
                  <Route element={<DashboardLayout />}>
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/feed" element={<LiveFeedPage />} />
                    <Route path="/ai-models" element={<AIModelsPage />} />
                    <Route path="/traffic" element={<TrafficAnalyticsPage />} />
                    <Route path="/incidents" element={<IncidentsPage />} />
                    <Route path="/soc" element={<SocCenterPage />} />
                    <Route path="/threats" element={<ThreatIntelPage />} />
                    <Route path="/map" element={<MapPage />} />
                    <Route path="/reports" element={<ReportsPage />} />
                    <Route path="/users" element={<UsersPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/object-alerts" element={<ObjectAlertsPage />} />
                    <Route path="/watchlist" element={<WatchlistPage />} />
                    <Route path="/case-board" element={<CaseBoardPage />} />
                    <Route path="/timeline" element={<TimelinePage />} />
                    <Route path="/playbooks" element={<PlaybookBuilderPage />} />
                    <Route path="/nova" element={<NovaDashboardPage />} />
                    <Route path="/approvals" element={<ApprovalsPage />} />
                    <Route path="/cameras" element={<CamerasPage />} />
                  </Route>
                </Route>
                
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
