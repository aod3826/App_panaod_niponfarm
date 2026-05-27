import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { EventType, Sow } from '../types';
import { getHistoricalBreedData, getActiveBoars } from '../services/sowService';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (type: EventType, date: string, details: any) => void;
  type: EventType | null;
}

export default function EventModals({ isOpen, onClose, onSubmit, type }: EventModalProps) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [details, setDetails] = useState<any>({});
  const [historicalData, setHistoricalData] = useState<{boars: string[], semens: string[]}>({ boars: [], semens: [] });
  const [activeBoars, setActiveBoars] = useState<Sow[]>([]);

  useEffect(() => {
    if (isOpen && type === 'BREED') {
      getHistoricalBreedData().then(setHistoricalData);
      getActiveBoars().then(setActiveBoars);
    }
    if (isOpen) {
      setDate(new Date().toISOString().split('T')[0]);
      // Reset details based on type
      if (type === 'BREED') setDetails({ method: 'NATURAL', boarId: '', semenId: '', source: '' });
      else if (type === 'ULTRASOUND') setDetails({ result: 'POSITIVE' });
      else if (type === 'FARROW') setDetails({ liveBorn: '', stillborn: '', mummy: '', avgWeight: '' });
      else if (type === 'WEAN') setDetails({ weanedCount: '', totalWeight: '' });
      else if (type === 'HEALTH') setDetails({ type: 'GENERAL', notes: '' });
      else if (type === 'CULL') setDetails({ reason: '' });
      else if (type === 'HEAT_RETURN') setDetails({ notes: '' });
    }
  }, [isOpen, type]);

  if (!isOpen || !type) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(type, date, details);
  };

  const renderFields = () => {
    switch (type) {
      case 'BREED':
        return (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-600 dark:text-white/70 mb-2 ml-1">วิธีผสม</label>
              <select 
                className="w-full p-4 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00bcd4] focus:border-transparent transition-all appearance-none"
                value={details.method}
                onChange={e => setDetails({...details, method: e.target.value})}
              >
                <option value="NATURAL" className="text-gray-800">ผสมจริง (Natural)</option>
                <option value="AI" className="text-gray-800">ผสมเทียม (AI)</option>
              </select>
            </div>
            {details.method === 'NATURAL' ? (
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-600 dark:text-white/70 mb-2 ml-1">พ่อพันธุ์</label>
                {activeBoars.length > 0 ? (
                  <select 
                    className="w-full p-4 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00bcd4] focus:border-transparent transition-all appearance-none"
                    value={details.boarId || ''}
                    onChange={e => setDetails({...details, boarId: e.target.value})}
                    required
                  >
                    <option value="" className="text-gray-800">-- เลือกพ่อพันธุ์ --</option>
                    {activeBoars.map(b => (
                      <option key={b.id} value={b.sowId} className="text-gray-800">
                        {b.sowId} - {b.breed} {b.penId ? `(คอก: ${b.penId})` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input 
                    type="text"
                    required
                    placeholder="ใส่รหัสพ่อพันธุ์"
                    className="w-full p-4 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00bcd4] focus:border-transparent transition-all"
                    value={details.boarId || ''}
                    onChange={e => setDetails({...details, boarId: e.target.value})}
                  />
                )}
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-600 dark:text-white/70 mb-2 ml-1">รหัสน้ำเชื้อ</label>
                  <input 
                    type="text" 
                    list="semen-list"
                    className="w-full p-4 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#00bcd4] focus:border-transparent transition-all"
                    value={details.semenId || ''}
                    onChange={e => setDetails({...details, semenId: e.target.value})}
                    required
                  />
                  <datalist id="semen-list">
                    {historicalData.semens.map(s => <option key={s} value={s} />)}
                  </datalist>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-600 dark:text-white/70 mb-2 ml-1">แหล่งที่มา</label>
                  <input 
                    type="text" 
                    className="w-full p-4 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#00bcd4] focus:border-transparent transition-all"
                    value={details.source || ''}
                    onChange={e => setDetails({...details, source: e.target.value})}
                  />
                </div>
              </>
            )}
          </>
        );
      case 'ULTRASOUND':
        return (
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-600 dark:text-white/70 mb-2 ml-1">ผลการตรวจ</label>
            <select 
              className="w-full p-4 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00bcd4] focus:border-transparent transition-all appearance-none"
              value={details.result}
              onChange={e => setDetails({...details, result: e.target.value})}
            >
              <option value="POSITIVE" className="text-gray-800">ท้อง (Positive)</option>
              <option value="NEGATIVE" className="text-gray-800">ไม่ติด (Negative)</option>
              <option value="ABORTION" className="text-gray-800">แท้ง (Abortion)</option>
            </select>
          </div>
        );
      case 'FARROW':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-600 dark:text-white/70 mb-2 ml-1">ลูกเกิดรอด</label>
              <input type="number" min="0" className="w-full p-4 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00bcd4] focus:border-transparent transition-all" value={details.liveBorn ?? ''} onChange={e => setDetails({...details, liveBorn: e.target.value === '' ? '' : Number(e.target.value)})} required />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-600 dark:text-white/70 mb-2 ml-1">ตายโคม</label>
              <input type="number" min="0" className="w-full p-4 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00bcd4] focus:border-transparent transition-all" value={details.stillborn ?? ''} onChange={e => setDetails({...details, stillborn: e.target.value === '' ? '' : Number(e.target.value)})} required />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-600 dark:text-white/70 mb-2 ml-1">มัมมี่</label>
              <input type="number" min="0" className="w-full p-4 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00bcd4] focus:border-transparent transition-all" value={details.mummy ?? ''} onChange={e => setDetails({...details, mummy: e.target.value === '' ? '' : Number(e.target.value)})} required />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-600 dark:text-white/70 mb-2 ml-1">น้ำหนักเฉลี่ย (กก.)</label>
              <input type="number" step="0.1" min="0" className="w-full p-4 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00bcd4] focus:border-transparent transition-all" value={details.avgWeight ?? ''} onChange={e => setDetails({...details, avgWeight: e.target.value === '' ? '' : Number(e.target.value)})} required />
            </div>
          </div>
        );
      case 'WEAN':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-600 dark:text-white/70 mb-2 ml-1">จำนวนลูกหย่านม</label>
              <input type="number" min="0" className="w-full p-4 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00bcd4] focus:border-transparent transition-all" value={details.weanedCount ?? ''} onChange={e => setDetails({...details, weanedCount: e.target.value === '' ? '' : Number(e.target.value)})} required />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-600 dark:text-white/70 mb-2 ml-1">น้ำหนักรวม (กก.)</label>
              <input type="number" step="0.1" min="0" className="w-full p-4 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00bcd4] focus:border-transparent transition-all" value={details.totalWeight ?? ''} onChange={e => setDetails({...details, totalWeight: e.target.value === '' ? '' : Number(e.target.value)})} required />
            </div>
          </div>
        );
      case 'HEALTH':
        return (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-600 dark:text-white/70 mb-2 ml-1">ประเภท</label>
              <select 
                className="w-full p-4 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00bcd4] focus:border-transparent transition-all appearance-none"
                value={details.type}
                onChange={e => setDetails({...details, type: e.target.value})}
              >
                <option value="GENERAL" className="text-gray-800">ทั่วไป</option>
                <option value="SICK" className="text-gray-800">ป่วย/รักษา</option>
                <option value="VACCINE" className="text-gray-800">วัคซีน</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-600 dark:text-white/70 mb-2 ml-1">หมายเหตุ</label>
              <textarea 
                className="w-full p-4 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#00bcd4] focus:border-transparent transition-all"
                rows={3}
                value={details.notes || ''}
                onChange={e => setDetails({...details, notes: e.target.value})}
              ></textarea>
            </div>
          </>
        );
      case 'CULL':
      case 'HEAT_RETURN':
        return (
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-600 dark:text-white/70 mb-2 ml-1">สาเหตุ/หมายเหตุ</label>
            <textarea 
              className="w-full p-4 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#00bcd4] focus:border-transparent transition-all"
              rows={3}
              value={details.notes || details.reason || ''}
              onChange={e => setDetails({...details, [type === 'CULL' ? 'reason' : 'notes']: e.target.value})}
              required={type === 'CULL'}
            ></textarea>
          </div>
        );
      default:
        return null;
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'BREED': return 'บันทึกผสมพันธุ์';
      case 'ULTRASOUND': return 'บันทึกตรวจสัด/อัลตราซาวด์';
      case 'FARROW': return 'บันทึกคลอด';
      case 'WEAN': return 'บันทึกหย่านม';
      case 'HEALTH': return 'บันทึกสุขภาพ';
      case 'CULL': return 'คัดทิ้งแม่หมู';
      case 'HEAT_RETURN': return 'แจ้งกลับสัด';
      default: return 'บันทึกกิจกรรม';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/80 dark:bg-[#0a2e36]/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-50 dark:bg-[#0f4c5c] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-white/20">
        <div className="flex justify-between items-center p-5 border-b border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-wide">{getTitle()}</h3>
          <button type="button" onClick={onClose} className="p-2 text-slate-600 dark:text-white/50  rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-600 dark:text-white/70 mb-2 ml-1">วันที่ทำกิจกรรม</label>
            <input 
              type="date" 
              className="w-full p-4 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00bcd4] focus:border-transparent transition-all"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
            />
          </div>
          
          {renderFields()}

          <div className="mt-8">
            <button 
              type="submit" 
              className="w-full bg-[#00bcd4] text-slate-900 dark:text-white font-bold p-4 rounded-2xl shadow-[0_0_20px_rgba(0,188,212,0.3)] hover:bg-cyan-400 active:scale-95 transition-all text-lg"
            >
              บันทึกข้อมูล
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
