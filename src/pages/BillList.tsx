import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Receipt, 
  Calendar as CalendarIcon, 
  ChevronRight, 
  Search, 
  Plus, 
  FileText,
  Image as ImageIcon,
  DollarSign,
  User,
  Filter,
  Loader2,
  X,
  Download,
  Maximize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getBills, Bill, getBillItems, BillItem } from '../services/billService';
import { useBottomSheet } from '../contexts/BottomSheetContext';

const formatBillDate = (dateStr: string) => {
  if (!dateStr) return 'ไม่ระบุวันที่';
  // Try to see if it's already a valid date
  const date = new Date(dateStr);
  if (!isNaN(date.getTime()) && dateStr.includes('-')) {
    return date.toLocaleDateString('th-TH');
  }
  // Return original string if it looks like a manual date (e.g. 30/3/69)
  return dateStr;
};

function ImageModal({ imageUrl, onClose }: { imageUrl: string, onClose: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4"
    >
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white z-10 backdrop-blur-md border border-white/10 transition-colors"
      >
        <X className="w-6 h-6" />
      </button>
      
      <div className="absolute top-6 left-6 flex gap-2 z-10">
        <a 
          href={imageUrl} 
          download 
          target="_blank" 
          rel="noreferrer"
          className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md border border-white/10 transition-colors"
        >
          <Download className="w-6 h-6" />
        </a>
      </div>

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative w-full h-full flex items-center justify-center"
      >
        <img 
          src={imageUrl} 
          alt="Full Bill" 
          className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
          onClick={(e) => e.stopPropagation()}
        />
      </motion.div>
      
      <div className="absolute bottom-10 left-0 right-0 flex justify-center pointer-events-none">
        <p className="px-4 py-2 bg-black/40 text-white/60 text-xs rounded-full backdrop-blur-md font-bold tracking-widest uppercase">
          แตะด้านนอกเพื่อปิด
        </p>
      </div>
    </motion.div>
  );
}

function BillDetail({ bill }: { bill: Bill }) {
  const [items, setItems] = useState<BillItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isImageOpen, setIsImageOpen] = useState(false);

  useEffect(() => {
    async function fetchItems() {
      const data = await getBillItems(bill.id!);
      setItems(data);
      setLoading(false);
    }
    fetchItems();
  }, [bill.id]);

  return (
    <div className="p-1">
      <AnimatePresence>
        {isImageOpen && <ImageModal imageUrl={bill.imageUrl} onClose={() => setIsImageOpen(false)} />}
      </AnimatePresence>

      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <h3 className="text-xl font-black text-slate-900 dark:text-white">{bill.vendorName}</h3>
             {bill.referenceNo && (
               <span className="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-white/10 rounded-lg text-slate-500 font-black">
                 {bill.referenceNo}
               </span>
             )}
          </div>
          <p className="text-sm text-slate-500 dark:text-white/50">{formatBillDate(bill.billDate)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-slate-400 uppercase">ยอดรวม</p>
          <p className="text-2xl font-black text-emerald-500">฿{bill.totalAmount.toLocaleString()}</p>
        </div>
      </div>

      {bill.imageUrl && (
        <div 
          className="group relative mb-6 rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 aspect-video bg-slate-100 dark:bg-white/5 flex items-center justify-center cursor-zoom-in"
          onClick={() => setIsImageOpen(true)}
        >
          <img 
            src={bill.imageUrl} 
            alt="Bill" 
            className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
            <div className="bg-white/90 dark:bg-black/80 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all transform scale-90 group-hover:scale-100">
               <Maximize2 className="w-5 h-5 text-slate-900 dark:text-white" />
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4 mb-6">
        <div className="flex items-center gap-3 text-slate-600 dark:text-white/70">
          <User className="w-4 h-4" />
          <span className="text-sm">บันทึกโดย: <span className="font-bold">{bill.recordedBy}</span></span>
        </div>
      </div>

      <div className="border-t border-slate-100 dark:border-white/5 pt-4">
        <h4 className="text-sm font-black text-slate-400 uppercase mb-3 px-1">รายการสินค้า</h4>
        <div className="space-y-2">
          {loading ? (
             <div className="flex justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
             </div>
          ) : items.length === 0 ? (
            <p className="text-center text-slate-400 py-4 italic text-sm">ไม่มีข้อมูลรายการ</p>
          ) : (
            items.map(item => (
              <div key={item.id} className="flex justify-between items-center bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-slate-100 dark:border-white/5">
                <div>
                  <p className="font-bold text-slate-900 dark:text-white text-sm">{item.description}</p>
                  <p className="text-[10px] text-slate-400 uppercase font-black">{item.quantity} Unit x ฿{item.pricePerUnit.toLocaleString()}</p>
                </div>
                <p className="font-black text-slate-900 dark:text-white">฿{item.total.toLocaleString()}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function BillList() {
  const navigate = useNavigate();
  const { showBottomSheet } = useBottomSheet();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    setLoading(true);
    const data = await getBills();
    setBills(data);
    setLoading(false);
  };

  const handleBillClick = (bill: Bill) => {
    showBottomSheet(<BillDetail bill={bill} />);
  };

  const filteredBills = bills.filter(bill => 
    bill.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bill.recordedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bill.referenceNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bill.billDate.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-white pb-24">
      {/* Header */}
      <div className="bg-white dark:bg-[#1e293b] sticky top-0 z-20 border-b border-slate-200 dark:border-white/5 shadow-sm">
        <div className="p-4 max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
              <Receipt className="w-6 h-6 text-emerald-500" />
              บันทึกรายจ่ายวัตถุดิบ
            </h1>
          </div>
          
          <button 
            onClick={() => navigate('/scan')}
            className="p-2 bg-emerald-500 text-white rounded-full shadow-lg shadow-emerald-500/20 active:scale-95 transition-all text-sm px-4 font-black flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> สแกนบิลใหม่
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-4 pb-4 max-w-4xl mx-auto">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 via-[#00bcd4] to-blue-500 rounded-2xl opacity-0 group-focus-within:opacity-80 transition duration-1000 group-focus-within:duration-200 animate-search-glow blur-sm"></div>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text"
                placeholder="ค้นหารายจ่าย (ร้านค้า, วันที่, เลขอ้างอิง)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-100/90 dark:bg-white/5 backdrop-blur-xl border-none rounded-2xl py-3 pl-10 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all shadow-sm"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 max-w-4xl mx-auto space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
            <p className="font-bold text-slate-400 animate-pulse uppercase tracking-wider">กำลังโหลดข้อมูลรายจ่าย...</p>
          </div>
        ) : filteredBills.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-10 text-center">
            <div className="w-20 h-20 bg-slate-200 dark:bg-white/5 rounded-full flex items-center justify-center mb-6">
              <FileText className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">ไม่มีประวัติรายจ่าย</h3>
            <p className="text-slate-500 dark:text-white/50 text-sm">เริ่มสแกนบิลสั่งซื้อวัตถุดิบเพื่อบันทึกต้นทุนพาร์มของคุณ</p>
            <button 
              onClick={() => navigate('/scan')}
              className="mt-6 px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-2xl active:scale-95 transition-all"
            >
              สแกนบิลรายจ่าย
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-2 mb-1">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                ประวัติรายจ่าย ({filteredBills.length} รายการ)
              </p>
              <button className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                <Filter className="w-3 h-3" /> กรอง
              </button>
            </div>
            
            <AnimatePresence mode="popLayout">
              {filteredBills.map((bill, index) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  key={bill.id}
                  onClick={() => handleBillClick(bill)}
                  className="bg-white dark:bg-[#1e293b] p-4 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm active:scale-[0.98] transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                      {bill.imageUrl ? (
                        <div className="w-full h-full rounded-2xl overflow-hidden">
                          <img src={bill.imageUrl} className="w-full h-full object-cover" alt="Preview"/>
                        </div>
                      ) : (
                        <ImageIcon className="w-6 h-6" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 dark:text-white truncate">
                          {bill.vendorName}
                        </h3>
                        {bill.referenceNo && (
                          <span className="text-[8px] px-1.5 py-0.5 bg-slate-100 dark:bg-white/5 rounded text-slate-400 font-black tracking-tighter">
                            {bill.referenceNo}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-tighter">
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="w-3 h-3" />
                          {formatBillDate(bill.billDate)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Plus className="w-3 h-3" />
                          {bill.recordedBy}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <div>
                        <p className="text-xs font-black text-emerald-500">฿{bill.totalAmount.toLocaleString()}</p>
                        <p className="text-[10px] text-slate-400 uppercase font-black">Total</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-300" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
