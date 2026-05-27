import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, List as ListIcon, LayoutGrid, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useBottomSheet } from '../../contexts/BottomSheetContext';
import { savePigSale, getRecentBuyers } from '../../services/saleService';
import { WeighingRecord } from '../../types';
import SignaturePad from '../../components/SignaturePad';
import clsx from 'clsx';

const DRAFT_KEY = 'pig_sale_draft';

export default function NewSale() {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const { showAlert, showConfirm } = useBottomSheet();
  
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    saleId: `PS-${new Date().getFullYear()}${(new Date().getMonth()+1).toString().padStart(2, '0')}${new Date().getDate().toString().padStart(2, '0')}-${Math.floor(Math.random() * 1000)}`,
    buyerName: '',
    buyerEmail: '',
    vehicleReg: '',
    saleType: 'ขายเหมา',
    paymentStatus: 'UNPAID' as 'PAID' | 'UNPAID',
    totalPigs: '',
    pricePerKg: '',
    deductions: ''
  });

  const [records, setRecords] = useState<WeighingRecord[]>([
    { id: Date.now().toString(), index: 1, grossWeight: '', tareWeight: '', netWeight: 0 }
  ]);
  const [signature, setSignature] = useState('');
  
  const [viewType, setViewType] = useState<'CARD' | 'TABLE'>('CARD');
  const [isSaving, setIsSaving] = useState(false);
  const [showSigModal, setShowSigModal] = useState(false);
  const [recentBuyers, setRecentBuyers] = useState<{name: string, email: string, vehicleReg: string}[]>([]);

  // Focus ref array for speed entry
  const grossRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Load recent buyers
  useEffect(() => {
    getRecentBuyers().then(buyers => setRecentBuyers(buyers));
  }, []);

  // Crash Recovery
  useEffect(() => {
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft) {
      showConfirm(
        "พบข้อมูลชั่งหมูค้างไว้ในระบบ ต้องการทำรายการต่อหรือไม่? \n(กดยกเลิกเพื่อล้างข้อมูล)",
        () => {
          try {
            const parsed = JSON.parse(draft);
            if (parsed.formData) setFormData(parsed.formData);
            if (parsed.records) setRecords(parsed.records);
          } catch(e) {}
        },
        "กู้คืนข้อมูลร่าง",
        () => {
          localStorage.removeItem(DRAFT_KEY);
        }
      );
    }
  }, []); // Only run once on mount

  // Auto-Save Draft
  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ formData, records }));
  }, [formData, records]);

  // Anti-Data Loss (Before Unload)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (records.length > 0 && records[0].grossWeight !== '') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [records]);

  const calculateNet = (gross: number | '', tare: number | '') => {
    const g = Number(gross) || 0;
    const t = Number(tare) || 0;
    return Math.max(0, g - t);
  };

  const updateRecord = (index: number, field: keyof WeighingRecord, value: number | string) => {
    const newRecords = [...records];
    newRecords[index] = { ...newRecords[index], [field]: value };
    newRecords[index].netWeight = calculateNet(newRecords[index].grossWeight, newRecords[index].tareWeight);
    setRecords(newRecords);
  };

  const addNewRecord = (triggerIndex: number) => {
    // If the triggered index is valid, copy its tare weight, otherwise default to top
    const prevTare = records[triggerIndex]?.tareWeight || records[0]?.tareWeight || '';
    setRecords(prev => [
      { id: Date.now().toString(), index: prev.length + 1, grossWeight: '', tareWeight: prevTare, netWeight: 0 },
      ...prev
    ]);
    // Focus the newest input (which will be at index 0 because we prepend)
    setTimeout(() => {
      const nextInput = grossRefs.current[0];
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }
    }, 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addNewRecord(index);
    }
  };

  const totalNetWeight = records.reduce((sum, r) => sum + r.netWeight, 0);
  const totalPigsNum = Number(formData.totalPigs) || records.length; // fallback
  const averageWeight = totalPigsNum > 0 ? (totalNetWeight / totalPigsNum) : 0;
  const grossTotal = totalNetWeight * (Number(formData.pricePerKg) || 0);
  const netTotal = grossTotal - (Number(formData.deductions) || 0);

  const handleSubmit = async () => {
    if (!formData.buyerName || !formData.date || !formData.pricePerKg) {
      showAlert('กรุณากรอกข้อมูล ผู้ซื้อ และ ราคาต่อกิโลกรัม ให้ครบถ้วน');
      return;
    }
    if (!signature) {
      showAlert('กรุณาเซ็นชื่อผู้รับหมูก่อนบันทึกรายการ');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        paymentStatus: formData.paymentStatus,
        totalPigs: totalPigsNum,
        pricePerKg: Number(formData.pricePerKg),
        deductions: Number(formData.deductions),
        records,
        totalNetWeight,
        averageWeight,
        grossTotal,
        netTotal,
        signature
      };
      
      const resultId = await savePigSale(payload, userProfile?.displayName || user?.email || 'พนักงาน');
      if (resultId) {
        localStorage.removeItem(DRAFT_KEY);
        showAlert('บันทึกข้อมูลการขายเรียบร้อยแล้ว');
        navigate('/sales');
      } else {
        throw new Error('บันทึกไม่สำเร็จ');
      }
    } catch (error: any) {
      console.error('Error saving sale:', error);
      showAlert(error.message || 'บันทึกไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต');
    } finally {
      setIsSaving(false);
    }
  };

  const nextStep = () => {
    if (step === 1 && !formData.buyerName) {
      showAlert('กรุณากรอกชื่อผู้ซื้อ');
      return;
    }
    if (step === 2 && records.length === 0) {
      showAlert('กรุณาชั่งน้ำหนักอย่างน้อย 1 ครั้ง');
      return;
    }
    setStep(s => Math.min(3, s + 1));
  };
  const prevStep = () => setStep(s => Math.max(1, s - 1));

  return (
    <div className="max-w-4xl mx-auto pb-32 animate-in fade-in duration-300 w-full">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate('/sales')} className="w-10 h-10 bg-white dark:bg-white/10 rounded-full flex items-center justify-center text-slate-900 dark:text-white active:scale-95 transition-transform">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-wide flex-1">บันทึกการขาย</h2>
      </div>

      {/* Stepper */}
      <div className="mb-10 flex justify-between relative max-w-xl mx-auto px-4">
         <div className="absolute top-[35%] left-10 right-10 h-0.5 bg-white dark:bg-white/10 -z-10"></div>
         <div className="flex flex-col items-center px-2">
            <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 transition-colors", step >= 1 ? 'border-[#00bcd4] text-[#00bcd4] bg-[#00bcd4]/10 shadow-[0_0_15px_rgba(0,188,212,0.3)]' : 'border-slate-200 dark:border-white/20 text-slate-600 dark:text-white/40 bg-white dark:bg-[#0a2e36]')}>1</div>
            <span className={clsx("text-xs mt-2 font-medium tracking-wide", step >= 1 ? 'text-[#00bcd4]' : 'text-slate-600 dark:text-white/40')}>ข้อมูล</span>
         </div>
         <div className="flex flex-col items-center px-2">
            <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 transition-colors", step >= 2 ? 'border-[#00bcd4] text-[#00bcd4] bg-[#00bcd4]/10 shadow-[0_0_15px_rgba(0,188,212,0.3)]' : 'border-slate-200 dark:border-white/20 text-slate-600 dark:text-white/40 bg-white dark:bg-[#0a2e36]')}>2</div>
            <span className={clsx("text-xs mt-2 font-medium tracking-wide", step >= 2 ? 'text-[#00bcd4]' : 'text-slate-600 dark:text-white/40')}>ชั่งน้ำหนัก</span>
         </div>
         <div className="flex flex-col items-center px-2">
            <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 transition-colors", step >= 3 ? 'border-[#00bcd4] text-[#00bcd4] bg-[#00bcd4]/10 shadow-[0_0_15px_rgba(0,188,212,0.3)]' : 'border-slate-200 dark:border-white/20 text-slate-600 dark:text-white/40 bg-white dark:bg-[#0a2e36]')}>3</div>
            <span className={clsx("text-xs mt-2 font-medium tracking-wide", step >= 3 ? 'text-[#00bcd4]' : 'text-slate-600 dark:text-white/40')}>สรุปยอด</span>
         </div>
      </div>

      <div className="p-4 max-w-xl mx-auto">
        {step === 1 && (
          <div className="bg-white dark:bg-white/10 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-white/20 p-6 sm:p-8 animate-in fade-in slide-in-from-right-4 shadow-2xl dark:shadow-xl">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">ข้อมูลทั่วไป</h3>
            <div className="space-y-5">
              <div>
                <label className="block text-sm text-slate-600 dark:text-white/60 mb-2 font-medium">วันที่ขาย</label>
                <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-white dark:bg-[#0a2e36] text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3.5 focus:outline-none focus:border-[#00bcd4] focus:ring-1 focus:ring-[#00bcd4]" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm text-slate-600 dark:text-white/60 mb-2 font-medium">ผู้ซื้อ (Buyer)</label>
                  <input 
                    type="text" 
                    placeholder="ระบุชื่อผู้ซื้อ" 
                    list="buyers-list"
                    value={formData.buyerName} 
                    onChange={e => {
                      const val = e.target.value;
                      const matched = recentBuyers.find(b => b.name === val);
                      if (matched) {
                        setFormData({
                          ...formData, 
                          buyerName: val, 
                          buyerEmail: matched.email || formData.buyerEmail, 
                          vehicleReg: matched.vehicleReg || formData.vehicleReg
                        });
                      } else {
                        setFormData({...formData, buyerName: val});
                      }
                    }} 
                    className="w-full bg-white dark:bg-[#0a2e36] text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-white/30 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3.5 focus:outline-none focus:border-[#00bcd4] focus:ring-1 focus:ring-[#00bcd4]" 
                  />
                  <datalist id="buyers-list">
                    {recentBuyers.map(b => (
                      <option key={b.name} value={b.name} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-sm text-slate-600 dark:text-white/60 mb-2 font-medium">อีเมลผู้ซื้อ (Gmail)</label>
                  <input type="email" placeholder="example@gmail.com" value={formData.buyerEmail} onChange={e => setFormData({...formData, buyerEmail: e.target.value})} className="w-full bg-white dark:bg-[#0a2e36] text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-white/30 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3.5 focus:outline-none focus:border-[#00bcd4] focus:ring-1 focus:ring-[#00bcd4]" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm text-slate-600 dark:text-white/60 mb-2 font-medium">ผู้ขาย (Seller)</label>
                  <input type="text" value="นิพนธ์ฟาร์ม" disabled className="w-full bg-white/50 dark:bg-[#0a2e36]/50 text-slate-600 dark:text-white/50 border border-slate-100 dark:border-white/5 rounded-xl px-4 py-3.5 cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 dark:text-white/60 mb-2 font-medium">ทะเบียนรถ</label>
                  <input type="text" placeholder="ระบุทะเบียนรถ" value={formData.vehicleReg} onChange={e => setFormData({...formData, vehicleReg: e.target.value})} className="w-full bg-white dark:bg-[#0a2e36] text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-white/30 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3.5 focus:outline-none focus:border-[#00bcd4] focus:ring-1 focus:ring-[#00bcd4]" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-600 dark:text-white/60 mb-2 font-medium">ประเภท</label>
                <div className="w-full bg-white dark:bg-[#0a2e36] border border-slate-200 dark:border-white/10 rounded-xl focus-within:border-[#00bcd4] focus-within:ring-1 focus-within:ring-[#00bcd4] px-4 py-3.5">
                  <select value={formData.saleType} onChange={e => setFormData({...formData, saleType: e.target.value})} className="w-full bg-transparent text-slate-900 dark:text-white focus:outline-none appearance-none">
                    <option value="ขายเหมา" className="bg-white dark:bg-[#0a2e36]">ขายเหมา</option>
                    <option value="ขายชั่งกิโล" className="bg-white dark:bg-[#0a2e36]">ขายชั่งกิโล</option>
                    <option value="หมูปลด" className="bg-white dark:bg-[#0a2e36]">หมูปลด</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4">
            <div className="flex justify-between items-center mb-6 px-1">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">รายการชั่งน้ำหนัก</h3>
              <div className="flex items-center gap-3">
                <div className="flex bg-white dark:bg-[#0a2e36] rounded-xl p-1 border border-slate-200 dark:border-white/10 shadow-inner">
                  <button onClick={() => setViewType('CARD')} className={clsx("p-1.5 rounded-lg transition-colors", viewType === 'CARD' ? 'bg-[#00bcd4]/20 text-[#00bcd4]' : 'text-slate-600 dark:text-white/40')}><ListIcon className="w-5 h-5"/></button>
                  <button onClick={() => setViewType('TABLE')} className={clsx("p-1.5 rounded-lg transition-colors", viewType === 'TABLE' ? 'bg-[#00bcd4]/20 text-[#00bcd4]' : 'text-slate-600 dark:text-white/40')}><LayoutGrid className="w-5 h-5"/></button>
                </div>
                <button onClick={() => addNewRecord(0)} className="bg-[#00bcd4] text-[#061e24] px-4 py-2 rounded-xl font-bold text-sm flex items-center shadow-xl dark:shadow-2xl active:scale-95 transition-transform hover:bg-[#00e5ff]">
                  <span className="text-lg mr-1 leading-none">+</span> เพิ่ม
                </button>
              </div>
            </div>

            {viewType === 'CARD' ? (
              <div className="space-y-4">
                {records.map((r, i) => (
                  <div key={r.id} className="bg-white dark:bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-slate-200 dark:border-white/20 relative shadow-xl dark:shadow-2xl">
                     <div className="flex justify-between items-center mb-5">
                       <span className="bg-black/20 text-[#00bcd4] px-4 py-1.5 rounded-full text-xs font-bold font-mono border border-[#00bcd4]/30 uppercase tracking-wider">ชั่งครั้งที่ {r.index}</span>
                       {records.length > 1 && (
                         <button onClick={() => setRecords(records.filter((_, idx) => idx !== i))} className="p-2 text-slate-600 dark:text-white/30 hover:text-red-400 rounded-full hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"><Trash2 className="w-5 h-5"/></button>
                       )}
                     </div>
                     <div className="grid grid-cols-2 gap-5">
                        <div>
                          <label className="block text-sm text-slate-600 dark:text-white/60 mb-2 font-medium">น้ำหนักรวม <span className="text-xs font-normal opacity-70">(กก.)</span></label>
                          <input 
                             ref={(el) => { if (el) grossRefs.current[i] = el; }}
                             type="number" 
                             value={r.grossWeight}
                             onChange={e => updateRecord(i, 'grossWeight', e.target.value)}
                             onKeyDown={e => handleKeyDown(e, i)}
                             className="w-full bg-white dark:bg-[#0a2e36] text-center text-slate-900 dark:text-white text-2xl border border-[#00bcd4]/50 rounded-2xl px-2 py-4 focus:outline-none focus:border-[#00bcd4] focus:ring-2 focus:ring-[#00bcd4]/20 shadow-inner font-mono transition-all" 
                           />
                        </div>
                        <div>
                          <label className="block text-sm text-slate-600 dark:text-white/60 mb-2 font-medium">หักกรง <span className="text-xs font-normal opacity-70">(กก.)</span></label>
                          <input 
                             type="number" 
                             value={r.tareWeight}
                             onChange={e => updateRecord(i, 'tareWeight', e.target.value)}
                             onKeyDown={e => handleKeyDown(e, i)}
                             className="w-full bg-white dark:bg-[#0a2e36] text-center text-red-400 text-2xl border border-slate-200 dark:border-white/10 rounded-2xl px-2 py-4 focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400/20 shadow-inner font-mono" 
                           />
                        </div>
                     </div>
                     <div className="mt-5 pt-5 border-t border-slate-200 dark:border-white/10 flex justify-between items-center text-slate-900 dark:text-white">
                        <span className="text-slate-600 dark:text-white/60 font-medium tracking-wide">น้ำหนักสุทธิ</span>
                        <div className="flex items-baseline gap-1 text-[#00bcd4]">
                          <span className="text-4xl font-bold font-mono">{r.netWeight.toFixed(1)}</span>
                          <span className="text-sm font-medium">กก.</span>
                        </div>
                     </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-white/10 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-white/20 overflow-hidden shadow-xl dark:shadow-2xl">
                <table className="w-full text-center text-sm whitespace-nowrap">
                  <thead className="bg-white/80 dark:bg-[#0a2e36]/80 text-slate-600 dark:text-white/60 border-b border-slate-200 dark:border-white/10">
                    <tr>
                      <th className="p-4 font-medium">ที่</th>
                      <th className="p-4 font-medium w-1/3">รวม(กก.)</th>
                      <th className="p-4 font-medium w-1/4">-กรง</th>
                      <th className="p-4 font-medium text-right pr-6">สุทธิ</th>
                      <th className="p-4 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-900 dark:text-white">
                    {records.map((r, i) => (
                      <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                        <td className="p-4 text-slate-600 dark:text-white/50 font-mono">{r.index}</td>
                        <td className="p-2 py-3">
                           <input 
                             ref={(el) => { if (el) grossRefs.current[i] = el; }}
                             type="number" 
                             value={r.grossWeight}
                             onChange={e => updateRecord(i, 'grossWeight', e.target.value)}
                             onKeyDown={e => handleKeyDown(e, i)}
                             className="w-full bg-white dark:bg-[#0a2e36] text-center text-slate-900 dark:text-white border border-[#00bcd4]/50 rounded-lg py-2 focus:outline-none focus:border-[#00bcd4] focus:ring-1 focus:ring-[#00bcd4]/50 font-mono" 
                           />
                        </td>
                        <td className="p-2 py-3">
                           <input 
                             type="number" 
                             value={r.tareWeight}
                             onChange={e => updateRecord(i, 'tareWeight', e.target.value)}
                             onKeyDown={e => handleKeyDown(e, i)}
                             className="w-full bg-white dark:bg-[#0a2e36] text-center text-red-400 border border-slate-200 dark:border-white/10 rounded-lg py-2 focus:outline-none focus:border-red-400 font-mono" 
                           />
                        </td>
                        <td className="p-4 font-bold text-[#00bcd4] text-right font-mono pr-6 text-lg">{r.netWeight.toFixed(1)}</td>
                        <td className="p-3">
                           {records.length > 1 && (
                             <button onClick={() => setRecords(records.filter((_, idx) => idx !== i))} className="text-slate-600 dark:text-white/30 hover:text-red-400 p-1"><Trash2 className="w-4 h-4"/></button>
                           )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-white dark:bg-[#0a2e36]">
                    <tr>
                      <td colSpan={3} className="p-4 text-right font-bold text-slate-600 dark:text-white/60 tracking-wider">รวม</td>
                      <td className="p-4 font-bold text-[#00bcd4] text-xl font-mono text-right pr-6">{totalNetWeight.toFixed(1)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Total Block at Bottom of Step 2 */}
            <div className="mt-6 bg-[#00bcd4] rounded-3xl p-6 border border-[#00bcd4]/50 flex justify-between items-center shadow-[0_0_20px_rgba(0,188,212,0.15)] relative overflow-hidden">
               <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/always-grey.png')] opacity-10"></div>
               <span className="text-[#061e24] font-bold text-lg relative z-10 uppercase tracking-widest">น้ำหนักสุทธิรวม</span>
               <div className="flex items-baseline gap-1 text-[#061e24] relative z-10">
                  <span className="text-4xl font-bold font-mono">{totalNetWeight.toFixed(1)}</span>
                  <span className="font-bold">กก.</span>
               </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4 space-y-5">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 px-1">สรุปรายการ (Summary)</h3>
            
            <div className="grid grid-cols-3 gap-3 bg-white dark:bg-white/10 backdrop-blur-md p-5 rounded-3xl shadow-xl dark:shadow-2xl border border-slate-200 dark:border-white/20 text-center">
              <div>
                <p className="text-[11px] text-[#00bcd4] mb-2 font-medium uppercase tracking-wider">จำนวนตัว</p>
                <div className="bg-white dark:bg-[#0a2e36] border border-slate-100 dark:border-white/5 rounded-2xl py-3 font-bold text-2xl text-slate-900 dark:text-white font-mono shadow-inner">{totalPigsNum}</div>
              </div>
              <div className="relative">
                <div className="absolute top-2 bottom-2 left-0 w-px bg-white dark:bg-white/10"></div>
                <div className="absolute top-2 bottom-2 right-0 w-px bg-white dark:bg-white/10"></div>
                <p className="text-[11px] text-[#00bcd4] mb-2 font-medium uppercase tracking-wider">นน.สุทธิรวม</p>
                <div className="bg-white dark:bg-[#0a2e36] border border-slate-100 dark:border-white/5 rounded-2xl py-3 font-bold text-2xl text-slate-900 dark:text-white font-mono shadow-inner">{totalNetWeight.toFixed(1)}</div>
              </div>
              <div>
                <p className="text-[11px] text-[#00bcd4] mb-2 font-medium uppercase tracking-wider">เฉลี่ย/ตัว</p>
                <div className="bg-white dark:bg-[#0a2e36] border border-slate-100 dark:border-white/5 rounded-2xl py-3 font-bold text-2xl text-slate-900 dark:text-white font-mono shadow-inner">{averageWeight.toFixed(2)}</div>
              </div>
            </div>

            <div className="bg-white dark:bg-white/10 backdrop-blur-md p-6 sm:p-8 rounded-3xl shadow-xl dark:shadow-2xl border border-slate-200 dark:border-white/20 space-y-6">
              <div className="flex justify-between items-center bg-slate-100 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
                <span className="text-slate-900 dark:text-white font-medium">ราคาขาย บาท/กก.:</span>
                <input type="number" placeholder="0.00" value={formData.pricePerKg} onChange={e => setFormData({...formData, pricePerKg: e.target.value})} className="w-32 bg-white dark:bg-[#0a2e36] text-right font-bold text-xl text-[#00bcd4] border border-[#00bcd4]/30 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#00bcd4] shadow-inner font-mono" />
              </div>
              
              <div className="flex justify-between items-center px-2 border-b border-slate-200 dark:border-white/10 pb-4">
                <span className="text-slate-600 dark:text-white/60 font-medium">ยอดรวม (บาท)</span>
                <span className="font-bold text-xl text-slate-900 dark:text-white font-mono">{grossTotal.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
              </div>
              
              <div className="flex justify-between items-center px-2 border-b border-slate-200 dark:border-white/10 pb-4">
                <span className="text-red-400 font-medium">หักค่าใช้จ่าย (ถ้ามี)</span>
                <input type="number" placeholder="0.00" value={formData.deductions} onChange={e => setFormData({...formData, deductions: e.target.value})} className="w-32 bg-red-950/30 text-right font-bold text-xl text-red-400 border border-red-500/30 rounded-xl px-3 py-2.5 focus:outline-none focus:border-red-500 shadow-inner font-mono" />
              </div>
              
              <div className="bg-gradient-to-br from-[#0a2e36] to-[#041a1f] p-6 rounded-2xl shadow-inner border border-[#00bcd4]/30 mt-6 relative overflow-hidden">
                <p className="text-[#00bcd4] text-sm font-bold tracking-widest uppercase mb-1">รวมเงินทั้งสิ้น (NET TOTAL)</p>
                <div className="flex items-baseline justify-between mt-1">
                   <span className="text-4xl sm:text-5xl font-bold font-mono text-slate-900 dark:text-white tracking-tight">{netTotal.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                   <span className="font-bold text-slate-600 dark:text-white/50 text-xl ml-2">บาท</span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-white/10 backdrop-blur-md p-6 rounded-3xl shadow-xl dark:shadow-2xl border border-slate-200 dark:border-white/20">
              <h4 className="font-bold text-slate-900 dark:text-white mb-5 text-lg">สถานะการชำระเงิน</h4>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <button 
                  onClick={() => setFormData({...formData, paymentStatus: 'PAID'})}
                  className={clsx("flex items-center justify-center gap-2 py-4 rounded-2xl border-2 font-bold transition-all", formData.paymentStatus === 'PAID' ? "border-green-400 bg-green-500/20 text-green-400 shadow-[0_0_15px_rgba(74,222,128,0.2)]" : "border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/50")}
                >
                  <CheckCircle2 className="w-5 h-5" /> เงินสด
                </button>
                <button 
                  onClick={() => setFormData({...formData, paymentStatus: 'UNPAID'})}
                  className={clsx("flex items-center justify-center gap-2 py-4 rounded-2xl border-2 font-bold transition-all", formData.paymentStatus === 'UNPAID' ? "border-amber-400 bg-amber-500/20 text-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.2)]" : "border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/50")}
                >
                  <AlertCircle className="w-5 h-5" /> ค้างชำระ
                </button>
              </div>

              <div className="border border-dashed border-[#00bcd4]/50 bg-black/20 rounded-2xl p-5 flex flex-col items-center justify-center min-h-[160px] relative overflow-hidden">
                 <p className="absolute top-3 left-4 text-xs font-bold text-[#00bcd4]/70 uppercase tracking-widest">ลายเซ็นผู้ซื้อ:</p>
                 {signature ? (
                   <div className="w-full text-center mt-6 bg-slate-900/90 dark:bg-white/90 rounded-xl p-2">
                     <img src={signature} alt="Signature" className="max-h-[100px] mx-auto mix-blend-multiply" />
                     <button onClick={() => setShowSigModal(true)} className="text-[#00bcd4] text-sm font-bold mt-3 hover:underline">เซ็นใหม่</button>
                   </div>
                 ) : (
                   <button onClick={() => setShowSigModal(true)} className="bg-white dark:bg-[#0a2e36] border border-[#00bcd4]/30 text-[#00bcd4] px-8 py-3.5 rounded-full text-sm font-bold shadow-xl dark:shadow-2xl  transition-colors mt-6 uppercase tracking-wider">
                      คลิกเพื่อเซ็นชื่อยืนยัน
                   </button>
                 )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Signature Modal */}
      {showSigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowSigModal(false)}></div>
          <div className="bg-white dark:bg-[#0a2e36] border border-[#00bcd4]/30 rounded-3xl w-full max-w-sm shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95">
             <div className="px-6 py-5 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-slate-100 dark:bg-white/5">
               <h3 className="font-bold text-lg text-slate-900 dark:text-white">ลายเซ็นผู้ซื้อ/ผู้รับ</h3>
               <button onClick={() => setShowSigModal(false)} className="text-slate-600 dark:text-white/40  bg-black/20 rounded-full p-2"><X className="w-5 h-5"/></button>
             </div>
             <div className="p-6">
                <p className="text-sm text-slate-600 dark:text-white/60 text-center mb-5 tracking-wide">กรุณาเซ็นชื่อลงในกรอบสีขาวด้านล่าง</p>
                <div className="bg-white border-2 border-[#00bcd4]/30 rounded-2xl mb-6 relative z-10 w-full overflow-hidden shadow-inner">
                   {/* Wrapping the SignaturePad so we can intercept its callbacks if needed. 
                       Actually, SignaturePad uses its own `clear` button. */}
                   <SignaturePad 
                      onEnd={(sig) => setSignature(sig)}
                      width={320} height={200}
                   />
                </div>
                <div className="flex gap-4">
                   <button onClick={() => setShowSigModal(false)} className="flex-1 py-3.5 rounded-xl border border-slate-200 dark:border-white/20 font-bold text-slate-600 dark:text-white/70 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">ยกเลิก</button>
                   <button onClick={() => setShowSigModal(false)} className="flex-1 py-3.5 rounded-xl bg-[#00bcd4] font-bold text-[#061e24] shadow-xl dark:shadow-2xl hover:bg-[#00e5ff] active:scale-95 transition-all"><CheckCircle2 className="w-5 h-5 inline-block mr-1 -mt-0.5" /> ยืนยัน</button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Fixed bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#061e24]/90 backdrop-blur-xl border-t border-[#00bcd4]/20 p-4 shadow-[0_-20px_40px_rgba(0,0,0,0.5)] z-[100] pb-safe pb-28 sm:pb-4">
         <div className="max-w-4xl mx-auto w-full flex gap-4">
           {step > 1 && <button onClick={prevStep} className="px-6 sm:px-8 py-3.5 rounded-xl bg-white dark:bg-white/10 font-bold text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/20 active:scale-95 transition-all">{'< กลับ'}</button>}
           {step < 3 ? (
              <button onClick={nextStep} className="flex-1 py-3.5 rounded-xl bg-[#00bcd4] text-[#061e24] font-bold shadow-[0_0_15px_rgba(0,188,212,0.3)] hover:bg-[#00e5ff] active:scale-95 transition-all tracking-wide">
                ต่อไป: {step === 1 ? 'ชั่งน้ำหนัก' : 'สรุปยอด'} {'>'}
              </button>
           ) : (
              <button 
                onClick={handleSubmit} 
                disabled={isSaving} 
                className="flex-1 py-3.5 rounded-xl bg-[#00bcd4] text-[#061e24] font-bold text-lg shadow-[0_0_15px_rgba(0,188,212,0.3)] hover:bg-[#00e5ff] active:scale-95 transition-all tracking-wide disabled:opacity-50 disabled:active:scale-100 flex justify-center items-center gap-2"
              >
                {isSaving ? <><div className="w-5 h-5 border-2 border-[#061e24]/30 border-t-[#061e24] rounded-full animate-spin"></div> กำลังบันทึก...</> : 'บันทึกการขาย'}
              </button>
           )}
         </div>
      </div>
    </div>
  );
}
