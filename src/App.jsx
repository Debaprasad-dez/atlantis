import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useSeed } from '@/hooks/useSeed';
import { useAuthStore } from '@/stores/authStore';
import { AppShell } from '@/features/shell/AppShell';
import { RouteGuard } from '@/components/RouteGuard';
import { Toasts } from '@/components/Toasts';
import BootSplash from '@/features/boot/BootSplash';
import Login from '@/features/auth/Login';
import Dashboard from '@/features/dashboard/Dashboard';
import EntityExplorer from '@/features/entities/EntityExplorer';
import GraphView from '@/features/graph/GraphView';
import InvestigationsList from '@/features/investigations/InvestigationsList';
import InvestigationDetail from '@/features/investigations/InvestigationDetail';
import AuditLog from '@/features/audit/AuditLog';
import Admin from '@/features/admin/Admin';
import GeoView from '@/features/geo/GeoView';
import AnomalyTuning from '@/features/anomalies/AnomalyTuning';
import ReportBuilder from '@/features/reports/ReportBuilder';

function Protected({ children }) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const seed = useSeed();
  if (!seed.ready) {
    return <BootSplash stage={seed.stage} done={seed.done} total={seed.total} error={seed.error} />;
  }
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <Protected>
              <AppShell />
            </Protected>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/entities" element={
            <RouteGuard permission="view_entities"><EntityExplorer /></RouteGuard>
          } />
          <Route path="/graph" element={
            <RouteGuard permission="view_relationships"><GraphView /></RouteGuard>
          } />
          <Route path="/investigations" element={
            <RouteGuard permission="open_investigations"><InvestigationsList /></RouteGuard>
          } />
          <Route path="/investigations/:id" element={
            <RouteGuard permission="open_investigations"><InvestigationDetail /></RouteGuard>
          } />
          <Route path="/audit" element={
            <RouteGuard permission="view_audit"><AuditLog /></RouteGuard>
          } />
          <Route path="/admin" element={
            <RouteGuard permission="manage_roles"><Admin /></RouteGuard>
          } />
          <Route path="/map" element={
            <RouteGuard permission="view_entities"><GeoView /></RouteGuard>
          } />
          <Route path="/anomalies" element={
            <RouteGuard permission="view_events"><AnomalyTuning /></RouteGuard>
          } />
          <Route path="/reports" element={
            <RouteGuard permission="export_data"><ReportBuilder /></RouteGuard>
          } />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toasts />
    </BrowserRouter>
  );
}
