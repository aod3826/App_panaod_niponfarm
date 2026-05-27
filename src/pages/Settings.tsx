import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBottomSheet } from '../contexts/BottomSheetContext';
import { useTheme } from '../contexts/ThemeContext';
import { LogOut, Users, CheckCircle, Clock, BellRing, Sun, Moon } from 'lucide-react';
import { UserProfile } from '../types';
import { getAllUsers, updateUserRole } from '../services/userService';
import clsx from 'clsx';

export default function Settings() {
  const { user, userProfile, logout } = useAuth();
  const { showAlert, showConfirm } = useBottomSheet();
  const { theme, toggleTheme } = useTheme();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const isAdmin = userProfile?.role === 'ADMIN';
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (isAdmin) {
      setLoadingUsers(true);
      getAllUsers().then(data => {
        setUsers(data);
        setLoadingUsers(false);
      });
    }
  }, [isAdmin]);

  const testNotification = async () => {
    // 1. In-App Banner Simulation (For test, just Alert or BottomSheet, or System Notification)
    // Here we mainly test the Sound & System OS level Notification.
    
    // Play Sound
    try {
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200, 100, 200]);
      }

      if (!audioCtxRef.current) {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
          audioCtxRef.current = new AudioContext();
        }
      }
      
      const ctx = audioCtxRef.current;
      if (ctx && ctx.state === 'suspended') {
        await ctx.resume();
      }
      
      if (ctx) {
        const playTone = (freq: number, type: OscillatorType, startTime: number, duration: number, volume: number = 1) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.type = type;
          osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
          
          gain.gain.setValueAtTime(0, ctx.currentTime + startTime);
          gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + startTime + 0.02); 
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + startTime + duration);
          
          osc.start(ctx.currentTime + startTime);
          osc.stop(ctx.currentTime + startTime + duration);
        };

        // Modern soft double chime (like iOS or modern chat apps)
        playTone(880.00, 'sine', 0, 0.4, 0.5); // A5
        playTone(1760.00, 'sine', 0, 0.3, 0.2); // A6
        
        playTone(1174.66, 'sine', 0.15, 0.6, 0.5); // D6
        playTone(2349.32, 'sine', 0.15, 0.4, 0.2); // D7
      }
    } catch (err) {
      console.warn("Audio test failed", err);
    }

    // System Notification Popup
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        try {
          if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            const reg = await navigator.serviceWorker.ready;
            reg.showNotification('ทดสอบการแจ้งเตือน', {
              body: 'นี่คือตัวอย่างข่าวด่วนหรือข้อความแชทใหม่ครับ',
              icon: '/icon.svg',
              vibrate: [200, 100, 200, 100, 400],
              tag: 'test-alert'
            } as any);
          } else {
            new Notification('ทดสอบการแจ้งเตือน', { 
              body: 'นี่คือตัวอย่างข่าวด่วนหรือข้อความแชทใหม่ครับ', 
              icon: '/icon.svg' 
            });
          }
        } catch (e) {
          console.warn("System Notification Test Failed", e);
          showAlert("ระบบ Browser ไม่รองรับการแสดง Popup (แต่คุณได้ยินเสียงแล้วใช่ไหม?)");
        }
      } else {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          showAlert("เปิดสิทธิ์แจ้งเตือนสำเร็จ ลองกดทดสอบอีกครั้ง!");
        } else {
          showAlert("คุณปฏิเสธการแจ้งเตือน (แต่คุณน่าจะได้ยินเสียงแล้วนะ)");
        }
      }
    } else {
      showAlert("อุปกรณ์นี้ไม่รองรับระบบแจ้งเตือน System (แต่คุณน่าจะได้ยินเสียง)");
    }
  };

  const handleRoleChange = async (uid: string, newRole: 'ADMIN' | 'STAFF') => {
    if (uid === user?.uid) {
      showAlert("ไม่สามารถเปลี่ยนสิทธิ์ของตัวเองได้");
      return;
    }
    showConfirm(
      `ยืนยันการเปลี่ยนสิทธิ์เป็น ${newRole === 'ADMIN' ? 'ผู้ดูแล (Admin)' : 'พนักงาน (Staff)'}?`,
      async () => {
        await updateUserRole(uid, newRole);
        setUsers(users.map(u => u.uid === uid ? { ...u, role: newRole } : u));
      }
    );
  };

  return (
    <div className="animate-in fade-in duration-300 pb-24">
      <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6 tracking-tight">ตั้งค่า</h2>
      
      <div className="bg-white dark:bg-[#1a2f3a] p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-white/10 mb-8">
        <div className="flex items-center gap-5 mb-2">
          <div className="w-24 h-24 bg-slate-100 dark:bg-white/10 rounded-full flex items-center justify-center overflow-hidden border-2 border-white dark:border-white/20 shadow-md">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <span className="text-4xl font-black text-slate-900 dark:text-white">{user?.displayName?.charAt(0) || 'อ'}</span>
            )}
          </div>
          <div>
            <h3 className="font-black text-slate-900 dark:text-white text-3xl tracking-tight mb-2">
              {user?.displayName || 'ผู้ใช้งาน'}
            </h3>
            <div className="flex items-center gap-2">
              <span className={clsx("text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-bold tracking-wider", isAdmin ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" : "bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white/70")}>
                <CheckCircle className="w-3.5 h-3.5" />
                {isAdmin ? 'เจ้าของฟาร์ม' : 'พนักงาน'}
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-white/50 font-medium mt-2">{user?.email}</p>
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="bg-white dark:bg-[#1a2f3a] p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-white/10 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-xl text-blue-600 dark:text-blue-400">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">การจัดการผู้ใช้งาน</h3>
            </div>
            {!loadingUsers && (
              <span className="text-xs font-bold bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white/60 px-3 py-1.5 rounded-lg">
                ทีมงาน {users.length} คน
              </span>
            )}
          </div>
          
          {loadingUsers ? (
            <div className="flex items-center justify-center py-6 gap-3 opacity-60">
               <div className="w-5 h-5 border-2 border-slate-300 dark:border-white/30 border-t-blue-500 rounded-full animate-spin"></div>
               <span className="text-sm font-medium text-slate-500 dark:text-white/50">กำลังโหลดข้อมูลทีมงาน...</span>
            </div>
          ) : (
            <div className="space-y-3">
              {users.map(u => (
                <div key={u.uid} className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-200 dark:border-white/10 flex items-center justify-between transition-colors hover:bg-slate-100 dark:hover:bg-white/10">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">{u.displayName}</h4>
                    <p className="text-sm text-slate-500 dark:text-white/50">{u.email}</p>
                  </div>
                  <div>
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.uid, e.target.value as 'ADMIN' | 'STAFF')}
                      disabled={u.uid === user?.uid}
                      className="bg-white dark:bg-[#0a2e36] text-slate-900 dark:text-white text-sm font-medium rounded-xl px-4 py-2.5 border border-slate-200 dark:border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none pr-8 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                      style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}
                    >
                      <option value="STAFF">พนักงาน</option>
                      <option value="ADMIN">ผู้ดูแล</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="space-y-6">
        <div className="bg-white dark:bg-[#1a2f3a] rounded-3xl shadow-sm border border-slate-200 dark:border-white/10 overflow-hidden divide-y divide-slate-100 dark:divide-white/5">
          <button 
            onClick={toggleTheme}
            className="w-full p-5 text-left flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 active:bg-slate-100 dark:active:bg-white/10 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-slate-100 dark:bg-white/5 rounded-xl text-slate-700 dark:text-white/70">
                {theme === 'dark' ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
              </div>
              <div>
                <p className="font-bold text-lg text-slate-900 dark:text-white">รูปแบบหน้าจอ</p>
                <p className="text-sm text-slate-500 dark:text-white/50">{theme === 'dark' ? 'โหมดกลางคืน (เปลี่ยนเป็นโหมดสว่าง)' : 'โหมดสว่าง (เปลี่ยนเป็นโหมดกลางคืน)'}</p>
              </div>
            </div>
          </button>

          <button 
            onClick={testNotification}
            className="w-full p-5 text-left flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 active:bg-slate-100 dark:active:bg-white/10 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-slate-100 dark:bg-white/5 rounded-xl text-slate-700 dark:text-white/70">
                <BellRing className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold text-lg text-slate-900 dark:text-white">ระบบเตือนความจำ</p>
                <p className="text-sm text-slate-500 dark:text-white/50">ทดสอบเสียงและป๊อปอัปแจ้งเตือนบนอุปกรณ์นี้</p>
              </div>
            </div>
          </button>
        </div>

        <button 
          onClick={logout}
          className="w-full bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 p-5 rounded-[2rem] border border-red-200 dark:border-red-500/20 font-black flex items-center justify-center gap-3 hover:bg-red-100 dark:hover:bg-red-500/20 active:scale-[0.98] transition-all text-xl mt-8"
        >
          <LogOut className="w-6 h-6" />
          ออกจากระบบ
        </button>
      </div>
    </div>
  );
}
