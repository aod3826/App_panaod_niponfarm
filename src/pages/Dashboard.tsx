import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, AlertCircle, CalendarClock, ChevronRight, Activity, Baby, Info, MessageCircle, Heart, Stethoscope, Truck, Syringe, CalendarDays, GripVertical, Settings2, Save, Eye, EyeOff } from 'lucide-react';
import { subscribeToSows, subscribeToAllPendingTasks } from '../services/sowService';
import { Sow, Task } from '../types';
import { isToday, isPast, parseISO, isBefore, startOfToday, format, isTomorrow } from 'date-fns';
import { th } from 'date-fns/locale';
import clsx from 'clsx';
import { motion } from 'motion/react';
import ChatOverlay from '../components/chat/ChatOverlay';
import { useAuth } from '../contexts/AuthContext';
import realFarmBg from '../assets/images/real-farm-bg.png';
import pregnantCardBg from '../assets/images/pregnant-card-bg.png';
import nursingCardBg from '../assets/images/nursing-card-bg.png';
import matedCardBg from '../assets/images/mated-card-bg.png';
import emptyCardBg from '../assets/images/empty-card-bg.png';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface WidgetState {
  id: string;
  label: string;
  isVisible: boolean;
}

const defaultWidgets: WidgetState[] = [
  { id: 'stats', label: 'ภาพรวมฟาร์ม (สถิติ)', isVisible: true },
  { id: 'overdue', label: 'งานเลยกำหนด', isVisible: true },
  { id: 'today', label: 'งานด่วนวันนี้', isVisible: true },
  { id: 'tomorrow', label: 'งานวันพรุ่งนี้', isVisible: true },
  { id: 'upcoming', label: 'งานสัปดาห์นี้', isVisible: true },
];

const SortableWidgetItem = ({ id, label, isVisible, toggleVisibility }: { id: string, label: string, isVisible: boolean, toggleVisibility: (id: string) => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={clsx("flex justify-between items-center p-4 mb-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm transition-opacity", isDragging ? 'opacity-50 ring-2 ring-emerald-500' : 'opacity-100')}>
      <div className="flex items-center gap-4">
        <div {...attributes} {...listeners} className="p-2 cursor-grab hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 active:cursor-grabbing">
           <GripVertical className="w-5 h-5"/>
        </div>
        <span className={clsx("font-bold", isVisible ? "text-slate-800 dark:text-slate-200" : "text-slate-400 dark:text-slate-500 line-through decoration-slate-300 dark:decoration-slate-600")}>{label}</span>
      </div>
      <button 
        onClick={() => toggleVisibility(id)} 
        className={clsx("p-2.5 rounded-xl transition-all font-bold text-sm flex items-center gap-2", isVisible ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20" : "text-slate-500 bg-slate-100 dark:bg-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600")}
      >
        {isVisible ? <><Eye className="w-4 h-4"/> แสดงอยู่</> : <><EyeOff className="w-4 h-4"/> ซ่อนไว้</>}
      </button>
    </div>
  );
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [sows, setSows] = useState<Sow[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMSG, setErrorMSG] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [widgets, setWidgets] = useState<WidgetState[]>(() => {
    const saved = localStorage.getItem('dashboard_widgets_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === defaultWidgets.length) {
           return parsed;
        }
      } catch (e) {
        console.error('Failed to parse dashboard_widgets_v1', e);
      }
    }
    return defaultWidgets;
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setWidgets((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        localStorage.setItem('dashboard_widgets_v1', JSON.stringify(newItems));
        return newItems;
      });
    }
  };

  const toggleVisibility = (id: string) => {
     setWidgets(items => {
       const newItems = items.map(w => w.id === id ? { ...w, isVisible: !w.isVisible } : w);
       localStorage.setItem('dashboard_widgets_v1', JSON.stringify(newItems));
       return newItems;
     });
  };

  useEffect(() => {
    if (!userProfile || userProfile.role === 'PENDING' || userProfile.role === 'RESIGNED') {
      return;
    }

    const unsubSows = subscribeToSows(
      (data) => setSows(data),
      (err) => {
        console.error("Sow error:", err);
        setErrorMSG(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล Firestore');
        setLoading(false);
      }
    );
    const unsubTasks = subscribeToAllPendingTasks(
      (data) => {
        setTasks(data);
        setLoading(false);
      },
      (err) => {
        console.error("Task error:", err);
        setErrorMSG(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล Firestore');
        setLoading(false);
      }
    );

    return () => {
      unsubSows();
      unsubTasks();
    };
  }, []);

  if (errorMSG) {
    return (
      <div className="flex flex-col justify-center items-center py-20 px-4 text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">ไม่สามารถโหลดข้อมูลได้</h2>
        <p className="text-red-300 font-medium whitespace-pre-wrap">{errorMSG}</p>
        <p className="text-slate-600 dark:text-white/60 text-sm mt-4">
          โปรดตรวจสอบให้แน่ใจว่าคุณได้สร้าง <b>"Firestore Database"</b> ในโปรเจกต์ Firebase ของคุณแล้ว
        </p>
      </div>
    );
  }

  if (loading) {
    return <div className="flex justify-center items-center py-20"><div className="w-10 h-10 border-4 border-[#00bcd4]/30 border-t-[#00bcd4] rounded-full animate-spin"></div></div>;
  }

  // Calculate Stats
  const stats = {
    total: sows.length,
    idle: sows.filter(s => s.status === 'IDLE').length,
    mated: sows.filter(s => s.status === 'MATED').length,
    pregnant: sows.filter(s => s.status === 'PREGNANT').length,
    lactating: sows.filter(s => s.status === 'LACTATING').length,
    recovery: sows.filter(s => s.status === 'RECOVERY').length,
  };

  // Group Tasks
  const today = startOfToday();
  const validTasks = tasks.filter(t => {
    try {
      const d = parseISO(t.dueDate);
      return !isNaN(d.getTime());
    } catch {
      return false;
    }
  });
  
  const overdueTasks = validTasks.filter(t => isBefore(parseISO(t.dueDate), today));
  const todayTasks = validTasks.filter(t => isToday(parseISO(t.dueDate)));
  const tomorrowTasks = validTasks.filter(t => isTomorrow(parseISO(t.dueDate)));
  const upcomingTasks = validTasks.filter(t => !isBefore(parseISO(t.dueDate), today) && !isToday(parseISO(t.dueDate)) && !isTomorrow(parseISO(t.dueDate))).slice(0, 5); // Show only next 5

  const getTaskIcon = (type: string, isOverdue: boolean) => {
    const className = "w-6 h-6";
    switch (type) {
      case 'BREED': return <Heart className={className} />;
      case 'HEAT_CHECK': 
      case 'BACK_TO_HEAT': return <Activity className={className} />;
      case 'ULTRASOUND': return <Stethoscope className={className} />;
      case 'MOVE_TO_FARROW': return <Truck className={className} />;
      case 'FARROW': 
      case 'WEAN': return <Baby className={className} />;
      case 'VACCINE': return <Syringe className={className} />;
      default: return isOverdue ? <AlertCircle className={className} /> : <CalendarClock className={className} />;
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

  const TaskCard: React.FC<{ task: Task, isOverdue?: boolean, isTodayOrTomorrow?: boolean }> = ({ task, isOverdue = false, isTodayOrTomorrow = false }) => {
    let formattedDate = task.dueDate;
    try {
      formattedDate = format(parseISO(task.dueDate), 'dd MMM yyyy', { locale: th });
    } catch (e) {
      // fallback
    }

    let colorClass = isOverdue ? "bg-red-50 text-red-600 border-red-200 dark:bg-white/10 dark:text-red-400 dark:border-red-500/30" : 
                     isTodayOrTomorrow ? "bg-blue-50 text-blue-600 border-blue-200 dark:bg-white/10 dark:text-blue-400 dark:border-blue-500/30" : 
                     "bg-white text-slate-800 border-slate-200 dark:bg-white/5 dark:text-white dark:border-white/20";
    
    let iconBgClass = isOverdue ? "bg-red-500/20 text-red-600 dark:text-red-400" : 
                      isTodayOrTomorrow ? "bg-blue-500/20 text-blue-600 dark:text-blue-400" : 
                      "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300";
    
    return (
      <div 
        onClick={() => navigate(`/sows/${task.sowId}`)}
        className={clsx("backdrop-blur-md border p-4 rounded-2xl shadow-sm flex justify-between items-center cursor-pointer active:scale-[0.98] transition-transform", colorClass)}
      >
        <div className="flex items-start gap-4">
          <div className={clsx("p-3 rounded-xl", iconBgClass)}>
            {getTaskIcon(task.type, isOverdue)}
          </div>
          <div>
            <p className={clsx("text-lg font-bold", isOverdue ? "text-red-700 dark:text-red-300" : isTodayOrTomorrow ? "text-blue-800 dark:text-blue-300" : "text-slate-900 dark:text-white")}>{getTaskLabel(task.type)}</p>
            <p className="text-sm opacity-80 font-medium mt-0.5">แม่หมูเบอร์: <span className="font-bold">{task.sowDisplayId}</span></p>
            <p className="text-sm mt-1 opacity-90 font-semibold">
              กำหนด: {formattedDate}
            </p>
          </div>
        </div>
        <ChevronRight className="w-6 h-6 opacity-40" />
      </div>
    );
  };

  const renderWidget = (id: string, index: number) => {
    switch(id) {
      case 'stats':
        return (
          <div key="stats" className="mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${index * 50}ms` }}>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">ภาพรวมฟาร์ม</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="relative p-4 rounded-[2rem] shadow-sm col-span-2 overflow-hidden group min-h-[180px] flex flex-col justify-end border border-emerald-100 dark:border-white/10">
                <div 
                  className="absolute inset-0 z-0 transition-transform duration-700 group-hover:scale-105"
                  style={{ backgroundImage: `url(${realFarmBg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                />
                <div className="relative z-10 bg-white/90 dark:bg-[#1a2f3a]/90 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-white/50 dark:border-white/10 flex justify-between items-center w-full">
                  <div>
                    <p className="text-sm text-emerald-700 dark:text-emerald-400 font-bold mb-1 flex items-center gap-1 drop-shadow-sm"><ClipboardList className="w-4 h-4"/> แม่หมูทั้งหมดในฝูง</p>
                    <p className="text-4xl font-black text-slate-900 dark:text-white drop-shadow-sm tracking-tighter leading-none mt-2">{stats.total} <span className="text-xl font-bold text-slate-500 dark:text-slate-400">ตัว</span></p>
                  </div>
                </div>
              </div>
              <div className="relative p-4 rounded-3xl shadow-sm col-span-1 overflow-hidden group min-h-[140px] flex flex-col justify-end border border-blue-100 dark:border-white/10">
                <div 
                  className="absolute inset-0 z-0 transition-transform duration-500 group-hover:scale-110"
                  style={{ backgroundImage: `url(${pregnantCardBg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                />
                <div className="relative z-10 bg-white/90 dark:bg-[#1a2f3a]/90 backdrop-blur-sm p-3 rounded-2xl w-fit shadow-lg border border-white/50 dark:border-white/10">
                  <p className="text-sm text-blue-700 dark:text-blue-400 font-bold mb-1 flex items-center gap-1 drop-shadow-sm"><Baby className="w-4 h-4"/>อุ้มท้อง</p>
                  <p className="text-3xl font-black text-slate-900 dark:text-white drop-shadow-sm leading-none">{stats.pregnant}</p>
                </div>
              </div>
              <div className="relative p-4 rounded-3xl shadow-sm col-span-1 overflow-hidden group min-h-[140px] flex flex-col justify-end border border-pink-100 dark:border-white/10">
                <div 
                  className="absolute inset-0 z-0 transition-transform duration-500 group-hover:scale-110"
                  style={{ backgroundImage: `url(${nursingCardBg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                />
                <div className="relative z-10 bg-white/90 dark:bg-[#1a2f3a]/90 backdrop-blur-sm p-3 rounded-2xl w-fit shadow-lg border border-white/50 dark:border-white/10">
                  <p className="text-sm text-pink-700 dark:text-pink-400 font-bold mb-1 flex items-center gap-1 drop-shadow-sm"><Baby className="w-4 h-4"/>เลี้ยงลูก</p>
                  <p className="text-3xl font-black text-slate-900 dark:text-white drop-shadow-sm leading-none">{stats.lactating}</p>
                </div>
              </div>
              <div className="relative p-4 rounded-3xl shadow-sm col-span-1 overflow-hidden group min-h-[140px] flex flex-col justify-end border border-purple-100 dark:border-white/10">
                <div 
                  className="absolute inset-0 z-0 transition-transform duration-500 group-hover:scale-110"
                  style={{ backgroundImage: `url(${matedCardBg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                />
                <div className="relative z-10 bg-white/90 dark:bg-[#1a2f3a]/90 backdrop-blur-sm p-3 rounded-2xl w-fit shadow-lg border border-white/50 dark:border-white/10">
                  <p className="text-sm text-purple-700 dark:text-purple-400 font-bold mb-1 flex items-center gap-1 drop-shadow-sm"><Heart className="w-4 h-4"/>ผสมแล้ว</p>
                  <p className="text-3xl font-black text-slate-900 dark:text-white drop-shadow-sm leading-none">{stats.mated}</p>
                </div>
              </div>
              <div className="relative p-4 rounded-3xl shadow-sm col-span-1 overflow-hidden group min-h-[140px] flex flex-col justify-end border border-slate-100 dark:border-white/10">
                <div 
                  className="absolute inset-0 z-0 transition-transform duration-500 group-hover:scale-110"
                  style={{ backgroundImage: `url(${emptyCardBg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                />
                <div className="relative z-10 bg-white/90 dark:bg-[#1a2f3a]/90 backdrop-blur-sm p-3 rounded-2xl w-fit shadow-lg border border-white/50 dark:border-white/10">
                  <p className="text-sm text-slate-700 dark:text-slate-400 font-bold mb-1 flex items-center gap-1 drop-shadow-sm"><Activity className="w-4 h-4"/>ว่าง/พัก</p>
                  <p className="text-3xl font-black text-slate-900 dark:text-white drop-shadow-sm leading-none">{stats.idle + stats.recovery}</p>
                </div>
              </div>
            </div>
          </div>
        );
      case 'overdue':
        if (overdueTasks.length === 0) return null;
        return (
          <section key="overdue" className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${index * 50}ms` }}>
            <h3 className="text-base font-bold text-red-400 mb-4 flex items-center gap-2 tracking-wide">
              <AlertCircle className="w-5 h-5" /> เลยกำหนด ({overdueTasks.length})
            </h3>
            <div className="space-y-4">
              {overdueTasks.map(task => <TaskCard key={task.id} task={task} isOverdue={true} />)}
            </div>
          </section>
        );
      case 'today':
        return (
          <section key="today" className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${index * 50}ms` }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-100 dark:bg-blue-900/40 p-2 rounded-lg text-blue-600 dark:text-blue-400">
                <Activity className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-wide">
                งานด่วนวันนี้ ({todayTasks.length})
              </h3>
            </div>
            {todayTasks.length > 0 ? (
              <div className="space-y-4">
                {todayTasks.map(task => <TaskCard key={task.id} task={task} isTodayOrTomorrow={true} />)}
              </div>
            ) : (
              <div className="bg-slate-50 dark:bg-[#1a2f3a] p-8 rounded-3xl border border-slate-200 dark:border-white/10 border-dashed text-center shadow-sm">
                <p className="text-slate-500 dark:text-white/60 font-medium text-lg">ไม่มีงานสำหรับวันนี้ 🎉</p>
              </div>
            )}
          </section>
        );
      case 'tomorrow':
        if (tomorrowTasks.length === 0) return null;
        return (
          <section key="tomorrow" className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${index * 50}ms` }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-indigo-100 dark:bg-indigo-900/40 p-2 rounded-lg text-indigo-600 dark:text-indigo-400">
                <CalendarDays className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-wide">
                พรุ่งนี้ ({tomorrowTasks.length})
              </h3>
            </div>
            <div className="space-y-4">
              {tomorrowTasks.map(task => <TaskCard key={task.id} task={task} isTodayOrTomorrow={true} />)}
            </div>
          </section>
        );
      case 'upcoming':
        if (upcomingTasks.length === 0) return null;
        return (
          <section key="upcoming" className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${index * 50}ms` }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-slate-100 dark:bg-white/10 p-2 rounded-lg text-slate-600 dark:text-white/60">
                <CalendarClock className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-black text-slate-700 dark:text-white/80 tracking-wide">
                สัปดาห์นี้
              </h3>
            </div>
            <div className="space-y-4">
              {upcomingTasks.map(task => <TaskCard key={task.id} task={task} />)}
            </div>
          </section>
        );
      default: return null;
    }
  };

  return (
    <div className="animate-in fade-in duration-300 pb-10">
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-black text-slate-900 dark:text-white">หน้าหลัก</h1>
        <button 
          onClick={() => setEditMode(!editMode)}
          className={clsx("flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all text-sm", editMode ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5")}
        >
          {editMode ? <><Save className="w-4 h-4"/> บันทึก</> : <><Settings2 className="w-4 h-4"/> ปรับแต่ง</>}
        </button>
      </div>

      {editMode ? (
        <div className="bg-slate-50 dark:bg-black/20 p-6 rounded-3xl border border-slate-200 dark:border-white/10 mb-8 animate-in zoom-in-95 duration-200">
          <div className="mb-6">
            <h3 className="text-xl font-black text-slate-800 dark:text-white">ตั้งค่าหน้าแดชบอร์ด</h3>
            <p className="text-slate-500 dark:text-white/50 text-sm mt-1">ลากเพื่อสลับตำแหน่ง หรือกดไอคอนดวงตาเพื่อซ่อน/แสดงวิดเจ็ต</p>
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
             <SortableContext items={widgets.map(w => w.id)} strategy={verticalListSortingStrategy}>
               {widgets.map(w => (
                  <SortableWidgetItem key={w.id} id={w.id} label={w.label} isVisible={w.isVisible} toggleVisibility={toggleVisibility} />
               ))}
             </SortableContext>
          </DndContext>
        </div>
      ) : (
        <div className="space-y-2">
          {widgets.filter(w => w.isVisible).map((w, index) => renderWidget(w.id, index))}
        </div>
      )}

      {/* Floating Chat Button */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-24 right-5 sm:bottom-12 sm:right-10 px-5 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg shadow-blue-500/30 flex items-center gap-2 z-50 border-2 border-white/20 transition-colors"
        id="floating-chat-button"
      >
        <MessageCircle className="w-7 h-7" />
        <span className="font-bold text-lg hidden sm:block">Farm Assistant</span>
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
      </motion.button>

      {/* Chat Overlay */}
      <ChatOverlay isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
}
