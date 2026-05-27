import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AlertCircle, FileWarning } from 'lucide-react';
import clsx from 'clsx';

type BottomSheetOptions = {
  title?: string;
  message: string;
  type?: 'alert' | 'confirm';
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
};

type BottomSheetContextType = {
  showAlert: (message: string, title?: string) => void;
  showConfirm: (message: string, onConfirm: () => void, title?: string, onCancel?: () => void) => void;
  showBottomSheet: (content: ReactNode) => void;
  close: () => void;
};

const BottomSheetContext = createContext<BottomSheetContextType | undefined>(undefined);

export const BottomSheetProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<BottomSheetOptions | null>(null);
  const [content, setContent] = useState<ReactNode | null>(null);

  const showAlert = (message: string, title?: string) => {
    setContent(null);
    setOptions({ message, title, type: 'alert' });
    setIsOpen(true);
  };

  const showConfirm = (message: string, onConfirm: () => void, title?: string, onCancel?: () => void) => {
    setContent(null);
    setOptions({ message, title, type: 'confirm', onConfirm, onCancel });
    setIsOpen(true);
  };

  const showBottomSheet = (content: ReactNode) => {
    setOptions(null);
    setContent(content);
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
    setTimeout(() => {
      setOptions(null);
      setContent(null);
    }, 300); // Allow animation to finish
  };

  return (
    <BottomSheetContext.Provider value={{ showAlert, showConfirm, showBottomSheet, close }}>
      {children}

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] transition-opacity"
          onClick={close}
        />
      )}

      {/* Bottom Sheet UI */}
      <div 
        className={clsx(
          "fixed bottom-0 left-0 right-0 z-[101] bg-white dark:bg-[#1a2f3a] border-t border-slate-200 dark:border-white/20 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] transition-transform duration-300 ease-out flex flex-col max-h-[90vh]",
          isOpen ? "translate-y-0" : "translate-y-full"
        )}
      >
        <div className="w-12 h-1.5 bg-slate-100 dark:bg-white/20 rounded-full mx-auto mt-3 mb-2" />
        
        <div className="p-6 overflow-y-auto">
          {content ? (
            content
          ) : (
            <>
              {options?.title ? (
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                  <AlertCircle className="w-6 h-6 text-[#00bcd4]" />
                  {options.title}
                </h3>
              ) : (
                 <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                  <AlertCircle className="w-6 h-6 text-[#00bcd4]" />
                  แจ้งเตือน
                </h3>
              )}
              
              <p className="text-slate-700 dark:text-white/80 text-lg mb-6 whitespace-pre-wrap">
                {options?.message}
              </p>

              <div className="flex gap-4">
                {options?.type === 'confirm' && (
                  <button
                    onClick={() => {
                      if (options?.onCancel) options.onCancel();
                      close();
                    }}
                    className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-900 dark:text-white bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 transition-colors"
                  >
                    {options?.cancelText || 'ยกเลิก'}
                  </button>
                )}
                <button
                  onClick={() => {
                    if (options?.onConfirm) options.onConfirm();
                    close();
                  }}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-900 dark:text-white bg-[#00bcd4] hover:bg-[#00bcd4]/80 transition-colors shadow-xl dark:shadow-2xl shadow-[#00bcd4]/20"
                >
                  {options?.confirmText || 'ตกลง'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </BottomSheetContext.Provider>
  );
};

export const useBottomSheet = () => {
  const context = useContext(BottomSheetContext);
  if (context === undefined) {
    throw new Error('useBottomSheet must be used within a BottomSheetProvider');
  }
  return context;
};
