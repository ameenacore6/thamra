import React, { useState } from 'react';
import {
  Accessibility,
  Bell,
  Globe,
  LogOut,
  Save,
  Settings as SettingsIcon,
  User,
  Volume2,
} from 'lucide-react';
import { updateUserProfileApi } from '../../services/appApi';
import type { AppLanguage, UserProfile, UserSettings } from '../../types/farm';

interface SettingsPageProps {
  language: AppLanguage;
  user: UserProfile | null;
  settings: UserSettings;
  onUpdateSettings: (patch: Partial<UserSettings>) => void;
  onUserUpdated: (user: UserProfile) => void;
  onLogout: () => void;
  onGoLogin: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  language,
  user,
  settings,
  onUpdateSettings,
  onUserUpdated,
  onLogout,
  onGoLogin,
}) => {
  const isAr = language === 'ar';
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileRegion, setProfileRegion] = useState(user?.farmRegion || 'Bahrain');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const updated = await updateUserProfileApi({
        name: profileName,
        farmRegion: profileRegion,
      });
      onUserUpdated(updated);
      setProfileMsg(isAr ? 'تم حفظ الملف الشخصي بنجاح.' : 'Profile saved.');
    } catch (err) {
      setProfileMsg(err instanceof Error ? err.message : 'Unable to save profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="bg-white border border-[#D5D5D5] rounded-2xl p-4">
        <h1 className="text-lg font-bold text-[#1C250C] flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-[#535C21]" />
          <span>{isAr ? 'الإعدادات والحساب' : 'Settings & Account Preferences'}</span>
        </h1>
      </div>

      {/* User Profile */}
      <section className="bg-white border border-[#D5D5D5] rounded-2xl p-4 space-y-3 text-xs">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#1C250C] flex items-center gap-2">
            <User className="w-4 h-4 text-[#535C21]" />
            <span>{isAr ? 'الملف الشخصي للمزارع' : 'Farmer Profile'}</span>
          </h2>
          {user ? (
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#DBAE83]/30 hover:bg-[#DBAE83]/50 text-[#1C250C] font-semibold cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{isAr ? 'تسجيل الخروج' : 'Logout'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onGoLogin}
              className="px-3 py-1.5 rounded-lg bg-[#1C250C] text-white font-semibold cursor-pointer"
            >
              {isAr ? 'تسجيل الدخول / إنشاء حساب' : 'Sign In / Register'}
            </button>
          )}
        </div>

        {user ? (
          <form onSubmit={(e) => void handleSaveProfile(e)} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-[#535C21] mb-1">
                {isAr ? 'الاسم' : 'Name'}
              </label>
              <input
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full px-3 py-2 bg-[#faf8f4] border border-[#D5D5D5] rounded-xl"
              />
            </div>
            <div>
              <label className="block font-medium text-[#535C21] mb-1">
                {isAr ? 'المنطقة في البحرين' : 'Bahrain Farm Region'}
              </label>
              <input
                value={profileRegion}
                onChange={(e) => setProfileRegion(e.target.value)}
                className="w-full px-3 py-2 bg-[#faf8f4] border border-[#D5D5D5] rounded-xl"
              />
            </div>
            <div className="sm:col-span-2 flex items-center justify-between">
              <span className="text-[#8E7D49]">{user.email}</span>
              <button
                type="submit"
                disabled={savingProfile}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#535C21] text-white font-semibold cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingProfile ? (isAr ? 'حفظ...' : 'Saving...') : isAr ? 'حفظ التعديلات' : 'Save Profile'}</span>
              </button>
            </div>
            {profileMsg && <p className="sm:col-span-2 text-[#535C21] font-semibold">{profileMsg}</p>}
          </form>
        ) : (
          <p className="text-[#8E7D49]">
            {isAr
              ? 'أنت تتصفح حالياً كضيف (تُحفظ التعديلات محلياً). سجّل الدخول لمزامنة مزارعك عبر الأجهزة.'
              : 'You are currently browsing as a guest (changes saved locally). Sign in to sync farms & settings to your account.'}
          </p>
        )}
      </section>

      {/* Language Switch */}
      <section className="bg-white border border-[#D5D5D5] rounded-2xl p-4 space-y-2.5 text-xs">
        <h2 className="text-sm font-bold text-[#1C250C] flex items-center gap-2">
          <Globe className="w-4 h-4 text-[#535C21]" />
          <span>{isAr ? 'اللغة والاتجاه' : 'Language & Interface Direction'}</span>
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onUpdateSettings({ language: 'en' })}
            className={`px-4 py-2 rounded-xl font-semibold cursor-pointer ${
              settings.language === 'en'
                ? 'bg-[#535C21] text-white'
                : 'bg-[#faf8f4] border border-[#D5D5D5] text-[#1C250C]'
            }`}
          >
            English (LTR)
          </button>
          <button
            type="button"
            onClick={() => onUpdateSettings({ language: 'ar' })}
            className={`px-4 py-2 rounded-xl font-semibold cursor-pointer ${
              settings.language === 'ar'
                ? 'bg-[#535C21] text-white'
                : 'bg-[#faf8f4] border border-[#D5D5D5] text-[#1C250C]'
            }`}
          >
            العربية (RTL)
          </button>
        </div>
      </section>

      {/* Tamra Voice Preferences */}
      <section className="bg-white border border-[#D5D5D5] rounded-2xl p-4 space-y-3 text-xs">
        <h2 className="text-sm font-bold text-[#1C250C] flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-[#535C21]" />
          <span>{isAr ? 'تفضيلات صوت تمرة' : 'Tamra Voice Preferences'}</span>
        </h2>
        <label className="flex items-center justify-between gap-2 cursor-pointer">
          <span>{isAr ? 'تشغيل الرد الصوتي تلقائياً' : 'Auto-speak Tamra replies aloud'}</span>
          <input
            type="checkbox"
            checked={settings.tamraAutoSpeak}
            onChange={(e) => onUpdateSettings({ tamraAutoSpeak: e.target.checked })}
            className="w-4 h-4 accent-[#535C21]"
          />
        </label>
        <label className="flex items-center justify-between gap-2 cursor-pointer">
          <span>{isAr ? 'التوقف التلقائي عند السكوت في الميكروفون' : 'Auto-stop mic recording when you pause speaking'}</span>
          <input
            type="checkbox"
            checked={settings.tamraContinuousVoice}
            onChange={(e) => onUpdateSettings({ tamraContinuousVoice: e.target.checked })}
            className="w-4 h-4 accent-[#535C21]"
          />
        </label>
        <div>
          <div className="flex justify-between mb-1">
            <span>{isAr ? 'سرعة الصوت' : 'Voice Playback Speed'}</span>
            <span className="font-mono-tabular font-semibold">{settings.tamraSpeechRate.toFixed(1)}x</span>
          </div>
          <input
            type="range"
            min="0.8"
            max="1.3"
            step="0.1"
            value={settings.tamraSpeechRate}
            onChange={(e) => onUpdateSettings({ tamraSpeechRate: Number(e.target.value) })}
            className="w-full accent-[#535C21]"
          />
        </div>
      </section>

      {/* Notifications & Accessibility */}
      <section className="bg-white border border-[#D5D5D5] rounded-2xl p-4 space-y-3 text-xs">
        <h2 className="text-sm font-bold text-[#1C250C] flex items-center gap-2">
          <Bell className="w-4 h-4 text-[#535C21]" />
          <span>{isAr ? 'التنبيهات وإمكانية الوصول' : 'Notifications & Accessibility'}</span>
        </h2>
        <label className="flex items-center justify-between gap-2 cursor-pointer font-semibold">
          <span>{isAr ? 'تفعيل نظام التنبيهات الذكي' : 'Enable THAMRA Smart Notifications'}</span>
          <input
            type="checkbox"
            checked={settings.notificationsEnabled}
            onChange={(e) => onUpdateSettings({ notificationsEnabled: e.target.checked })}
            className="w-4 h-4 accent-[#535C21]"
          />
        </label>

        {settings.notificationsEnabled && (
          <div className="rounded-xl bg-[#faf8f4] border border-[#D5D5D5] p-3 space-y-2.5">
            <label className="flex items-center justify-between gap-2 cursor-pointer">
              <span>{isAr ? 'تنبيهات الطقس (حرارة، أمطار، رياح، رطوبة)' : 'Weather alerts (heat, rain, wind, humidity)'}</span>
              <input
                type="checkbox"
                checked={settings.notifyWeather !== false}
                onChange={(e) => onUpdateSettings({ notifyWeather: e.target.checked })}
                className="w-4 h-4 accent-[#535C21]"
              />
            </label>
            <label className="flex items-center justify-between gap-2 cursor-pointer">
              <span>{isAr ? 'تنبيهات التربة وخزانات المياه' : 'Soil moisture & water tank level alerts'}</span>
              <input
                type="checkbox"
                checked={settings.notifySoilWater !== false}
                onChange={(e) => onUpdateSettings({ notifySoilWater: e.target.checked })}
                className="w-4 h-4 accent-[#535C21]"
              />
            </label>
            <label className="flex items-center justify-between gap-2 cursor-pointer">
              <span>{isAr ? 'تذكيرات التسميد والرعاية والحصاد والأمراض' : 'Plant care schedule, harvest & disease watch alerts'}</span>
              <input
                type="checkbox"
                checked={settings.notifyPlantCare !== false}
                onChange={(e) => onUpdateSettings({ notifyPlantCare: e.target.checked })}
                className="w-4 h-4 accent-[#535C21]"
              />
            </label>
            <label className="flex items-center justify-between gap-2 cursor-pointer">
              <span>{isAr ? 'تنبيهات الأمان والحساب واتصال الحساسات' : 'Security, account activity & sensor disconnect alerts'}</span>
              <input
                type="checkbox"
                checked={settings.notifySecurity !== false}
                onChange={(e) => onUpdateSettings({ notifySecurity: e.target.checked })}
                className="w-4 h-4 accent-[#535C21]"
              />
            </label>

            <div className="pt-1 border-t border-[#D5D5D5]">
              <div className="flex justify-between mb-1">
                <span>{isAr ? 'حد تنبيه جفاف التربة' : 'Soil Dryness Alert Threshold'}</span>
                <span className="font-mono-tabular font-bold text-[#535C21]">
                  {settings.moistureAlertThreshold}%
                </span>
              </div>
              <input
                type="range"
                min="8"
                max="45"
                step="1"
                value={settings.moistureAlertThreshold}
                onChange={(e) =>
                  onUpdateSettings({ moistureAlertThreshold: Number(e.target.value) })
                }
                className="w-full accent-[#535C21]"
              />
            </div>
          </div>
        )}
        <div className="pt-2 border-t border-[#D5D5D5] space-y-2.5">
          <p className="font-semibold text-[#535C21] flex items-center gap-1.5">
            <Accessibility className="w-3.5 h-3.5" />
            <span>{isAr ? 'خيارات إمكانية الوصول' : 'Accessibility Options'}</span>
          </p>
          <label className="flex items-center justify-between gap-2 cursor-pointer">
            <span>{isAr ? 'نص أكبر للوضوح' : 'Larger readable text'}</span>
            <input
              type="checkbox"
              checked={settings.largeText}
              onChange={(e) => onUpdateSettings({ largeText: e.target.checked })}
              className="w-4 h-4 accent-[#535C21]"
            />
          </label>
          <label className="flex items-center justify-between gap-2 cursor-pointer">
            <span>{isAr ? 'تباين ألوان أعلى' : 'High-contrast mode'}</span>
            <input
              type="checkbox"
              checked={settings.highContrast}
              onChange={(e) => onUpdateSettings({ highContrast: e.target.checked })}
              className="w-4 h-4 accent-[#535C21]"
            />
          </label>
          <label className="flex items-center justify-between gap-2 cursor-pointer">
            <span>{isAr ? 'تقليل الحركة والرسوم المتحركة' : 'Reduce motion'}</span>
            <input
              type="checkbox"
              checked={settings.reducedMotion}
              onChange={(e) => onUpdateSettings({ reducedMotion: e.target.checked })}
              className="w-4 h-4 accent-[#535C21]"
            />
          </label>
        </div>
      </section>
    </div>
  );
};
