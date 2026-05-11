import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { SocketProvider } from './context/SocketContext.jsx';
import { NotificationProvider } from './context/NotificationContext.jsx';

import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ProductionPage from './pages/ProductionPage.jsx';
import WorkOrdersPage from './pages/WorkOrdersPage.jsx';
import WorkOrderDetailPage from './pages/WorkOrderDetailPage.jsx';
import OrdersPage from './pages/OrdersPage.jsx';
import OrderDetailPage from './pages/OrderDetailPage.jsx';
import MaterialsPage from './pages/MaterialsPage.jsx';
import SuppliersPage from './pages/SuppliersPage.jsx';
import PurchaseOrdersPage from './pages/PurchaseOrdersPage.jsx';
import QualityPage from './pages/QualityPage.jsx';
import MachinesPage from './pages/MachinesPage.jsx';
import EmployeesPage from './pages/EmployeesPage.jsx';
import AttendancePage from './pages/AttendancePage.jsx';
import ShipmentsPage from './pages/ShipmentsPage.jsx';
import KpiPage from './pages/KpiPage.jsx';
import NotificationsPage from './pages/NotificationsPage.jsx';
import AiPage from './pages/AiPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import ProductsPage from './pages/ProductsPage.jsx';
import { Loader } from './components/UI.jsx';

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh' }}><Loader /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<Protected><DashboardPage /></Protected>} />
      <Route path="/production" element={<Protected><ProductionPage /></Protected>} />
      <Route path="/work-orders" element={<Protected><WorkOrdersPage /></Protected>} />
      <Route path="/work-orders/:id" element={<Protected><WorkOrderDetailPage /></Protected>} />
      <Route path="/orders" element={<Protected><OrdersPage /></Protected>} />
      <Route path="/orders/:id" element={<Protected><OrderDetailPage /></Protected>} />
      <Route path="/products" element={<Protected><ProductsPage /></Protected>} />
      <Route path="/materials" element={<Protected><MaterialsPage /></Protected>} />
      <Route path="/suppliers" element={<Protected><SuppliersPage /></Protected>} />
      <Route path="/purchase-orders" element={<Protected><PurchaseOrdersPage /></Protected>} />
      <Route path="/quality" element={<Protected><QualityPage /></Protected>} />
      <Route path="/machines" element={<Protected><MachinesPage /></Protected>} />
      <Route path="/employees" element={<Protected><EmployeesPage /></Protected>} />
      <Route path="/attendance" element={<Protected><AttendancePage /></Protected>} />
      <Route path="/shipments" element={<Protected><ShipmentsPage /></Protected>} />
      <Route path="/kpi" element={<Protected><KpiPage /></Protected>} />
      <Route path="/notifications" element={<Protected><NotificationsPage /></Protected>} />
      <Route path="/ai" element={<Protected><AiPage /></Protected>} />
      <Route path="/settings" element={<Protected><SettingsPage /></Protected>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <NotificationProvider>
            <AppRoutes />
          </NotificationProvider>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
