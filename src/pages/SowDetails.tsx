import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MoreVertical, CheckCircle2, AlertCircle, Activity, HeartPulse, Trash2, Calendar as CalendarIcon, Beaker, Heart, Hourglass, Baby, ShieldAlert } from 'lucide-react';
import { subscribeToSow, subscribeToSowEvents, subscribeToSowTasks, recordEvent } from '../services/sowService';
import { Sow, SowEvent, Task, EventType, SowStatus } from '../types';
import EventModals from '../components/EventModals';
import { useBottomSheet } from '../contexts/BottomSheetContext';
import clsx from 'clsx';
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';

import { useAuth } from '../contexts/AuthContext';

export default function SowDetails() {
  const { userProfile } = useAuth();
  const { showAlert, showConfirm } = useBottomSheet();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [sow, setSow] = useState<Sow | null>(null);
  const [events, setEvents] = useState<SowEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<'TASKS' | 'HISTORY'>('TASKS');
  const [showMenu, setShowMenu] = useState(false);
  
  const [modalType, setModalType] = useState<EventType | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | undefined>();

  useEffect(() => {
    if (!id) return;
    
    const unsubSow = subscribeToSow(id, (data) => {
      setSow(data);
      setLoading(false);
    });
    const unsubEvents = subscribeToSowEvents(id, setEvents);
    const unsubTasks = subscribeToSowTasks(id, setTasks);
    
    return () => {
      unsubSow();
      unsubEvents();
      unsubTasks();
    };
  }, [id]);

  if (loading) {
    return <div className="flex justify-center items-center py-20"><div className="w-10 h-10 border-4 border-[#00bcd4]/30 border-t-[#00bcd4] rounded-full animate-spin"></div></div>;
  }

  if (!sow) {
    return <div className="text-center py-20 text-slate-600 dark:text-white/50 text-lg">ไม่พบข้อมูลแม่หมู</div>;
  }

  const handleEventSubmit = async (type: EventType, date: string, details: any) => {
    try {
      await recordEvent(sow, type, date, details, selectedTaskId, userProfile?.displayName);
      setModalType(null);
      setSelectedTaskId(undefined);
      if (type === 'CULL') {
        navigate('/sows', { replace: true });
      }
    } catch (error) {
      console.error("Error in handleEventSubmit:", error);
      showAlert('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const pendingTasks = tasks.filter(t => t.status === 'PENDING');
  
  // Group events by parity
  const eventsByParity = events.reduce((acc, event) => {
    if (!acc[event.parity]) acc[event.parity] = [];
    acc[event.parity].push(event);
    return acc;
  }, {} as Record<number, SowEvent[]>);

  const getStatusColor = (status: SowStatus) => {
    switch (status) {
      case 'IDLE': return 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
      case 'MATED': return 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30';
      case 'PREGNANT': return 'bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30';
      case 'LACTATING': return 'bg-pink-500/20 text-pink-700 dark:text-pink-300 border-pink-500/30';
      case 'RECOVERY': return 'bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30';
      case 'CULLED': return 'bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-500/30';
      default: return 'bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white border-slate-200 dark:border-white/20';
    }
  };

  const getStatusIcon = (status: SowStatus) => {
    switch (status) {
      case 'IDLE': return <Activity className="w-3.5 h-3.5 mr-1.5 inline-block" />;
      case 'MATED': return <Heart className="w-3.5 h-3.5 mr-1.5 inline-block" />;
      case 'PREGNANT': return <Hourglass className="w-3.5 h-3.5 mr-1.5 inline-block" />;
      case 'LACTATING': return <Baby className="w-3.5 h-3.5 mr-1.5 inline-block" />;
      case 'RECOVERY': return <ShieldAlert className="w-3.5 h-3.5 mr-1.5 inline-block" />;
      default: return null;
    }
  };

  const getStatusLabel = (status: SowStatus) => {
    switch (status) {
      case 'IDLE': return 'ว่าง (พร้อมผสม)';
      case 'MATED': return 'ผสมแล้ว';
      case 'PREGNANT': return 'อุ้มท้อง';
      case 'LACTATING': return 'เลี้ยงลูก';
      case 'RECOVERY': return 'พักฟื้น';
      case 'CULLED': return 'คัดทิ้ง';
      default: return status;
    }
  };

  const getEventLabel = (type: EventType) => {
    switch (type) {
      case 'BREED': return 'ผสมพันธุ์';
      case 'ULTRASOUND': return 'ตรวจสัด/อัลตราซาวด์';
      case 'FARROW': return 'คลอด';
      case 'WEAN': return 'หย่านม';
      case 'HEALTH': return 'สุขภาพ';
      case 'CULL': return 'คัดทิ้ง';
      case 'HEAT_RETURN': return 'กลับสัด';
      default: return type;
    }
  };

  const getTaskLabel = (type: string) => {
    switch (type) {
      case 'BREED': return 'กำหนดผสมพันธุ์';
      case 'HEAT_CHECK': return 'ตรวจกลับสัด';
      case 'ULTRASOUND': return 'อัลตราซาวด์';
      case 'MOVE_TO_FARROW': return 'ย้ายเข้าเล้าคลอด';
      case 'FARROW': return 'กำหนดคลอด';
      case 'WEAN': return 'กำหนดหย่านม';
      default: return type;
    }
  };

  const getTaskActionType = (taskType: string): EventType => {
    switch (taskType) {
      case 'BREED': return 'BREED';
      case 'HEAT_CHECK': return 'ULTRASOUND'; 
      case 'ULTRASOUND': return 'ULTRASOUND';
      case 'MOVE_TO_FARROW': return 'HEALTH'; 
      case 'FARROW': return 'FARROW';
      case 'WEAN': return 'WEAN';
      default: return 'HEALTH';
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 relative">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/sows')} className="p-3 bg-white dark:bg-white/10 backdrop-blur-md rounded-full shadow-xl dark:shadow-2xl border border-slate-200 dark:border-white/20 text-slate-900 dark:text-white active:scale-95 transition-transform">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-wide">{sow.sowId}</h2>
        </div>
        
        <button onClick={() => setShowMenu(!showMenu)} className="p-3 bg-white dark:bg-white/10 backdrop-blur-md rounded-full shadow-xl dark:shadow-2xl border border-slate-200 dark:border-white/20 text-slate-900 dark:text-white active:scale-95 transition-transform">
          <MoreVertical className="w-6 h-6" />
        </button>

        {/* 3-dot Menu Dropdown */}
        {showMenu && (
          <div className="absolute top-16 right-0 w-56 bg-white/95 dark:bg-[#0a2e36]/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-white/20 overflow-hidden z-30 animate-in fade-in zoom-in-95 duration-200">
            <button onClick={() => { setModalType('HEALTH'); setShowMenu(false); }} className="w-full text-left px-5 py-4 text-base text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 flex items-center gap-3 transition-colors">
              <HeartPulse className="w-5 h-5 text-[#00bcd4]" /> บันทึกสุขภาพ/วัคซีน
            </button>
            {sow.type !== 'BOAR' && (
              <button onClick={() => { setModalType('HEAT_RETURN'); setShowMenu(false); }} className="w-full text-left px-5 py-4 text-base text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 flex items-center gap-3 transition-colors">
                <Activity className="w-5 h-5 text-orange-400" /> แจ้งกลับสัด
              </button>
            )}
            <div className="h-px bg-white dark:bg-white/10"></div>
            <button onClick={() => { setModalType('CULL'); setShowMenu(false); }} className="w-full text-left px-5 py-4 text-base text-red-400 hover:bg-red-500/20 flex items-center gap-3 transition-colors">
              <Trash2 className="w-5 h-5" /> คัดทิ้ง (Cull)
            </button>
          </div>
        )}
      </div>

      {/* Sow Info Card */}
      <div className="bg-white dark:bg-white/10 backdrop-blur-md rounded-3xl p-6 shadow-2xl dark:shadow-xl border border-slate-200 dark:border-white/20 mb-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-sm text-slate-600 dark:text-white/60 mb-1 font-medium tracking-wide">สายพันธุ์</p>
            <p className="font-bold text-slate-900 dark:text-white text-xl">{sow.breed}</p>
          </div>
          <div className="text-right">
            <span className={clsx("px-4 py-1.5 rounded-lg text-xs font-bold tracking-wider border inline-flex items-center", getStatusColor(sow.status))}>
              {getStatusIcon(sow.status)}
              {getStatusLabel(sow.status)}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-200 dark:border-white/10">
          <div>
            {sow.type !== 'BOAR' ? (
              <>
                <p className="text-sm text-slate-600 dark:text-white/60 mb-1 font-medium tracking-wide">รอบการผลิต (Parity)</p>
                <p className="font-bold text-slate-900 dark:text-white text-2xl">{sow.parity}</p>
                {sow.parity >= 7 && <p className="text-xs text-red-400 mt-2 flex items-center gap-1.5 font-medium"><AlertCircle className="w-4 h-4"/> แนะนำให้คัดทิ้ง</p>}
              </>
            ) : (
              <>
                <p className="text-sm text-slate-600 dark:text-white/60 mb-1 font-medium tracking-wide">ประเภท</p>
                <p className="font-bold text-orange-400 text-xl flex items-center gap-2">♂ พ่อพันธุ์</p>
              </>
            )}
          </div>
          <div>
            <p className="text-sm text-slate-600 dark:text-white/60 mb-1 font-medium tracking-wide">วันที่เข้าฝูง</p>
            <p className="font-bold text-slate-900 dark:text-white text-lg">{sow.entryDate}</p>
          </div>
        </div>
      </div>

      {/* Action Buttons (Main) */}
      {(sow.status === 'IDLE' || sow.status === 'RECOVERY') && sow.type !== 'BOAR' && (
        <button onClick={() => setModalType('BREED')} className="w-full bg-[#00bcd4] text-slate-900 dark:text-white font-bold p-4 rounded-2xl shadow-[0_0_20px_rgba(0,188,212,0.3)] hover:bg-cyan-400 active:scale-95 transition-all mb-8 flex justify-center items-center gap-3 text-lg border border-slate-200 dark:border-white/20">
          <div className="p-1.5 bg-slate-100 dark:bg-white/20 rounded-lg">
            <Beaker className="w-6 h-6" />
          </div>
          บันทึกผสมพันธุ์
        </button>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-white/10 mb-6">
        <button 
          onClick={() => setActiveTab('TASKS')}
          className={clsx("flex-1 py-4 text-base font-bold border-b-2 transition-all", activeTab === 'TASKS' ? "border-[#00bcd4] text-[#00bcd4]" : "border-transparent text-slate-600 dark:text-white/50 ")}
        >
          กำหนดการ ({pendingTasks.length})
        </button>
        <button 
          onClick={() => setActiveTab('HISTORY')}
          className={clsx("flex-1 py-4 text-base font-bold border-b-2 transition-all", activeTab === 'HISTORY' ? "border-[#00bcd4] text-[#00bcd4]" : "border-transparent text-slate-600 dark:text-white/50 ")}
        >
          ประวัติ
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'TASKS' && (
        <div className="space-y-4">
          {pendingTasks.length === 0 ? (
            <div className="text-center py-12 text-slate-600 dark:text-white/50 bg-slate-100 dark:bg-white/5 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-white/10 border-dashed shadow-xl dark:shadow-2xl text-lg">ไม่มีกำหนดการในขณะนี้</div>
          ) : (
            pendingTasks.map(task => {
              let formattedDate = task.dueDate;
              try {
                formattedDate = format(parseISO(task.dueDate), 'dd MMM yyyy', { locale: th });
              } catch (e) {}
              
              return (
              <div key={task.id} className="bg-white dark:bg-white/10 backdrop-blur-md p-5 rounded-2xl shadow-xl dark:shadow-2xl border border-slate-200 dark:border-white/20 flex justify-between items-center">
                <div>
                  <p className="font-bold text-slate-900 dark:text-white text-lg">{getTaskLabel(task.type)}</p>
                  <p className="text-sm text-[#00bcd4] flex items-center gap-2 mt-1.5 font-medium">
                    <CalendarIcon className="w-4 h-4" /> {formattedDate}
                  </p>
                </div>
                <button 
                  onClick={() => {
                    if (task.type === 'MOVE_TO_FARROW') {
                      showConfirm('ยืนยันการย้ายเข้าเล้าคลอด?', () => {
                        recordEvent(sow, 'HEALTH', new Date().toISOString().split('T')[0], { type: 'GENERAL', notes: 'ย้ายเข้าเล้าคลอด' }, task.id, userProfile?.displayName);
                      });
                    } else if (task.type === 'HEAT_CHECK') {
                      showConfirm(
                        'พบการกลับสัดหรือไม่?\n\n- กด "ตกลง" หากพบว่ากลับสัด (ไม่ท้อง)\n- กด "ยกเลิก" หากไม่พบการกลับสัด (รอยืนยันท้อง)',
                        () => {
                          setModalType('HEAT_RETURN');
                          setSelectedTaskId(task.id);
                        },
                        "แจ้งกลับสัด",
                        () => {
                          recordEvent(sow, 'HEALTH', new Date().toISOString().split('T')[0], { type: 'GENERAL', notes: 'ตรวจสัด: ไม่พบการกลับสัด' }, task.id, userProfile?.displayName);
                        }
                      );
                    } else {
                      setSelectedTaskId(task.id);
                      setModalType(getTaskActionType(task.type));
                    }
                  }}
                  className="px-5 py-2.5 bg-[#00bcd4]/20 text-[#00bcd4] border border-[#00bcd4]/30 rounded-xl text-sm font-bold hover:bg-[#00bcd4]/30 transition-colors active:scale-95"
                >
                  บันทึก
                </button>
              </div>
            );
            })
          )}
        </div>
      )}

      {activeTab === 'HISTORY' && (
        <div className="space-y-8">
          {Object.keys(eventsByParity).sort((a,b) => Number(b) - Number(a)).map(parity => (
            <div key={parity} className="relative pl-6 border-l-2 border-slate-200 dark:border-white/20 ml-2">
              <div className="absolute -left-[11px] top-0 w-5 h-5 rounded-full bg-white dark:bg-[#0a2e36] border-4 border-[#00bcd4]"></div>
              <h3 className="text-base font-bold text-[#00bcd4] mb-4 uppercase tracking-wider">รอบการผลิตที่ {parity}</h3>
              <div className="space-y-4">
                {eventsByParity[Number(parity)].map(event => (
                  <div key={event.id} className="bg-white dark:bg-white/10 backdrop-blur-md p-5 rounded-2xl shadow-xl dark:shadow-2xl border border-slate-200 dark:border-white/20">
                    <div className="flex justify-between items-start mb-3">
                      <p className="font-bold text-slate-900 dark:text-white flex items-center gap-2.5 text-lg">
                        <CheckCircle2 className="w-5 h-5 text-[#00bcd4]" />
                        {getEventLabel(event.type)}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-white/50 font-medium bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-md">
                        {(() => {
                          try {
                            return format(parseISO(event.date), 'dd MMM yyyy', { locale: th });
                          } catch {
                            return event.date;
                          }
                        })()}
                      </p>
                    </div>
                    <div className="text-sm text-slate-700 dark:text-white/80 bg-slate-100 dark:bg-white/5 p-4 rounded-xl border border-slate-100 dark:border-white/5 leading-relaxed">
                      {event.type === 'BREED' && <p>วิธี: <span className="font-semibold text-slate-900 dark:text-white">{event.details.method === 'NATURAL' ? 'ผสมจริง' : 'ผสมเทียม'}</span> | พ่อพันธุ์/น้ำเชื้อ: <span className="font-semibold text-slate-900 dark:text-white">{event.details.boarId || event.details.semenId}</span></p>}
                      {event.type === 'ULTRASOUND' && <p>ผล: <span className="font-semibold text-slate-900 dark:text-white">{event.details.result}</span></p>}
                      {event.type === 'FARROW' && <p>รอด: <span className="font-semibold text-slate-900 dark:text-white">{event.details.liveBorn}</span> | ตายโคม: <span className="font-semibold text-slate-900 dark:text-white">{event.details.stillborn}</span> | มัมมี่: <span className="font-semibold text-slate-900 dark:text-white">{event.details.mummy}</span> | นน.เฉลี่ย: <span className="font-semibold text-slate-900 dark:text-white">{event.details.avgWeight}กก.</span></p>}
                      {event.type === 'WEAN' && <p>หย่านม: <span className="font-semibold text-slate-900 dark:text-white">{event.details.weanedCount} ตัว</span> | นน.รวม: <span className="font-semibold text-slate-900 dark:text-white">{event.details.totalWeight}กก.</span></p>}
                      {event.type === 'HEALTH' && <p>ประเภท: <span className="font-semibold text-slate-900 dark:text-white">{event.details.type}</span> | หมายเหตุ: <span className="font-semibold text-slate-900 dark:text-white">{event.details.notes}</span></p>}
                      {(event.type === 'CULL' || event.type === 'HEAT_RETURN') && <p>หมายเหตุ: <span className="font-semibold text-slate-900 dark:text-white">{event.details.notes || event.details.reason}</span></p>}
                      {event.recordedBy && <p className="mt-2 pt-2 border-t border-slate-200 dark:border-white/10 text-xs text-[#00bcd4]">ผู้บันทึก: {event.recordedBy}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {events.length === 0 && <div className="text-center py-12 text-slate-600 dark:text-white/50 text-lg">ยังไม่มีประวัติกิจกรรม</div>}
        </div>
      )}

      <EventModals 
        isOpen={modalType !== null} 
        type={modalType} 
        onClose={() => { setModalType(null); setSelectedTaskId(undefined); }} 
        onSubmit={handleEventSubmit} 
      />
    </div>
  );
}
