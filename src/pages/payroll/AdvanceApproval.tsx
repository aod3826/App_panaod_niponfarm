import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, HandCoins, Check, X } from 'lucide-react';
import { updateAdvanceStatus, subscribeToMonthlyAdvances } from '../../services/employeeService';
import { getAllUsers } from '../../services/userService';
import { SalaryAdvance, UserProfile } from '../../types';
import { useBottomSheet } from '../../contexts/BottomSheetContext';

export default function AdvanceApproval() {
  const navigate = useNavigate();
  const { showAlert } = useBottomSheet();
  
  const [users, setUsers] = useState<Record<string, UserProfile>>({});
  const [advances, setAdvances] = useState<SalaryAdvance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const fetchedUsers = await getAllUsers();
        const userMap: Record<string, UserProfile> = {};
        fetchedUsers.forEach(u => userMap[u.uid] = u);
        setUsers(userMap);
      } catch (err) {
        console.error(err);
      }
    };
    fetchUsers();

    const unsubAdvances = subscribeToMonthlyAdvances(new Date(), (data) => {
      // Show only pending items this month
      setAdvances(data.filter(a => a.status === 'PENDING'));
      setLoading(false);
    });

    return () => unsubAdvances();
  }, []);

  const handleAction = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await updateAdvanceStatus(id, status);
      showAlert(`คำขอถูก${status === 'APPROVED' ? 'อนุมัติ' : 'ปฏิเสธ'}แล้ว`);
    } catch (e) {
      showAlert('เกิดข้อผิดพลาด');
    }
  };

  if (loading) {
     return <div className="flex justify-center items-center py-20"><div className="w-10 h-10 border-4 border-pink-500/30 border-t-pink-500 rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 pb-20">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => navigate(-1)}
          className="p-3 bg-slate-50 dark:bg-white/5 backdrop-blur-md rounded-full shadow-sm border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-xl text-amber-600 dark:text-amber-400">
            <HandCoins className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">อนุมัติเบิกล่วงหน้า</h2>
        </div>
      </div>

      <div className="space-y-4">
        {advances.length > 0 ? advances.map(adv => (
          <div key={adv.id} className="bg-white dark:bg-[#1a2f3a] rounded-3xl p-5 shadow-sm border border-slate-200 dark:border-white/10 flex flex-col gap-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{users[adv.userId]?.displayName || 'ไม่ทราบชื่อ'}</h3>
                <span className="text-sm font-medium text-slate-500 dark:text-white/50">{adv.date}</span>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-pink-500">฿{adv.amount.toLocaleString()}</p>
              </div>
            </div>
            
            <div className="flex gap-3 mt-2">
              <button 
                onClick={() => handleAction(adv.id!, 'REJECTED')}
                className="flex-1 py-3 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-white/70 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
               >
                <X className="w-5 h-5"/> ปฏิเสธ
              </button>
              <button 
                onClick={() => handleAction(adv.id!, 'APPROVED')}
                className="flex-1 py-3 bg-amber-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20"
               >
                <Check className="w-5 h-5"/> อนุมัติ
              </button>
            </div>
          </div>
        )) : (
          <div className="text-center p-8 bg-slate-50 dark:bg-white/5 rounded-[2rem] border border-dashed border-slate-200 dark:border-white/10">
            <p className="text-slate-500 dark:text-white/50 font-medium">ไม่มีคำขอรออนุมัติ</p>
          </div>
        )}
      </div>
    </div>
  );
}
