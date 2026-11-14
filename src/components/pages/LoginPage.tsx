import React, { useState } from 'react';
import { Eye, EyeOff, KeyRound, LogIn, UserPlus } from 'lucide-react';
import {
  loginUser,
  registerUser,
  requestPasswordReset,
  resetPasswordWithCode,
} from '../../services/appApi';
import type { AppLanguage, UserProfile } from '../../types/farm';

interface LoginPageProps {
  language: AppLanguage;
  onAuthenticated: (user: UserProfile) => void;
  onBackDashboard: () => void;
}

type AuthMode = 'login' | 'register' | 'forgot';

export const LoginPage: React.FC<LoginPageProps> = ({
  language,
  onAuthenticated,
  onBackDashboard,
}) => {
  const isAr = language === 'ar';
  const [mode, setMode] = useState<AuthMode>('login');

  const [name, setName] = useState('');
  const [farmRegion, setFarmRegion] = useState("Buri & A'ali, Bahrain");
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetIssuedCode, setResetIssuedCode] = useState<string | null>(null);
  const [resetStepConfirm, setResetStepConfirm] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setBusy(true);

    try {
      if (mode === 'login') {
        const { user } = await loginUser({ email, password });
        onAuthenticated(user);
        onBackDashboard();
      } else if (mode === 'register') {
        const { user } = await registerUser({ name, email, password, farmRegion });
        onAuthenticated(user);
        onBackDashboard();
      } else if (!resetStepConfirm) {
        const res = await requestPasswordReset(email);
        setResetIssuedCode(res.demoResetCode ?? null);
        setResetStepConfirm(true);
        setSuccessMsg(
          isAr
            ? 'تم إنشاء رمز التحقق المكون من 6 أرقام أدناه لإعادة تعيين كلمة المرور.'
            : res.message,
        );
      } else {
        await resetPasswordWithCode({ email, code: resetCode, newPassword });
        setSuccessMsg(
          isAr
            ? 'تم تحديث كلمة المرور بنجاح. يمكنك تسجيل الدخول الآن.'
            : 'Password updated successfully. You can now sign in.',
        );
        setMode('login');
        setResetStepConfirm(false);
        setResetIssuedCode(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication request failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-4">
      <div className="bg-white border border-[#D5D5D5] rounded-2xl p-6 shadow-sm space-y-5">
        <div className="text-center space-y-1">
          <h1 className="text-xl font-bold text-[#1C250C]">
            {mode === 'login'
              ? isAr
                ? 'تسجيل الدخول إلى ثمرة'
                : 'Sign In to THAMRA'
              : mode === 'register'
                ? isAr
                  ? 'إنشاء حساب مزارع جديد'
                  : 'Create Farmer Account'
                : isAr
                  ? 'إعادة تعيين كلمة المرور'
                  : 'Reset Password'}
          </h1>
          <p className="text-xs text-[#535C21]">
            {isAr
              ? 'احفظ مزارعك وأقسامك وسجل محاصيلك وإعداداتك بأمان على الخادم'
              : 'Sync your farms, crop sections, rotation history & preferences securely'}
          </p>
        </div>

        {/* Mode Tabs */}
        <div className="grid grid-cols-3 gap-1.5 bg-[#f3f2ee] p-1 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
              setSuccessMsg(null);
            }}
            className={`py-1.5 rounded-lg cursor-pointer ${
              mode === 'login' ? 'bg-[#535C21] text-white' : 'text-[#1C250C]'
            }`}
          >
            {isAr ? 'دخول' : 'Login'}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
              setSuccessMsg(null);
            }}
            className={`py-1.5 rounded-lg cursor-pointer ${
              mode === 'register' ? 'bg-[#535C21] text-white' : 'text-[#1C250C]'
            }`}
          >
            {isAr ? 'تسجيل' : 'Register'}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('forgot');
              setError(null);
              setSuccessMsg(null);
            }}
            className={`py-1.5 rounded-lg cursor-pointer ${
              mode === 'forgot' ? 'bg-[#535C21] text-white' : 'text-[#1C250C]'
            }`}
          >
            {isAr ? 'نسيت كلمة المرور' : 'Reset'}
          </button>
        </div>

        {error && (
          <div className="rounded-xl bg-[#DBAE83]/25 border border-[#AD927E] px-3 py-2 text-xs text-[#1C250C]">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="rounded-xl bg-[#535C21]/10 border border-[#535C21]/30 px-3 py-2 text-xs text-[#1C250C]">
            {successMsg}
          </div>
        )}

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3 text-xs">
          {mode === 'register' && (
            <>
              <div>
                <label className="block font-semibold text-[#1C250C] mb-1">
                  {isAr ? 'الاسم الكامل' : 'Full Name'}
                </label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={isAr ? 'مثال: أحمد علي' : 'e.g. Ali Al-Mansoor'}
                  className="w-full px-3 py-2 bg-[#faf8f4] border border-[#D5D5D5] rounded-xl"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#1C250C] mb-1">
                  {isAr ? 'المنطقة الزراعية' : 'Farm Region'}
                </label>
                <input
                  type="text"
                  value={farmRegion}
                  onChange={(e) => setFarmRegion(e.target.value)}
                  className="w-full px-3 py-2 bg-[#faf8f4] border border-[#D5D5D5] rounded-xl"
                />
              </div>
            </>
          )}

          <div>
            <label className="block font-semibold text-[#1C250C] mb-1">
              {isAr ? 'البريد الإلكتروني' : 'Email Address'}
            </label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="farmer@example.com"
              className="w-full px-3 py-2 bg-[#faf8f4] border border-[#D5D5D5] rounded-xl"
            />
          </div>

          {mode !== 'forgot' && (
            <div>
              <label className="block font-semibold text-[#1C250C] mb-1">
                {isAr ? 'كلمة المرور' : 'Password'}
              </label>
              <div className="relative">
                <input
                  required
                  minLength={6}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  className="w-full px-3 py-2 pe-10 bg-[#faf8f4] border border-[#D5D5D5] rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={isAr ? 'إظهار كلمة المرور' : 'Toggle password visibility'}
                  className="absolute inset-y-0 end-2.5 flex items-center text-[#8E7D49] cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {mode === 'forgot' && resetStepConfirm && (
            <>
              {resetIssuedCode && (
                <p className="text-[11px] bg-[#f3f2ee] border border-[#D5D5D5] rounded-lg px-3 py-2 font-mono-tabular">
                  {isAr ? 'رمز إعادة التعيين التجريبي (لا يوجد بريد SMTP):' : 'Verification Code:'}{' '}
                  <strong>{resetIssuedCode}</strong>
                </p>
              )}
              <div>
                <label className="block font-semibold text-[#1C250C] mb-1">
                  {isAr ? 'رمز التحقق (6 أرقام)' : '6-Digit Verification Code'}
                </label>
                <input
                  required
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  className="w-full px-3 py-2 bg-[#faf8f4] border border-[#D5D5D5] rounded-xl font-mono-tabular"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#1C250C] mb-1">
                  {isAr ? 'كلمة المرور الجديدة' : 'New Password'}
                </label>
                <input
                  required
                  minLength={6}
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-[#faf8f4] border border-[#D5D5D5] rounded-xl"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 rounded-xl bg-[#1C250C] hover:bg-[#2c3a14] text-white font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {mode === 'login' ? (
              <LogIn className="w-4 h-4 text-[#DBAE83]" />
            ) : mode === 'register' ? (
              <UserPlus className="w-4 h-4 text-[#DBAE83]" />
            ) : (
              <KeyRound className="w-4 h-4 text-[#DBAE83]" />
            )}
            <span>
              {busy
                ? isAr
                  ? 'جاري المعالجة...'
                  : 'Submitting...'
                : mode === 'login'
                  ? isAr
                    ? 'تسجيل الدخول'
                    : 'Sign In'
                  : mode === 'register'
                    ? isAr
                      ? 'إنشاء الحساب'
                      : 'Create Account'
                    : resetStepConfirm
                      ? isAr
                        ? 'تأكيد كلمة المرور الجديدة'
                        : 'Confirm New Password'
                      : isAr
                        ? 'إرسال رمز التحقق'
                        : 'Send Reset Code'}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
};
