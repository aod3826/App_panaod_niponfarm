import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import PigLogo from '../components/PigLogo';

export default function Login() {
  const { signInWithEmail, signUpWithEmail, user, loading } = useAuth();
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Email form state
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user && !loading) {
      navigate('/', { replace: true });
    }
  }, [user, loading, navigate]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน');
      return;
    }
    if (isSignUp && !displayName) {
      setErrorMessage('กรุณากรอกชื่อแสดงตัวตนของคุณ');
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      if (isSignUp) {
        await signUpWithEmail(email, password, displayName);
        setSuccessMessage('สมัครสมาชิกสำเร็จ! กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชี หรือลองเข้าสู่ระบบได้เลย');
        setIsSignUp(false);
        setPassword('');
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err: any) {
      console.error('Email authentication error:', err);
      
      // Handle Supabase error messages
      const errorCode = err?.code || err?.message || '';
      
      if (errorCode.includes('invalid_credentials') || errorCode.includes('Invalid login credentials')) {
        setErrorMessage('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      } else if (errorCode.includes('email_not_confirmed')) {
        setErrorMessage('กรุณายืนยันอีเมลของคุณก่อนเข้าสู่ระบบ');
      } else if (errorCode.includes('user_already_exists') || errorCode.includes('User already registered')) {
        setErrorMessage('อีเมลนี้ถูกลงทะเบียนไว้เรียบร้อยแล้ว');
      } else if (errorCode.includes('weak_password')) {
        setErrorMessage('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      } else if (errorCode.includes('invalid_email')) {
        setErrorMessage('รูปแบบอีเมลไม่ถูกต้อง');
      } else {
        setErrorMessage('เกิดข้อผิดพลาด: ' + (err.message || 'โปรดลองใหม่อีกครั้ง'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isBtnDisabled = loading || isSubmitting;

  return (
    <div className="min-h-screen bg-[#fafbfc] dark:bg-[#0a2e36] flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden transition-colors duration-300">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#00bcd4]/10 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#00bcd4]/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="bg-white dark:bg-white/10 backdrop-blur-xl p-8 rounded-3xl shadow-2xl max-w-md w-full text-center space-y-6 animate-in zoom-in-95 duration-500 border border-slate-200 dark:border-white/20 z-10">
        {/* Logo and Header */}
        <div>
          <div className="mx-auto w-20 h-20 bg-white dark:bg-white/5 rounded-2xl flex items-center justify-center mb-4 shadow-[inset_0_2px_10px_rgba(0,0,0,0.2)] border border-slate-100 dark:border-white/10 pb-1.5">
            <PigLogo className="w-14 h-14 text-[#00bcd4]" animate={true} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1.5 tracking-wide">นิพนธ์ฟาร์ม</h1>
          <p className="text-slate-500 dark:text-white/60 font-medium text-sm">ระบบจัดการฟาร์มสุกรแบบมืออาชีพ</p>
        </div>

        {/* Toggle tabs */}
        <div className="flex border-b border-slate-200 dark:border-white/10 mb-6 font-semibold text-sm">
          <button
            type="button"
            onClick={() => { setIsSignUp(false); setErrorMessage(null); setSuccessMessage(null); }}
            className={`flex-1 pb-3 text-center transition-colors border-b-2 outline-none ${!isSignUp ? 'border-[#00bcd4] text-[#00bcd4]' : 'border-transparent text-slate-400 dark:text-white/50 hover:text-slate-600 dark:hover:text-white/85'}`}
          >
            เข้าสู่ระบบ
          </button>
          <button
            type="button"
            onClick={() => { setIsSignUp(true); setErrorMessage(null); setSuccessMessage(null); }}
            className={`flex-1 pb-3 text-center transition-colors border-b-2 outline-none ${isSignUp ? 'border-[#00bcd4] text-[#00bcd4]' : 'border-transparent text-slate-400 dark:text-white/50 hover:text-slate-600 dark:hover:text-white/85'}`}
          >
            สมัครสมาชิกใหม่
          </button>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="p-4 bg-green-50 dark:bg-green-950/40 border border-green-100 dark:border-green-900/40 rounded-2xl text-green-600 dark:text-green-400 text-sm font-medium text-left flex items-start gap-2">
            <span className="block mt-0.5 text-lg">&#10003;</span>
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/40 rounded-2xl text-red-600 dark:text-red-400 text-sm font-medium text-left flex flex-col gap-2">
            <div className="flex items-start gap-2">
              <span className="block mt-0.5 text-lg">&#9888;</span>
              <span className="font-bold">{errorMessage}</span>
            </div>
          </div>
        )}

        {/* Email & Password Form */}
        <form onSubmit={handleEmailSubmit} className="space-y-4 text-left">
          {isSignUp && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-white/70">ชื่อแสดงตัวตน</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="เช่น สมชาย มีสุข"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#113d46]/50 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:border-[#00bcd4] focus:ring-1 focus:ring-[#00bcd4] transition-all text-sm"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 dark:text-white/70">อีเมล</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ชื่อบัญชี@domain.com"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#113d46]/50 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:border-[#00bcd4] focus:ring-1 focus:ring-[#00bcd4] transition-all text-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-slate-500 dark:text-white/70">รหัสผ่าน</label>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isSignUp ? "อย่างน้อย 6 ตัวอักษร" : "รหัสผ่าน"}
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-[#113d46]/50 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:border-[#00bcd4] focus:ring-1 focus:ring-[#00bcd4] transition-all text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white/80"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isBtnDisabled}
            className="w-full mt-2 bg-[#00bcd4] text-white font-bold py-3 px-4 rounded-2xl hover:bg-[#0097a7] active:scale-95 transition-all shadow-lg shadow-[#00bcd4]/20 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <span>{isSignUp ? 'สร้างบัญชีและสมัครสมาชิก' : 'ลงชื่อเข้าใช้งาน'}</span>
            )}
          </button>
        </form>

        {/* Info box */}
        <div className="text-left bg-[#00bcd4]/10 dark:bg-[#00bcd4]/5 p-4 rounded-2xl border border-[#00bcd4]/20 dark:border-[#00bcd4]/10 backdrop-blur-sm">
          <p className="text-xs text-[#00a8bd] dark:text-[#00bcd4] leading-relaxed">
            <span className="font-semibold">ยินดีต้อนรับ!</span> ระบบนิพนธ์ฟาร์มใช้การยืนยันตัวตนผ่านอีเมลและรหัสผ่าน สมัครสมาชิกได้เลยครับ
          </p>
        </div>
      </div>
    </div>
  );
}
