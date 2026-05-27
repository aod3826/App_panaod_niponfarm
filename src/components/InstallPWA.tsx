import React, { useState, useEffect } from 'react';
import { Download, X, Share } from 'lucide-react';

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIframe, setIsIframe] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);

  useEffect(() => {
    // Check if we are in an iframe
    if (window !== window.parent) {
      setIsIframe(true);
    }

    // Check if device is iOS
    const isIosDevice = 
      /iPad|iPhone|iPod/.test(navigator.userAgent) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      
    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    
    setIsIOS(isIosDevice);

    if (isIosDevice && !isStandalone) {
      // Show iOS prompt by default if not installed
      setShowIOSPrompt(true);
    }

    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI to notify the user they can add to home screen
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  // Do not show anything if already installed
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
  if (isStandalone) return null;

  if (isIframe) {
    return (
      <div className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-blue-50 border border-blue-200 shadow-2xl dark:shadow-xl rounded-xl p-4 z-[9998] flex items-start gap-4">
        <div className="flex-1">
          <h3 className="font-bold text-blue-900 text-sm">การติดตั้งแอปฯ</h3>
          <p className="text-xs text-blue-700 mt-1">ฟีเจอร์ติดตั้ง PWA จะทำงานต่อเมื่อคุณเปิดแอปนี้ใน **หน้าต่างแยก (New Tab)** เท่านั้น (ไม่สามารถใช้งานใน Preview ได้)</p>
        </div>
      </div>
    );
  }

  if (isIOS && showIOSPrompt) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-white border border-gray-200 shadow-2xl dark:shadow-xl rounded-xl p-4 z-[9998] flex items-start gap-4 animate-in slide-in-from-bottom">
        <div className="flex-1">
          <h3 className="font-bold text-gray-900 text-sm">ติดตั้งแอปลง iPhone/iPad</h3>
          <p className="text-xs text-gray-500 mt-1">
            แตะที่ไอคอน <Share className="w-3 h-3 inline pb-0.5" /> ด้านล่างหน้าจอ แล้วเลือก <strong>"Add to Home Screen"</strong> (เพิ่มไปยังหน้าจอโฮม)
          </p>
        </div>
        <button onClick={() => setShowIOSPrompt(false)} className="text-gray-400 hover:text-gray-600 p-1">
          <X className="w-5 h-5" />
        </button>
      </div>
    );
  }

  if (!showPrompt) return null;

  return (
    <div className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-white border border-green-200 shadow-2xl dark:shadow-xl rounded-xl p-4 z-[9998] flex items-start gap-4 animate-in slide-in-from-top fade-in">
      <div className="flex-1">
        <h3 className="font-bold text-gray-900 text-sm">ติดตั้งแอป นิพนธ์ฟาร์ม</h3>
        <p className="text-xs text-gray-500 mt-1">ติดตั้งแอปพลิเคชันลงในเครื่องเพื่อการใช้งานที่รวดเร็วขึ้น</p>
        <button 
          onClick={handleInstallClick}
          className="mt-3 bg-green-600 text-slate-900 dark:text-white text-xs font-medium px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2 w-full"
        >
          <Download className="w-4 h-4" />
          ติดตั้งเลย
        </button>
      </div>
      <button onClick={() => setShowPrompt(false)} className="text-gray-400 hover:text-gray-600 p-1">
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}
