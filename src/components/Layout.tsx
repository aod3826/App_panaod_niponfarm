import { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  Sprout, Home, List, Calendar as CalendarIcon, Settings, Wallet, 
  Menu, X, ChevronRight, HandCoins, ShoppingCart, Wrench, 
  Newspaper, MessageCircle, ChevronDown, Hammer, Calculator, FlaskConical, Camera, AlertOctagon, WifiOff, Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';
import { isSameDay, isBefore, parseISO, startOfDay } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToPendingAdvances } from '../services/employeeService';
import { subscribeToAllPendingTasks } from '../services/sowService';
import { Task } from '../types';
import PigLogo from './PigLogo';
import HeaderWeatherWidget from './HeaderWeatherWidget';

export default function Layout() {
  const { user, userProfile } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    payroll: false,
    operations: false,
    assets: false,
    comm: false,
    tools: false
  });
  const navigate = useNavigate();
  const [showProfileWarning, setShowProfileWarning] = useState(false);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [urgentTasksCount, setUrgentTasksCount] = useState(0);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (userProfile?.role === 'ADMIN') {
      const unsub = subscribeToPendingAdvances((advances) => {
        setPendingApprovalsCount(advances.length);
      });
      return () => unsub();
    }
  }, [userProfile?.role]);

  useEffect(() => {
    // Listen for cycle Tasks
    const unsubTasks = subscribeToAllPendingTasks((tasks) => {
      const today = startOfDay(new Date());
      let count = 0;
      tasks.forEach(task => {
        const dueDate = parseISO(task.dueDate);
        if (isSameDay(dueDate, today) || isBefore(dueDate, today)) {
          count++;
        }
      });
      setUrgentTasksCount(count);

      // Local browser notification for PWA approach if permission enabled
      if (count > 0 && "Notification" in window && Notification.permission === "granted") {
        const notified = localStorage.getItem('lastNotificationDate');
        // Simple distinct str
        const todayStr = new Date().toISOString().split('T')[0];
        if (notified !== todayStr) {
          try {
            navigator.serviceWorker?.ready.then(registration => {
              registration.showNotification('แจ้งเตือนงานในฟาร์ม', {
                body: `มีงานที่ต้องทำวันนี้ ${count} งาน!`,
                icon: '/pwa-192x192-v2.png'
              });
            }).catch(() => {
              new Notification('แจ้งเตือนงานในฟาร์ม', { body: `มีงานที่ต้องทำวันนี้ ${count} งาน!` });
            });
            localStorage.setItem('lastNotificationDate', todayStr);
          } catch(e) {}
        }
      }
    });

    return () => unsubTasks();
  }, []);

  // Auto-expand menu based on current path
  useEffect(() => {
    if (location.pathname.startsWith('/payroll')) {
      setExpandedMenus(prev => ({ ...prev, payroll: true }));
    } else if (location.pathname.startsWith('/sales')) {
      setExpandedMenus(prev => ({ ...prev, operations: true }));
    } else if (location.pathname.startsWith('/maintenance')) {
      setExpandedMenus(prev => ({ ...prev, maintenance: true }));
    } else if (location.pathname.startsWith('/tools') || location.pathname === '/scan') {
      setExpandedMenus(prev => ({ ...prev, tools: true }));
    } else if (location.pathname === '/news' || location.pathname === '/manual' || location.pathname === '/users' || location.pathname === '/profile') {
      setExpandedMenus(prev => ({ ...prev, comm: true }));
    }
  }, [location.pathname]);
  
  useEffect(() => {
    if (userProfile && !sessionStorage.getItem('profileWarningDismissed') && location.pathname !== '/profile') {
      const isBankMissing = !userProfile.bankAccount?.accountNumber;
      const isPhoneMissing = !userProfile.phone;
      if (isBankMissing || isPhoneMissing) {
        setShowProfileWarning(true);
      }
    }
  }, [userProfile, location.pathname]);

  const dismissWarning = () => {
    setShowProfileWarning(false);
    sessionStorage.setItem('profileWarningDismissed', 'true');
  };

  const goToProfile = () => {
    setShowProfileWarning(false);
    navigate('/profile');
  };

  // Toggle sub-menu
  const toggleSubMenu = (menuKey: string) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuKey]: !prev[menuKey]
    }));
  };

  const SubMenuItem = ({ 
    to, 
    label, 
    isActive, 
    onClick,
    badge
  }: { 
    to: string; 
    label: string; 
    isActive: boolean; 
    onClick: () => void;
    badge?: number;
  }) => (
    <button 
      onClick={() => { navigate(to); onClick(); }}
      className={clsx(
        "w-full flex items-center justify-between gap-3 pl-8 pr-4 p-3 transition-all duration-200 rounded-r-2xl relative",
        isActive 
          ? "bg-[#00bcd4]/10 text-[#008ba3] dark:text-[#00bcd4] font-black border-l-4 border-[#00bcd4] -ml-[2px] shadow-sm shadow-[#00bcd4]/5" 
          : "text-slate-700 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/5 active:bg-slate-200 dark:active:bg-white/10"
      )}
    >
      <div className="flex items-center gap-3">
        {isActive && (
          <motion.div 
            layoutId="activeSubMenu"
            className="absolute left-0 w-1 h-1/2 bg-[#00bcd4] rounded-full"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}
        <div className={clsx(
          "w-1.5 h-1.5 rounded-full shrink-0 transition-transform duration-200", 
          isActive ? "bg-[#00bcd4] scale-125" : "bg-slate-300 dark:bg-slate-700 group-hover:scale-110"
        )}></div>
        <span className={clsx("text-base transition-colors", isActive ? "translate-x-1" : "translate-x-0")}>
          {label}
        </span>
      </div>
      {typeof badge === 'number' && badge > 0 && (
        <span className="w-5 h-5 flex items-center justify-center bg-rose-500 text-white text-[10px] font-black rounded-full shadow-sm animate-in zoom-in">
          {badge}
        </span>
      )}
    </button>
  );
  
  // Touch references for Swipe gesture
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  
  const isAdmin = userProfile?.role === 'ADMIN';

  const closeSidebar = () => setIsSidebarOpen(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > 50; // Swipe left -> distance is positive
    const isRightSwipe = distance < -50; // Swipe right -> distance is negative
    
    if (isLeftSwipe && isSidebarOpen) {
      closeSidebar();
    } else if (isRightSwipe && !isSidebarOpen) {
      // Only open if the swipe starts near the left edge (e.g., within 50px)
      if (touchStartX.current < 50) {
        setIsSidebarOpen(true);
      }
    }
    
    // Reset values
    touchStartX.current = null;
    touchEndX.current = null;
  };
  
  return (
    <div 
      className="min-h-screen flex flex-col font-sans relative overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <header className="bg-white/90 dark:bg-[#0a2e36]/90 backdrop-blur-md border-b border-slate-200 dark:border-white/10 text-slate-900 dark:text-white p-4 sticky top-0 z-10">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 bg-slate-100 dark:bg-white/5 rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
            >
              <Menu className="w-6 h-6 text-slate-900 dark:text-white" />
            </button>
            <div className="flex items-center gap-3 md:gap-4">
              <div className="p-2 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
                <PigLogo className="w-7 h-7 text-[#00bcd4]" />
              </div>
              <div className="flex flex-col justify-center gap-0.5">
                <h1 className="text-2xl font-black tracking-tight leading-none text-slate-800 dark:text-white mt-1">นิพนธ์ฟาร์ม</h1>
                <div className="-ml-1.5 mt-0.5">
                  <HeaderWeatherWidget />
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/calendar')}
              className="relative w-10 h-10 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/10 active:scale-95 transition-transform"
            >
              <Bell className="w-5 h-5 text-slate-700 dark:text-white/80" />
              {urgentTasksCount > 0 && (
                <span className="absolute 2 top-2 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse border-2 border-slate-100 dark:border-slate-800"></span>
              )}
            </button>
            <button 
              onClick={() => navigate('/settings')}
              className="w-10 h-10 bg-white dark:bg-white/10 rounded-full flex items-center justify-center overflow-hidden border border-slate-200 dark:border-white/20 active:scale-95 transition-transform"
            >
            {userProfile?.photoURL || user?.photoURL ? (
              <img src={userProfile?.photoURL || user?.photoURL || ''} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <span className="text-sm font-medium">{userProfile?.displayName?.charAt(0) || user?.displayName?.charAt(0) || 'อ'}</span>
            )}
          </button>
          </div>
        </div>
      </header>

      {/* Offline Banner */}
      <AnimatePresence>
        {isOffline && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-amber-500 text-white overflow-hidden z-20"
          >
            <div className="flex items-center justify-center gap-2 py-2 px-4 shadow-sm text-sm font-bold">
              <WifiOff className="w-4 h-4" />
              <span>โหมดออฟไลน์: บันทึกข้อมูลได้ปกติ (จะซิงค์อัตโนมัติเมื่อมีสัญญาณอินเทอร์เน็ต)</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={closeSidebar}
          ></div>
          
          <div className="relative w-4/5 max-w-sm bg-white dark:bg-[#0a2e36] h-full shadow-2xl flex flex-col animate-in slide-in-from-left duration-300 border-r border-slate-200 dark:border-white/10">
            <div className="p-5 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-slate-100 dark:bg-white/5">
              <button onClick={() => { navigate('/settings'); closeSidebar(); }} className="flex items-center gap-4 text-left active:scale-95 transition-transform">
                <div className="w-14 h-14 bg-white dark:bg-white/10 rounded-full flex items-center justify-center overflow-hidden shadow-sm border border-slate-200 dark:border-white/20">
                  {userProfile?.photoURL || user?.photoURL ? (
                    <img src={userProfile?.photoURL || user?.photoURL || ''} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-2xl font-bold text-slate-900 dark:text-white">{userProfile?.displayName?.charAt(0) || user?.displayName?.charAt(0) || 'อ'}</span>
                  )}
                </div>
                <div className="flex flex-col">
                  <p className="text-slate-900 dark:text-white font-bold text-lg leading-tight tracking-tight">{userProfile?.displayName || user?.displayName || 'ผู้ใช้งาน'}</p>
                  <p className="text-slate-500 dark:text-white/40 text-sm block">{user?.email}</p>
                </div>
              </button>
              <button onClick={closeSidebar} className="p-2 text-slate-600 dark:text-white/50 hover:text-slate-900 dark:text-white bg-slate-100 dark:bg-white/5 hover:bg-slate-200 rounded-full transition-colors shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4">
              {/* --- Section: Dashboard & Main --- */}
              <nav className="space-y-1 px-4 mb-6">
                <button 
                  onClick={() => { navigate('/'); closeSidebar(); }}
                  className={clsx(
                    "w-full flex items-center gap-4 p-4 transition-all rounded-2xl",
                    location.pathname === '/' 
                      ? "bg-[#00bcd4] shadow-lg shadow-[#00bcd4]/30 font-black text-white" 
                      : "text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/5 font-bold"
                  )}
                >
                  <Home className="w-6 h-6" />
                  <span className="text-lg tracking-wide">ภาพรวมฟาร์ม</span>
                </button>
              </nav>

              {/* --- Section: HR & Finance --- */}
              <div className="px-6 mb-2">
                <p className="text-[10px] font-black text-slate-400 dark:text-white/20 uppercase tracking-[0.2em]">บริหารจัดการ (HR & FINANCE)</p>
              </div>

              <nav className="px-4 mb-6 space-y-1">
                {/* User Management for Admin */}
                {isAdmin && (
                  <button 
                    onClick={() => { navigate('/users'); closeSidebar(); }}
                    className={clsx(
                      "w-full flex items-center gap-4 p-4 transition-all rounded-2xl",
                      location.pathname === '/users' 
                        ? "bg-[#00bcd4]/10 border border-[#00bcd4]/30 font-black text-[#008ba3] dark:text-[#00bcd4]" 
                        : "text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/5 font-bold"
                    )}
                  >
                    <div className={clsx("p-2 rounded-xl", location.pathname === '/users' ? "bg-[#00bcd4] text-white" : "bg-slate-100 dark:bg-white/5 text-slate-500")}>
                      <Settings className="w-5 h-5" />
                    </div>
                    <span className="text-lg tracking-wide">จัดการสิทธิ์พนักงาน</span>
                  </button>
                )}

                {/* Submenu: Salary */}
                <div className="overflow-hidden">
                  <button 
                    onClick={() => toggleSubMenu('payroll')}
                    className={clsx(
                      "w-full flex items-center justify-between p-4 transition-all rounded-2xl",
                      expandedMenus.payroll 
                        ? "bg-slate-50 dark:bg-white/5 font-bold text-slate-900 dark:text-white" 
                        : "text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/5 font-bold"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={clsx("p-2 rounded-xl transition-colors", expandedMenus.payroll ? "bg-amber-500 text-white shadow-lg shadow-amber-500/30" : "bg-slate-100 dark:bg-white/5 text-slate-500")}>
                        <Wallet className="w-5 h-5" />
                      </div>
                      <span className="text-lg tracking-wide">ระบบเงินเดือน</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {pendingApprovalsCount > 0 && isAdmin && (
                        <span className="w-5 h-5 flex items-center justify-center bg-rose-500 text-white text-[10px] font-black rounded-full shadow-sm animate-in zoom-in">
                          {pendingApprovalsCount}
                        </span>
                      )}
                      <motion.div
                        animate={{ rotate: expandedMenus.payroll ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="w-5 h-5 opacity-30" />
                      </motion.div>
                    </div>
                  </button>

                  <AnimatePresence>
                    {expandedMenus.payroll && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden bg-slate-50/50 dark:bg-white/[0.02] rounded-b-2xl"
                      >
                        <div className="py-2 space-y-1">
                          {isAdmin && (
                            <SubMenuItem 
                              to="/payroll/base-salary" 
                              label="จัดการฐานเงินเดือน" 
                              isActive={location.pathname === '/payroll/base-salary'} 
                              onClick={closeSidebar}
                            />
                          )}
                          <SubMenuItem 
                            to="/payroll/advance" 
                            label="แจ้งเบิกเบี้ยเลี้ยง/ล่วงหน้า" 
                            isActive={location.pathname === '/payroll/advance'} 
                            onClick={closeSidebar}
                          />
                          {isAdmin && (
                            <>
                              <SubMenuItem 
                                to="/payroll/advance-approval" 
                                label="รายการรออนุมัติ" 
                                isActive={location.pathname === '/payroll/advance-approval'} 
                                onClick={closeSidebar}
                                badge={pendingApprovalsCount}
                              />
                            </>
                          )}
                          <SubMenuItem 
                            to="/payroll/summary" 
                            label={isAdmin ? "สรุปยอดสั่งจ่าย" : "รายละเอียดการรับเงินงวดนี้"} 
                            isActive={location.pathname === '/payroll/summary'} 
                            onClick={closeSidebar}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </nav>

              {/* --- Section: Operations --- */}
              <div className="px-6 mb-2">
                <p className="text-[10px] font-black text-slate-400 dark:text-white/20 uppercase tracking-[0.2em]">หน้าเล้าและคลัง (OPERATIONS)</p>
              </div>

              <nav className="px-4 mb-6 space-y-1">
                {/* Primary Tool: AI Scanner */}
                <button 
                  onClick={() => { navigate('/scan'); closeSidebar(); }}
                  className={clsx(
                    "w-full flex items-center gap-4 p-4 transition-all rounded-2xl",
                    location.pathname === '/scan' 
                      ? "bg-[#00bcd4]/10 border border-[#00bcd4]/30 font-black text-[#008ba3] dark:text-[#00bcd4]" 
                      : "text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/5 font-bold"
                  )}
                >
                  <div className={clsx("p-2 rounded-xl", location.pathname === '/scan' ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30" : "bg-slate-100 dark:bg-white/5 text-slate-500")}>
                    <Camera className="w-5 h-5" />
                  </div>
                  <span className="text-lg tracking-wide">สแกนบิล (AI Scan)</span>
                </button>

                {/* Submenu: Sales */}
                <div className="overflow-hidden">
                  <button 
                    onClick={() => toggleSubMenu('operations')}
                    className={clsx(
                      "w-full flex items-center justify-between p-4 transition-all rounded-2xl",
                      expandedMenus.operations 
                        ? "bg-slate-50 dark:bg-white/5 font-bold text-slate-900 dark:text-white" 
                        : "text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/5 font-bold"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={clsx("p-2 rounded-xl transition-colors", expandedMenus.operations ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30" : "bg-slate-100 dark:bg-white/5 text-slate-500")}>
                        <ShoppingCart className="w-5 h-5" />
                      </div>
                      <span className="text-lg tracking-wide">การจำหน่ายหมู</span>
                    </div>
                    <motion.div
                      animate={{ rotate: expandedMenus.operations ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="w-5 h-5 opacity-30" />
                    </motion.div>
                  </button>

                  <AnimatePresence>
                    {expandedMenus.operations && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden bg-slate-50/50 dark:bg-white/[0.02] rounded-b-2xl"
                      >
                        <div className="py-2 space-y-1">
                          <SubMenuItem 
                            to="/sales/new" 
                            label="เปิดบิลขายใหม่" 
                            isActive={location.pathname === '/sales/new'} 
                            onClick={closeSidebar}
                          />
                          <SubMenuItem 
                            to="/sales" 
                            label="ประวัติการขาย" 
                            isActive={location.pathname === '/sales'} 
                            onClick={closeSidebar}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Submenu: Maintenance */}
                <div className="overflow-hidden">
                  <button 
                    onClick={() => toggleSubMenu('maintenance')}
                    className={clsx(
                      "w-full flex items-center justify-between p-4 transition-all rounded-2xl",
                      expandedMenus.maintenance 
                        ? "bg-slate-50 dark:bg-white/5 font-bold text-slate-900 dark:text-white" 
                        : "text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/5 font-bold"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={clsx("p-2 rounded-xl transition-colors", expandedMenus.maintenance ? "bg-red-500 text-white shadow-lg shadow-red-500/30" : "bg-slate-100 dark:bg-white/5 text-slate-500")}>
                        <Wrench className="w-5 h-5" />
                      </div>
                      <span className="text-lg tracking-wide">การแจ้งซ่อม</span>
                    </div>
                    <motion.div
                      animate={{ rotate: expandedMenus.maintenance ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="w-5 h-5 opacity-30" />
                    </motion.div>
                  </button>

                  <AnimatePresence>
                    {expandedMenus.maintenance && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden bg-slate-50/50 dark:bg-white/[0.02] rounded-b-2xl"
                      >
                        <div className="py-2 space-y-1">
                          <SubMenuItem 
                            to="/maintenance/new" 
                            label="แจ้งซ่อมใหม่" 
                            isActive={location.pathname === '/maintenance/new'} 
                            onClick={closeSidebar}
                          />
                          <SubMenuItem 
                            to="/maintenance" 
                            label="รายการแจ้งซ่อมทั้งหมด" 
                            isActive={location.pathname === '/maintenance'} 
                            onClick={closeSidebar}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </nav>

              {/* --- Section: Tools & Knowledge --- */}
              <div className="px-6 mb-2">
                <p className="text-[10px] font-black text-slate-400 dark:text-white/20 uppercase tracking-[0.2em]">เครื่องมือและคลังความรู้</p>
              </div>

              <nav className="px-4 mb-10 space-y-1">
                {/* Submenu: Tools */}
                <div className="overflow-hidden">
                  <button 
                    onClick={() => toggleSubMenu('tools')}
                    className={clsx(
                      "w-full flex items-center justify-between p-4 transition-all rounded-2xl",
                      expandedMenus.tools 
                        ? "bg-slate-50 dark:bg-white/5 font-bold text-slate-900 dark:text-white" 
                        : "text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/5 font-bold"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={clsx("p-2 rounded-xl transition-colors", expandedMenus.tools ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/30" : "bg-slate-100 dark:bg-white/5 text-slate-500")}>
                        <Hammer className="w-5 h-5" />
                      </div>
                      <span className="text-lg tracking-wide">เครื่องมือช่วยงาน</span>
                    </div>
                    <motion.div
                      animate={{ rotate: expandedMenus.tools ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="w-5 h-5 opacity-30" />
                    </motion.div>
                  </button>

                  <AnimatePresence>
                    {expandedMenus.tools && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden bg-slate-50/50 dark:bg-white/[0.02] rounded-b-2xl"
                      >
                        <div className="py-2 space-y-1">
                          <SubMenuItem 
                            to="/tools/calculator" 
                            label="เครื่องคิดเลขฟาร์ม" 
                            isActive={location.pathname === '/tools/calculator'} 
                            onClick={closeSidebar}
                          />
                          <SubMenuItem 
                            to="/tools/feed" 
                            label="สูตรอาหารมาตรฐาน" 
                            isActive={location.pathname === '/tools/feed'} 
                            onClick={closeSidebar}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Submenu: Knowledge */}
                <div className="overflow-hidden">
                  <button 
                    onClick={() => toggleSubMenu('comm')}
                    className={clsx(
                      "w-full flex items-center justify-between p-4 transition-all rounded-2xl",
                      expandedMenus.comm 
                        ? "bg-slate-50 dark:bg-white/5 font-bold text-slate-900 dark:text-white" 
                        : "text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/5 font-bold"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={clsx("p-2 rounded-xl transition-colors", expandedMenus.comm ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30" : "bg-slate-100 dark:bg-white/5 text-slate-500")}>
                        <Newspaper className="w-5 h-5" />
                      </div>
                      <span className="text-lg tracking-wide">ข้อมูลและระเบียบ</span>
                    </div>
                    <motion.div
                      animate={{ rotate: expandedMenus.comm ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="w-5 h-5 opacity-30" />
                    </motion.div>
                  </button>

                  <AnimatePresence>
                    {expandedMenus.comm && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden bg-slate-50/50 dark:bg-white/[0.02] rounded-b-2xl"
                      >
                        <div className="py-2 space-y-1">
                          <SubMenuItem 
                            to="/profile" 
                            label="ข้อมูลส่วนตัวของฉัน" 
                            isActive={location.pathname === '/profile'} 
                            onClick={closeSidebar}
                          />
                          <SubMenuItem 
                            to="/news" 
                            label="ประกาศจากฟาร์ม" 
                            isActive={location.pathname === '/news'} 
                            onClick={closeSidebar}
                          />
                          <SubMenuItem 
                            to="/manual" 
                            label="คู่มือสัตวบาล" 
                            isActive={location.pathname === '/manual'} 
                            onClick={closeSidebar}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Profile Warning Modal */}
      <AnimatePresence>
        {showProfileWarning && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-[#0a2e36] rounded-3xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-white/10"
            >
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/40 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-amber-50 dark:border-amber-900/20">
                  <AlertOctagon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">ข้อมูลโปรไฟล์ยังไม่สมบูรณ์</h3>
                <p className="text-slate-500 dark:text-white/60 mb-6 font-medium text-sm">
                  เพื่อให้การรับเงินเดือนและการติดต่อเป็นไปอย่างราบรื่น กรุณากรอกข้อมูลส่วนตัวและบัญชีธนาคารให้ครบถ้วน
                </p>
                <div className="space-y-3">
                  <button 
                    onClick={goToProfile}
                    className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-white rounded-2xl font-black transition-colors shadow-lg shadow-amber-500/20"
                  >
                    อัปเดตข้อมูลเดี๋ยวนี้
                  </button>
                  <button 
                    onClick={dismissWarning}
                    className="w-full py-3.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 rounded-2xl font-bold transition-colors"
                  >
                    ไว้ทำภายหลัง
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 p-4 pb-28 max-w-7xl mx-auto w-full">
        <Outlet />
      </main>

      {/* Bottom Navigation (Mobile) */}
      <nav className="fixed bottom-0 w-full backdrop-blur-xl bg-white/90 dark:bg-[#0a2e36]/90 border-t border-slate-200 dark:border-white/10 pb-safe z-20">
        <div className="flex justify-around items-center p-4 max-w-7xl mx-auto">
          <NavLink 
            to="/" 
            className={({ isActive }) => clsx("flex flex-col items-center gap-1.5 transition-all duration-300", isActive ? "text-[#00bcd4] scale-110" : "text-slate-600 dark:text-white/60 ")}
          >
            <Home className="w-7 h-7" />
            <span className="text-xs font-semibold tracking-wide">หน้าแรก</span>
          </NavLink>
          <NavLink 
            to="/sows" 
            className={({ isActive }) => clsx("flex flex-col items-center gap-1.5 transition-all duration-300", isActive ? "text-[#00bcd4] scale-110" : "text-slate-600 dark:text-white/60 ")}
          >
            <List className="w-7 h-7" />
            <span className="text-xs font-semibold tracking-wide">แม่หมู</span>
          </NavLink>
          <NavLink 
            to="/calendar" 
            className={({ isActive }) => clsx("flex flex-col items-center gap-1.5 transition-all duration-300", isActive ? "text-[#00bcd4] scale-110" : "text-slate-600 dark:text-white/60 ")}
          >
            <CalendarIcon className="w-7 h-7" />
            <span className="text-xs font-semibold tracking-wide">ปฏิทิน</span>
          </NavLink>
          <NavLink 
            to="/pen-map" 
            className={({ isActive }) => clsx("flex flex-col items-center gap-1.5 transition-all duration-300", isActive ? "text-[#00bcd4] scale-110" : "text-slate-600 dark:text-white/60 ")}
          >
            <Sprout className="w-7 h-7" />
            <span className="text-xs font-semibold tracking-wide">ที่อยู่แม่พันธุ์</span>
          </NavLink>
        </div>
      </nav>
    </div>
  );
}
