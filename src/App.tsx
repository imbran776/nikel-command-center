import { useEffect, type ReactNode } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import Header from './components/Header';
import ModalsHost from './components/ModalsHost';
import Sidebar from './components/Sidebar';
import ToastStack from './components/ui/ToastStack';
import OpsCopilot from './components/copilot/OpsCopilot';
import SettingsPanel from './components/panels/SettingsPanel';
import { useAuth } from './contexts/AuthContext';
import { useOps } from './contexts/OpsContext';
import AlertsPage from './pages/AlertsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import AuditLogsPage from './pages/AuditLogsPage';
import DashboardPage from './pages/DashboardPage';
import DispatchPage from './pages/DispatchPage';
import EquipmentDetailPage from './pages/EquipmentDetailPage';
import EquipmentPage from './pages/EquipmentPage';
import FleetPage from './pages/FleetPage';
import FuelPage from './pages/FuelPage';
import LiveOpsPage from './pages/LiveOpsPage';
import LoginPage from './pages/LoginPage';
import MaintenancePage from './pages/MaintenancePage';
import OperatorsPage from './pages/OperatorsPage';
import ProductionPage from './pages/ProductionPage';
import ReportsPage from './pages/ReportsPage';
import RolesPage from './pages/RolesPage';
import SparePartsPage from './pages/SparePartsPage';
import UsersPage from './pages/UsersPage';
import MobileTrackerPage from './pages/MobileTrackerPage';
import DeviceTrackingPage from './pages/DeviceTrackingPage';
import DeviceRegistrationPage from './pages/DeviceRegistrationPage';
import type { NavItemId } from './types/fms';

function AccessDenied({ module }: { module: string }) {
  const { setActiveNav } = useOps();
  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center rounded-xl border border-[#2A3036] bg-[#151A1F] px-6 text-center">
      <div className="mb-2 text-[13px] font-semibold tracking-[0.12em] text-[#F6A214]">
        ACCESS RESTRICTED
      </div>
      <p className="max-w-sm text-[12px] leading-relaxed text-[#8A949C]">
        Your role does not include <span className="text-[#C8D0D6]">{module}</span>. Contact a System
        Admin if you need elevated permissions for this shift.
      </p>
      <button
        type="button"
        onClick={() => setActiveNav('dashboard')}
        className="mt-4 rounded-md bg-[#1ADBDE] px-3 py-1.5 text-[12px] font-semibold text-[#0D1116]"
      >
        Return to dashboard
      </button>
    </div>
  );
}

function Guarded({ id, children }: { id: NavItemId; children: ReactNode }) {
  const { canAccess } = useAuth();
  if (!canAccess(id)) return <AccessDenied module={id} />;
  return <>{children}</>;
}

export default function App() {
  const { isAuthenticated, user, canAccess } = useAuth();
  const { activeNav, setActiveNav, alertCount, settings, copilotOpen } = useOps();
  const location = useLocation();

  const isTrackerMode =
    location.pathname.startsWith('/track') ||
    location.hash === '#track' ||
    location.search.includes('track=true');
  const isRegistrationMode =
    location.pathname.startsWith('/track/join') ||
    location.pathname.startsWith('/track/register') ||
    location.search.includes('code=');

  // If current nav is forbidden after role switch / login, bounce to first allowed module
  useEffect(() => {
    if (!user) return;
    if (!canAccess(activeNav)) {
      const fallback = user.modules.find((m) => m !== 'equipment-detail') ?? 'dashboard';
      setActiveNav(fallback);
    }
  }, [user, activeNav, canAccess, setActiveNav]);

  if (isTrackerMode || isRegistrationMode) {
    return (
      <Routes>
        <Route path="/track" element={<MobileTrackerPage />} />
        <Route path="/track/join" element={<DeviceRegistrationPage />} />
        <Route path="/track/register" element={<DeviceRegistrationPage />} />
        <Route path="*" element={<MobileTrackerPage />} />
      </Routes>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div
      data-theme={settings.theme}
      className={`app-shell relative flex h-screen w-screen overflow-hidden antialiased ${
        settings.theme === 'light' ? 'theme-light' : 'theme-dark'
      } ${settings.highContrast ? 'contrast-125' : ''}`}
    >
      <Header />

      <div className="flex min-h-0 min-w-0 flex-1 pt-[56px]">
        <Sidebar alertCount={alertCount} />

        <div className="flex min-h-0 min-w-0 flex-1">
          <main className="min-h-0 min-w-0 flex-1 overflow-hidden p-2.5">
            {activeNav === 'dashboard' && (
              <Guarded id="dashboard">
                <DashboardPage />
              </Guarded>
            )}
            {activeNav === 'live-ops' && (
              <Guarded id="live-ops">
                <LiveOpsPage />
              </Guarded>
            )}
            {activeNav === 'dispatch' && (
              <Guarded id="dispatch">
                <DispatchPage />
              </Guarded>
            )}
            {activeNav === 'fleet' && (
              <Guarded id="fleet">
                <FleetPage />
              </Guarded>
            )}
            {activeNav === 'device-tracking' && (
              <Guarded id="device-tracking">
                <DeviceTrackingPage />
              </Guarded>
            )}
            {activeNav === 'production' && (
              <Guarded id="production">
                <ProductionPage />
              </Guarded>
            )}
            {activeNav === 'equipment' && (
              <Guarded id="equipment">
                <EquipmentPage />
              </Guarded>
            )}
            {activeNav === 'equipment-detail' && (
              <Guarded id="equipment-detail">
                <EquipmentDetailPage />
              </Guarded>
            )}
            {activeNav === 'maintenance' && (
              <Guarded id="maintenance">
                <MaintenancePage />
              </Guarded>
            )}
            {activeNav === 'fuel' && (
              <Guarded id="fuel">
                <FuelPage />
              </Guarded>
            )}
            {activeNav === 'spare-parts' && (
              <Guarded id="spare-parts">
                <SparePartsPage />
              </Guarded>
            )}
            {activeNav === 'operators' && (
              <Guarded id="operators">
                <OperatorsPage />
              </Guarded>
            )}
            {activeNav === 'alerts' && (
              <Guarded id="alerts">
                <AlertsPage />
              </Guarded>
            )}
            {activeNav === 'reports' && (
              <Guarded id="reports">
                <ReportsPage />
              </Guarded>
            )}
            {activeNav === 'analytics' && (
              <Guarded id="analytics">
                <AnalyticsPage />
              </Guarded>
            )}
            {activeNav === 'users' && (
              <Guarded id="users">
                <UsersPage />
              </Guarded>
            )}
            {activeNav === 'roles' && (
              <Guarded id="roles">
                <RolesPage />
              </Guarded>
            )}
            {activeNav === 'settings' && (
              <Guarded id="settings">
                <SettingsPanel />
              </Guarded>
            )}
            {activeNav === 'audit-logs' && (
              <Guarded id="audit-logs">
                <AuditLogsPage />
              </Guarded>
            )}
          </main>

          <OpsCopilot />
        </div>
      </div>

      <ModalsHost />
      <ToastStack offsetRight={copilotOpen ? 16 : 16} />
    </div>
  );
}
