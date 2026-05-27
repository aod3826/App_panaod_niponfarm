import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ExternalLink } from 'lucide-react';
import PigLogo from '../components/PigLogo';

export default function Login() {
  const { signInWithGoogle, user, loading } = useAuth();
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user && !loading) {
      navigate('/', { replace: true });
    }
  }, [user, loading, navigate]);

  const handleLogin = async () => {
    setErrorMessage(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setErrorMessage('คุณปิดหน้าต่างล็อกอินเร็วเกินไป โปรดรอให้หน้าต่างโหลดเสร็จหรือลอง "เปิดในแท็บใหม่"');
      } else if (err.code === 'auth/popup-blocked') {
        setErrorMessage('เบราว์เซอร์บล็อกหน้าต่างป๊อปอัป โปรดกดที่ไอคอน "เปิดในแท็บใหม่" มุมขวาบนครับ');
      } else if (err.code === 'auth/network-request-failed') {
        setErrorMessage('การเชื่อมต่อล้มเหลว โปรดลอง "เปิดในแท็บใหม่" เพื่อความเสถียรสูงสุด');
      } else {
        setErrorMessage('เกิดข้อผิดพลาด: ' + (err.message || 'โปรดลองใหม่อีกครั้ง'));
      }
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a2e36] flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#00bcd4]/10 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#00bcd4]/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="bg-white dark:bg-white/10 backdrop-blur-xl p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center space-y-8 animate-in zoom-in-95 duration-500 border border-slate-200 dark:border-white/20 z-10">
        <div className="mx-auto w-24 h-24 bg-white dark:bg-white/5 rounded-2xl flex items-center justify-center mb-6 shadow-[inset_0_2px_10px_rgba(0,0,0,0.2)] border border-slate-200 dark:border-white/10 pb-2">
          <PigLogo className="w-16 h-16 text-[#00bcd4]" animate={true} />
        </div>
        
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-3 tracking-wide">นิพนธ์ฟาร์ม</h1>
          <p className="text-slate-600 dark:text-white/60 font-medium">ระบบจัดการฟาร์มสุกรแบบมืออาชีพ</p>
        </div>

        {errorMessage && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-medium text-left flex flex-col gap-2">
            <div className="flex items-start gap-2">
              <span className="block mt-0.5 text-lg">⚠️</span>
              <span className="font-bold">{errorMessage}</span>
            </div>
            <div className="text-xs text-red-500 opacity-90 leading-relaxed pl-7">
              <p className="mb-1 font-bold italic underline">วิธีแก้ปัญหาที่ได้ผลที่สุด:</p>
              <ol className="list-decimal space-y-1">
                <li>มองไปที่ <b>มุมขวาบนสุด</b> ของหน้าจอนี้</li>
                <li>กดปุ่มที่รูป <b>สี่เหลี่ยมมีลูกศรชี้ออก</b> (Open in new tab)</li>
                <li>เครื่องจะเปิดหน้าเว็บใหม่ ให้ลองล็อกอินอีกครั้งในหน้านั้นครับ</li>
              </ol>
            </div>
          </div>
        )}

        <button 
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-blue-600 text-white font-bold py-4 px-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-blue-700 active:scale-95 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          {loading ? (
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="bg-white p-1 rounded-lg">
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
              </div>
              <span className="text-lg">เข้าสู่ระบบด้วย Google</span>
            </div>
          )}
        </button>
        
        <div className="text-left bg-[#00bcd4]/10 p-4 rounded-2xl border border-[#00bcd4]/20 mt-6 backdrop-blur-sm">
          <p className="text-xs text-[#00bcd4] flex items-start gap-2 leading-relaxed">
            <ExternalLink className="w-4 h-4 shrink-0 mt-0.5" />
            <span>หากกดล็อกอินแล้วหน้าต่างเด้งปิดไป แนะนำให้กดปุ่ม <strong>"เปิดในแท็บใหม่" (Open in new tab)</strong> ที่มุมขวาบนของหน้าจอนี้ แล้วลองล็อกอินอีกครั้งครับ</span>
          </p>
        </div>
      </div>
    </div>
  );
}
