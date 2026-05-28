import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ExternalLink, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import PigLogo from '../components/PigLogo';

export default function Login() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, user, loading } = useAuth();
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

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

  const handleGoogleLogin = async () => {
    setErrorMessage(null);
    setErrorCode(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Login error:', err);
      setErrorCode(err?.code || null);
      if (err.code === 'auth/popup-closed-by-user') {
        setErrorMessage('คุณปิดหน้าต่างล็อกอินเร็วเกินไป โปรดรอให้หน้าต่างโหลดเสร็จหรือลอง "เปิดในแท็บใหม่"');
      } else if (err.code === 'auth/popup-blocked') {
        setErrorMessage('เบราว์เซอร์บล็อกหน้าต่างป๊อปอัป โปรดกดที่ไอคอน "เปิดในแท็บใหม่" มุมขวาบนครับ');
      } else if (err.code === 'auth/network-request-failed') {
        setErrorMessage('การเชื่อมต่อล้มเหลว โปรดลอง "เปิดในแท็บใหม่" เพื่อความเสถียรสูงสุด');
      } else if (err.code === 'auth/unauthorized-domain') {
        setErrorMessage('โดเมนนี้ยังไม่ได้รับอนุญาตใน Firebase Console โปรดเพิ่มโดเมนนี้ใน Authorized Domains ของคุณ');
      } else {
        setErrorMessage('เกิดข้อผิดพลาด: ' + (err.message || 'โปรดลองใหม่อีกครั้ง'));
      }
    }
  };

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
    setErrorCode(null);
    setIsSubmitting(true);

    try {
      if (isSignUp) {
        await signUpWithEmail(email, password, displayName);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err: any) {
      console.error('Email authentication error:', err);
      setErrorCode(err?.code || null);
      if (err.code === 'auth/invalid-email') {
        setErrorMessage('รูปแบบอีเมลไม่ถูกต้อง');
      } else if (err.code === 'auth/wrong-password') {
        setErrorMessage('รหัสผ่านไม่ถูกต้อง');
      } else if (err.code === 'auth/user-not-found') {
        setErrorMessage('ไม่พบข้อมูลบัญชีผู้ใช้นี้');
      } else if (err.code === 'auth/email-already-in-use') {
        setErrorMessage('อีเมลนี้ถูกลงทะเบียนไว้เรียบร้อยแล้ว');
      } else if (err.code === 'auth/weak-password') {
        setErrorMessage('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      } else if (err.code === 'auth/invalid-credential') {
        setErrorMessage('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      } else if (err.code === 'auth/user-disabled') {
        setErrorMessage('บัญชีนี้ถูกระงับการใช้งาน');
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
            onClick={() => { setIsSignUp(false); setErrorMessage(null); }}
            className={`flex-1 pb-3 text-center transition-colors border-b-2 outline-none ${!isSignUp ? 'border-[#00bcd4] text-[#00bcd4]' : 'border-transparent text-slate-400 dark:text-white/50 hover:text-slate-600 dark:hover:text-white/85'}`}
          >
            เข้าสู่ระบบ
          </button>
          <button
            type="button"
            onClick={() => { setIsSignUp(true); setErrorMessage(null); }}
            className={`flex-1 pb-3 text-center transition-colors border-b-2 outline-none ${isSignUp ? 'border-[#00bcd4] text-[#00bcd4]' : 'border-transparent text-slate-400 dark:text-white/50 hover:text-slate-600 dark:hover:text-white/85'}`}
          >
            สมัครสมาชิกใหม่
          </button>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/40 rounded-2xl text-red-600 dark:text-red-400 text-sm font-medium text-left flex flex-col gap-2">
            <div className="flex items-start gap-2">
              <span className="block mt-0.5 text-lg">⚠️</span>
              <span className="font-bold">{errorMessage}</span>
            </div>
            {!isSignUp && errorMessage.includes('โดเมนนี้ยังไม่ได้รับอนุญาต') && (
              <div className="text-xs text-red-500 dark:text-red-400/90 leading-relaxed pl-7">
                <p className="mb-1 font-bold italic underline">วิธีแก้ปัญหาที่ได้ผลที่สุด:</p>
                <ol className="list-decimal space-y-1">
                  <li>มองไปที่ <b>มุมขวาบนสุด</b> ของหน้าจอนี้</li>
                  <li>กดปุ่มที่รูป <b>สี่เหลี่ยมมีลูกศรชี้ออก</b> (Open in new tab)</li>
                  <li>เครื่องจะเปิดหน้าเว็บใหม่ ให้ลองล็อกอินอีกครั้งในหน้านั้นครับ</li>
                </ol>
              </div>
            )}
            {isSignUp && errorCode === 'auth/email-already-in-use' && (
              <div className="text-xs text-red-500 dark:text-red-400/90 leading-relaxed pl-7 mt-1 border-t border-red-200 dark:border-red-900/20 pt-2 flex flex-col gap-1.5">
                <p>ดูเหมือนว่าคุณเคยลงทะเบียนอีเมลนี้ไว้แล้วนะครับ ต้องการเข้าสู่ระบบด้วยอีเมลนี้เลยไหมครับ?</p>
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(false);
                    setErrorCode(null);
                    setErrorMessage(null);
                  }}
                  className="w-full text-center py-2 bg-red-100 dark:bg-red-950/80 hover:bg-[#00bcd4] hover:text-white border border-red-200 dark:border-red-900/40 rounded-xl font-bold text-[#00a8bd] dark:text-[#00bcd4] dark:hover:text-white transition-all outline-none"
                >
                  👉 คลิกที่นี่เพื่อสลับเป็น "เข้าสู่ระบบ" ได้ทันทีครับ
                </button>
              </div>
            )}
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
                placeholder={isSignUp ? "อย่างน้อย 6 ตัวอักษร" : "••••••••"}
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

        {/* Divider */}
        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-slate-100 dark:border-white/10 animate-pulse"></div>
          <span className="flex-shrink mx-4 text-xs font-semibold text-slate-400 dark:text-white/40 uppercase tracking-widest text-[10px]">หรือใช้วิธีอื่น</span>
          <div className="flex-grow border-t border-slate-100 dark:border-white/10 animate-pulse"></div>
        </div>

        {/* Google sign in button alternative */}
        <button 
          type="button"
          onClick={handleGoogleLogin}
          disabled={isBtnDisabled}
          className="w-full bg-white dark:bg-white/5 text-slate-800 dark:text-white hover:bg-slate-50 dark:hover:bg-white/10 font-bold py-3 px-4 rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all shadow-sm border border-slate-200 dark:border-white/15 disabled:opacity-50 disabled:cursor-not-allowed group text-sm"
        >
          {loading && !isSubmitting ? (
            <div className="w-5 h-5 border-2 border-slate-400 border-t-slate-800 dark:border-white/30 dark:border-t-white rounded-full animate-spin"></div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="bg-white p-1 rounded-lg">
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-4 h-4" />
              </div>
              <span>เข้าสู่ระบบด้วย Google</span>
            </div>
          )}
        </button>

        {/* Notice/Tips */}
        <div className="text-left bg-[#00bcd4]/10 dark:bg-[#00bcd4]/5 p-4 rounded-2xl border border-[#00bcd4]/20 dark:border-[#00bcd4]/10 backdrop-blur-sm">
          <p className="text-xs text-[#00a8bd] dark:text-[#00bcd4] flex items-start gap-2 leading-relaxed">
            <ExternalLink className="w-4 h-4 shrink-0 mt-0.5" />
            <span>หากต้องการใช้งาน Google Sign-In และพบปัญหาเกี่ยวกับโดเนม (unauthorized auth-domain) คุณสามารถกดปุ่ม <strong>"เปิดในแท็บใหม่" (Open in new tab)</strong> ที่ปุ่มมุมขวาบนสุดของหน้าจอ เพื่อล็อกอินผ่านโดเมนตรงได้เช่นกันครับ</span>
          </p>
        </div>
      </div>
    </div>
  );
}
