import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Mail, Download, Printer, Trash2, ArrowLeft } from 'lucide-react';
import { subscribeToPigSales, deletePigSale } from '../../services/saleService';
import { PigSale } from '../../types';
import { useBottomSheet } from '../../contexts/BottomSheetContext';
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';

export default function SalesList() {
  const navigate = useNavigate();
  const { showAlert, showConfirm } = useBottomSheet();
  const [sales, setSales] = useState<PigSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Ref for PDF generation of selected sale
  const [selectedForPdf, setSelectedForPdf] = useState<PigSale | null>(null);

  useEffect(() => {
    const unsub = subscribeToPigSales((data) => {
      setSales(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleDelete = async (id: string) => {
    showConfirm('ยืนยันการลบรายการนี้?', async () => {
      try {
        await deletePigSale(id);
      } catch (error) {
        showAlert('เกิดข้อผิดพลาดในการลบ');
      }
    });
  };

  const handleEmail = (sale: PigSale) => {
    const subject = `ใบสรุปการขายหมูขุน นพนธ์ฟาร์ม - ${format(parseISO(sale.date), 'dd MMM yyyy')}`;
    const body = `เรียน คุณ ${sale.buyerName},\n\nสรุปรายการขายหมูขุน วันที่ ${format(parseISO(sale.date), 'dd MMM yyyy', { locale: th })}\nทะเบียนรถ: ${sale.vehicleReg || '-'}\n\nจำนวนหมู: ${sale.totalPigs} ตัว\nน้ำหนักสุทธิรวม: ${sale.totalNetWeight.toFixed(1)} กก.\nน้ำหนักเฉลี่ย: ${sale.averageWeight.toFixed(2)} กก./ตัว\nราคาขาย: ${sale.pricePerKg} บาท/กก.\n\nยอดรวม: ${sale.grossTotal.toLocaleString()} บาท\nหักค่าใช้จ่าย: ${sale.deductions.toLocaleString()} บาท\nยอดสุทธิ (NET TOTAL): ${sale.netTotal.toLocaleString()} บาท\n\nขอบคุณครับ\nนิพนธ์ฟาร์ม`;
    window.location.href = `mailto:${sale.buyerEmail || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const generatePDF = async () => {
    if (!selectedForPdf) return;
    
    showAlert('ระบบกำลังสั่งพิมพ์.. \n\n* หากหน้าต่างการพิมพ์ไม่ขึ้น กรุณากดปุ่ม "Open in new tab" (ไอคอนสี่เหลี่ยมมีลูกศรชี้ขึ้น) ที่มุมขวาบนสุดของจอก่อนพิมพ์ครับ', 'กำลังสั่งพิมพ์...');
    
    // Slight delay to ensure React renders the selectedForPdf state in DOM
    setTimeout(() => {
      window.print();
      
      // Cleanup after printing dialogue is shown
      setTimeout(() => {
        setSelectedForPdf(null); // Reset
      }, 500);
    }, 500);
  };

  // Trigger PDF gen when selectedForPdf is set
  useEffect(() => {
    if (selectedForPdf) {
      generatePDF();
    }
  }, [selectedForPdf]);

  const filteredSales = sales.filter(s => 
    s.buyerName.toLowerCase().includes(search.toLowerCase()) || 
    s.vehicleReg.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-in fade-in duration-300 pb-20">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-wide">ประวัติการขายหมูขุน</h2>
      </div>

      {/* Search */}
      <div className="relative group mb-6">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 via-[#00bcd4] to-blue-500 rounded-2xl opacity-0 group-focus-within:opacity-80 transition duration-1000 group-focus-within:duration-200 animate-search-glow blur-sm"></div>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-[#00bcd4]" />
          </div>
          <input 
            type="text" 
            placeholder="ค้นหาชื่อผู้ซื้อ หรือ ทะเบียนรถ..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white/90 dark:bg-[#0a2e36]/90 backdrop-blur-xl text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[#00bcd4] shadow-sm placeholder-slate-500 dark:placeholder-white/30 transition-all"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-[#00bcd4]/30 border-t-[#00bcd4] rounded-full animate-spin"></div></div>
      ) : filteredSales.length === 0 ? (
        <div className="text-center py-20 bg-slate-100 dark:bg-white/5 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-white/10 border-dashed text-slate-600 dark:text-white/50">ยังไม่มีรายการขาย</div>
      ) : (
        <div className="space-y-4">
          {filteredSales.map(sale => (
            <div key={sale.id} className="bg-white dark:bg-white/10 backdrop-blur-md rounded-3xl p-5 border border-slate-200 dark:border-white/20 shadow-xl dark:shadow-2xl relative overflow-hidden">
              <div className="flex justify-between items-start mb-3">
                <div className="flex flex-col gap-1">
                  <h3 className="font-bold text-xl text-slate-900 dark:text-white">{sale.buyerName}</h3>
                  <span className={`w-fit text-[10px] px-2 py-0.5 rounded-full font-bold ${sale.paymentStatus === 'PAID' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                    {sale.paymentStatus === 'PAID' ? 'จ่ายแล้ว' : 'ค้างชำระ'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 dark:text-white/40">
                  <button onClick={() => handleEmail(sale)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white rounded-lg transition-colors text-xs font-bold" title="ส่งอีเมล (Gmail)"><Mail className="w-4 h-4" /> ส่งเมล</button>
                  <button onClick={() => setSelectedForPdf(sale)} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00bcd4]/10 text-[#00bcd4] hover:bg-[#00bcd4] hover:text-white rounded-lg transition-colors text-xs font-bold" title="พิมพ์หรือเซฟ PDF"><Printer className="w-4 h-4" /> พิมพ์ / PDF</button>
                  <button onClick={() => handleDelete(sale.id!)} className="p-1.5 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors" title="ลบ"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              
              <p className="text-sm text-slate-600 dark:text-white/50 mb-3 ml-1">
                {(() => {
                  try { return format(parseISO(sale.date), 'dd MMM yyyy', { locale: th }); } 
                  catch { return sale.date; }
                })()} • ทะเบียน: {sale.vehicleReg || '-'}
              </p>

              <div className="grid grid-cols-3 gap-2 bg-[#061e24]/40 rounded-2xl p-3 mb-4 text-center border border-slate-100 dark:border-white/5">
                <div>
                  <p className="text-[11px] text-[#00bcd4] font-medium opacity-80">จำนวนตัว</p>
                  <p className="font-bold text-slate-900 dark:text-white text-lg mt-0.5">{sale.totalPigs}</p>
                </div>
                <div className="border-l border-slate-200 dark:border-white/10">
                  <p className="text-[11px] text-[#00bcd4] font-medium opacity-80">น้ำหนักรวม</p>
                  <p className="font-bold text-slate-900 dark:text-white text-lg mt-0.5">{sale.totalNetWeight.toFixed(1)} <span className="text-xs text-slate-600 dark:text-white/40">กก.</span></p>
                </div>
                <div className="border-l border-slate-200 dark:border-white/10">
                  <p className="text-[11px] text-[#00bcd4] font-medium opacity-80">เฉลี่ย</p>
                  <p className="font-bold text-slate-900 dark:text-white text-lg mt-0.5">{sale.averageWeight.toFixed(1)} <span className="text-xs text-slate-600 dark:text-white/40">กก.</span></p>
                </div>
              </div>

              <div className="flex justify-between items-end px-1 border-t border-slate-200 dark:border-white/10 pt-3">
                <p className="text-sm text-slate-600 dark:text-white/50 font-medium pb-1">ราคา: {sale.pricePerKg} บ./กก.</p>
                <div className="text-right">
                  <p className="text-[10px] text-[#00bcd4] font-medium mb-1 uppercase tracking-wider">ยอดสุทธิรวม</p>
                  <p className="font-bold text-[#00bcd4] text-2xl">฿{sale.netTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hidden area strictly formatted for PDF generation */}
      {selectedForPdf && (
        <div id="print-container" className="fixed inset-0 z-[9999] bg-white text-black p-10 overflow-auto print-only">
          <style>{`
            @media print {
              body * { visibility: hidden; }
              #print-container, #print-container * { visibility: visible; }
              #print-container { 
                position: absolute; 
                left: 0; 
                top: 0; 
                width: 100%; 
                margin: 0;
                padding: 20px;
                background: white !important;
                color: black !important;
              }
            }
            @media screen {
              .print-only { display: none; }
            }
          `}</style>
          
           <div id="receipt-pdf-template" style={{ width: '100%', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000000', paddingBottom: '16px', marginBottom: '32px' }}>
                <div>
                  <h1 style={{ fontSize: '32px', fontWeight: '900', margin: '0 0 4px 0', letterSpacing: '-0.5px' }}>นิพนธ์ฟาร์ม</h1>
                  <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '2px', margin: '0' }}>SALE RECEIPT / ใบสรุปการขายหมูขุน</p>
                  <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' }}>ระบบบันทึกการขายและคำนวณรายได้</p>
                </div>
                <div style={{ textAlign: 'right', fontSize: '14px' }}>
                   <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 'bold' }}>Sale ID:</span>
                      <span style={{ backgroundColor: '#e2e8f0', padding: '4px 12px', fontWeight: 'bold' }}>{selectedForPdf.saleId}</span>
                   </div>
                   <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 'bold' }}>Buyer Name:</span>
                      <span style={{ backgroundColor: '#e2e8f0', padding: '4px 12px', fontWeight: 'bold' }}>{selectedForPdf.buyerName}</span>
                   </div>
                   <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '16px' }}>
                      <span style={{ fontWeight: 'bold' }}>Date:</span>
                      <span>{selectedForPdf.date}</span>
                   </div>
                </div>
              </div>

              {/* Summary Cards */}
              <div style={{ display: 'flex', gap: '24px', marginBottom: '40px' }}>
                 <div style={{ flex: '1', border: '1px solid #e2e8f0', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', margin: '0 0 8px 0' }}>TOTAL WEIGHT / น้ำหนักรวม</p>
                    <p style={{ fontSize: '28px', fontWeight: '900', margin: '0' }}>{selectedForPdf.totalNetWeight.toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1})} <span style={{ fontSize: '16px', color: '#94a3b8' }}>KG.</span></p>
                 </div>
                 <div style={{ flex: '1', backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', margin: '0 0 8px 0' }}>AVERAGE WEIGHT / นน.เฉลี่ย</p>
                    <p style={{ fontSize: '28px', fontWeight: '900', margin: '0' }}>{selectedForPdf.averageWeight.toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1})} <span style={{ fontSize: '16px', color: '#94a3b8' }}>KG.</span></p>
                 </div>
                 <div style={{ flex: '1', backgroundColor: '#000000', color: '#ffffff', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', margin: '0 0 8px 0' }}>NET TOTAL / ยอดสุทธิ</p>
                    <p style={{ fontSize: '28px', fontWeight: '900', color: '#b4ff00', margin: '0' }}>{selectedForPdf.netTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} <span style={{ fontSize: '16px', color: '#94a3b8' }}>฿</span></p>
                 </div>
              </div>

              {/* Table Section */}
              <div style={{ marginBottom: '40px' }}>
                 <h2 style={{ fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '1px solid #000', paddingBottom: '8px', marginBottom: '16px' }}>WEIGHT DETAILS / รายละเอียดการชั่ง ( {selectedForPdf.totalPigs} ตัว )</h2>
                 <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                       <tr style={{ backgroundColor: '#1a1c23', color: '#ffffff' }}>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 'bold', width: '60px' }}>#</th>
                          <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 'bold' }}>น้ำหนักรวม (KG)</th>
                          <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 'bold' }}>น้ำหนักกรง (KG)</th>
                          <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 'bold' }}>น้ำหนักสุทธิ (KG)</th>
                       </tr>
                    </thead>
                    <tbody>
                        {[...selectedForPdf.records].sort((a: any, b: any) => a.index - b.index).map((r: any, idx: number) => (
                          <tr key={r.id} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                             <td style={{ padding: '12px 16px', color: '#64748b' }}>{r.index}</td>
                             <td style={{ padding: '12px 16px', textAlign: 'right', borderRight: '1px solid #e2e8f0' }}>{r.grossWeight.toFixed(2)}</td>
                             <td style={{ padding: '12px 16px', textAlign: 'right', borderRight: '1px solid #e2e8f0', color: '#ef4444' }}>- {r.tareWeight.toFixed(2)}</td>
                             <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 'bold', color: '#059669' }}>{r.netWeight.toFixed(2)}</td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>

              {/* Footer Detail */}
              <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', width: '100%' }}>
                  <div style={{ width: '45%' }}>
                     <h3 style={{ fontSize: '16px', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '1px solid #cbd5e1', paddingBottom: '8px', marginBottom: '16px' }}>INFO / ข้อมูลเพิ่มเติม</h3>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                         <span style={{ fontWeight: 'bold', color: '#64748b' }}>ประเภท:</span>
                         <span style={{ fontWeight: 'bold' }}>{selectedForPdf.saleType}</span>
                     </div>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                         <span style={{ fontWeight: 'bold', color: '#64748b' }}>สถานะการชำระเงิน:</span>
                         <span style={{ fontWeight: 'bold', color: selectedForPdf.paymentStatus === 'PAID' ? '#059669' : '#ef4444' }}>
                           {selectedForPdf.paymentStatus === 'PAID' ? 'ชำระเงินสดแล้ว' : 'ค้างชำระ'}
                         </span>
                     </div>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                         <span style={{ fontWeight: 'bold', color: '#64748b' }}>ทะเบียนรถ:</span>
                         <span style={{ fontWeight: 'bold' }}>{selectedForPdf.vehicleReg || '-'}</span>
                     </div>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                         <span style={{ fontWeight: 'bold', color: '#64748b' }}>ราคาต่อกิโลกรัม:</span>
                         <span style={{ fontWeight: 'bold' }}>{selectedForPdf.pricePerKg} ฿/KG</span>
                     </div>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                         <span style={{ fontWeight: 'bold', color: '#64748b' }}>ค่าใช้จ่ายหักออก:</span>
                         <span style={{ fontWeight: 'bold', color: '#ef4444' }}>- {selectedForPdf.deductions?.toLocaleString() || 0} ฿</span>
                     </div>
                  </div>

                  <div style={{ display: 'flex', gap: '32px', justifyContent: 'flex-end', width: 'auto' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', width: '180px' }}>
                         <div style={{ borderTop: '1px solid #000000', paddingTop: '16px', textAlign: 'center' }}>
                             {selectedForPdf.signature ? (
                                 <img src={selectedForPdf.signature} alt="Signature" style={{ height: '40px', objectFit: 'contain', marginBottom: '8px' }} />
                             ) : (
                                 <div style={{ height: '48px' }}></div>
                             )}
                             <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#64748b', margin: '0' }}>ผู้ซื้อ / รับหมู</p>
                         </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', width: '180px' }}>
                         <div style={{ borderTop: '1px solid #000000', paddingTop: '16px', textAlign: 'center' }}>
                             <div style={{ height: '48px' }}></div>
                             <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#64748b', margin: '0' }}>ฟาร์ม / ผู้ขาย</p>
                         </div>
                      </div>
                  </div>
              </div>

              <div style={{ marginTop: '80px', textAlign: 'center', fontSize: '12px', fontWeight: 'bold', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '2px' }}>
                 GENERATED BY NIPHON FARM SYSTEM © {new Date().getFullYear()}
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
