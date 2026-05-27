import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import SowList from './pages/SowList';
import AddSow from './pages/AddSow';
import SowDetails from './pages/SowDetails';
import Calendar from './pages/Calendar';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import Login from './pages/Login';
import BaseSalary from './pages/payroll/BaseSalary';
import AdvanceRequest from './pages/payroll/AdvanceRequest';
import AdvanceApproval from './pages/payroll/AdvanceApproval';
import PayrollSummary from './pages/payroll/PayrollSummary';
import UserManagement from './pages/UserManagement';
import PenMap from './pages/PenMap';
import ScanReceipt from './pages/ScanReceipt';
import BillList from './pages/BillList';
import SalesList from './pages/sales/SalesList';
import NewSale from './pages/sales/NewSale';
import Manual from './pages/Manual';
import MaintenanceList from './pages/equipment/MaintenanceList';
import NewMaintenanceRequest from './pages/equipment/NewMaintenanceRequest';
import MaintenanceDetails from './pages/equipment/MaintenanceDetails';
import NewsBoard from './pages/news/NewsBoard';
import ChatList from './pages/chat/ChatList';
import ChatRoomPage from './pages/chat/ChatRoom';
import Calculator from './pages/tools/Calculator';
import FeedFormulation from './pages/tools/FeedFormulation';
import GlobalNewsListener from './components/news/GlobalNewsListener';
import OfflineIndicator from './components/OfflineIndicator';
import InstallPWA from './components/InstallPWA';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Clock } from 'lucide-react';
import { BottomSheetProvider } from './contexts/BottomSheetContext';
import { ThemeProvider } from './contexts/ThemeContext';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, userProfile, loading, authError, logout } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium animate-pulse">กำลังตรวจสอบข้อมูลผู้ใช้...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (userProfile?.role === 'PENDING') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a2e36] px-4 font-sans">
        <div className="max-w-md w-full bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-8 text-center shadow-2xl">
          <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10 text-blue-400 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">ยินดีต้อนรับสู่ นิพนธ์ฟาร์ม</h2>
          <p className="text-white/70 mb-8 leading-relaxed">
            บัญชีของคุณ ({userProfile.email}) <br/>
            <b>อยู่ในระหว่างรอการอนุมัติจากผู้ดูแลระบบ</b> <br/>
            เมื่อได้รับการอนุมัติแล้ว คุณจะสามารถเข้าใช้งานระบบฟาร์มได้ทันทีครับ
          </p>
          <div className="space-y-3">
             <button
              onClick={() => {
                logout();
                window.location.href = '/login';
              }}
              className="w-full bg-white/10 text-white py-3 rounded-2xl font-bold hover:bg-white/20 transition-all border border-white/10"
            >
              ออกจากระบบ
            </button>
            <p className="text-xs text-white/40 italic">หากคุณเป็นเจ้าของฟาร์ม โปรดทำตามขั้นตอน "เปิดในแท็บใหม่" เพื่อเรียกคืนสิทธิ์</p>
          </div>
        </div>
      </div>
    );
  }

  if (userProfile?.role === 'RESIGNED') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a2e36] px-4 font-sans">
        <div className="max-w-md w-full bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-8 text-center shadow-2xl">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">บัญชีถูกระงับการใช้งาน</h2>
          <p className="text-white/70 mb-8 leading-relaxed">
            บัญชีของคุณถูกปิดการใช้งานในระบบ <br/>
            (เนื่องจากการลาออก หรือถูกเพิกถอนสิทธิ์) <br/>
            หากเป็นข้อผิดพลาด โปรดติดต่อผู้ดูแลระบบครับ
          </p>
          <button
            onClick={() => {
              logout();
              window.location.href = '/login';
            }}
            className="w-full bg-white/10 text-white py-3 rounded-2xl font-bold hover:bg-white/20 transition-all border border-white/10"
          >
            ออกจากระบบ
          </button>
        </div>
      </div>
    );
  }
  
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { userProfile, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div></div>;
  }
  
  if (userProfile?.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <>
      <GlobalNewsListener />
      <OfflineIndicator />
      <InstallPWA />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="sows" element={<SowList />} />
          <Route path="sows/add" element={<AddSow />} />
          <Route path="sows/:id" element={<SowDetails />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="pen-map" element={<PenMap />} />
          <Route path="sales" element={<SalesList />} />
          <Route path="scan" element={<ScanReceipt />} />
          <Route path="scan/history" element={<BillList />} />
          <Route path="sales/new" element={<NewSale />} />
          <Route path="manual" element={<Manual />} />
          <Route path="news" element={<NewsBoard />} />
          <Route path="chat" element={<ChatList />} />
          <Route path="chat/:id" element={<ChatRoomPage />} />
          <Route path="maintenance" element={<MaintenanceList />} />
          <Route path="maintenance/new" element={<NewMaintenanceRequest />} />
          <Route path="maintenance/:id" element={<MaintenanceDetails />} />
          <Route path="tools/calculator" element={<Calculator />} />
          <Route path="tools/feed" element={<FeedFormulation />} />
          <Route path="payroll/base-salary" element={<AdminRoute><BaseSalary /></AdminRoute>} />
          <Route path="payroll/advance" element={<AdvanceRequest />} />
          <Route path="payroll/advance-approval" element={<AdminRoute><AdvanceApproval /></AdminRoute>} />
          <Route path="payroll/summary" element={<PayrollSummary />} />
          <Route path="users" element={<AdminRoute><UserManagement /></AdminRoute>} />
          <Route path="settings" element={<Settings />} />
          <Route path="profile" element={<Profile />} />
        </Route>
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BottomSheetProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </BottomSheetProvider>
    </ThemeProvider>
  );
}
