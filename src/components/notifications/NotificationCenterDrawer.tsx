import React, { useMemo, useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Bell,
  Check,
  CheckCheck,
  CloudSun,
  Droplets,
  Info,
  Leaf,
  Settings,
  ShieldAlert,
  Trash2,
  X,
} from 'lucide-react';
import type {
  AppLanguage,
  AppNotification,
  AppPage,
  NotificationCategory,
} from '../../types/farm';

interface NotificationCenterDrawerProps {
  open: boolean;
  onClose: () => void;
  language: AppLanguage;
  notifications: AppNotification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onDismiss: (id: string) => void;
  onClearAll: () => void;
  onOpenTarget: (notification: AppNotification) => void;
  onOpenSettings: (page: AppPage) => void;
}

export const NotificationCenterDrawer: React.FC<NotificationCenterDrawerProps> = ({
  open,
  onClose,
  language,
  notifications,
  onMarkRead,
  onMarkAllRead,
  onDismiss,
  onClearAll,
  onOpenTarget,
  onOpenSettings,
}) => {
  const isAr = language === 'ar';
  const [filter, setFilter] = useState<'all' | NotificationCategory>('all');

  const filtered = useMemo(
    () =>
      filter === 'all'
        ? notifications
        : notifications.filter((n) => n.category === filter),
    [notifications, filter],
  );

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  if (!open) return null;

  const getSeverityStyle = (sev: AppNotification['severity']) => {
    if (sev === 'critical') {
      return {
        box: 'bg-red-50/90 border-red-300',
        badge: 'text-red-700 bg-red-100',
        label: isAr ? 'حرج' : 'Critical',
        icon: <AlertOctagon className="w-4 h-4 text-red-600 shrink-0" />,
      };
    }
    if (sev === 'warning') {
      return {
        box: 'bg-[#DBAE83]/20 border-[#AD927E]',
        badge: 'text-[#8a5519] bg-[#DBAE83]/45',
        label: isAr ? 'تحذير' : 'Warning',
        icon: <AlertTriangle className="w-4 h-4 text-[#9a631f] shrink-0" />,
      };
    }
    return {
      box: 'bg-[#edf2e2]/65 border-[#8E7D49]/35',
      badge: 'text-[#535C21] bg-[#e2ead2]',
      label: isAr ? 'معلومة' : 'Info',
      icon: <Info className="w-4 h-4 text-[#535C21] shrink-0" />,
    };
  };

  const getCategoryIcon = (cat: NotificationCategory) => {
    switch (cat) {
      case 'weather':
        return <CloudSun className="w-3.5 h-3.5" />;
      case 'soil_water':
        return <Droplets className="w-3.5 h-3.5" />;
      case 'plant':
        return <Leaf className="w-3.5 h-3.5" />;
      case 'security':
        return <ShieldAlert className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex justify-end"
      dir={isAr ? 'rtl' : 'ltr'}
      onClick={onClose}
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        aria-label={isAr ? 'مركز الإشعارات' : 'Notification Center'}
        className="w-full max-w-md bg-[#f5f3ee] h-full shadow-2xl border-s border-[#D5D5D5] flex flex-col animate-thamra-in"
      >
        {/* Header */}
        <div className="px-4 py-3.5 bg-[#535C21] text-white flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#DBAE83]" />
            <h2 className="text-sm font-bold">
              {isAr ? 'مركز التنبيهات والأمان' : 'Farm & Security Notifications'}
            </h2>
            <span className="text-[11px] font-mono-tabular px-1.5 py-0.5 rounded bg-[#1C250C] text-[#DBAE83]">
              {unreadCount}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenSettings('settings');
              }}
              aria-label={isAr ? 'إعدادات الإشعارات' : 'Notification Preferences'}
              className="p-1.5 rounded-lg hover:bg-white/15 cursor-pointer"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label={isAr ? 'إغلاق' : 'Close'}
              className="p-1.5 rounded-lg hover:bg-white/15 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Category Filter Bar */}
        <div className="px-3 py-2.5 bg-white border-b border-[#D5D5D5] flex items-center gap-1 overflow-x-auto text-xs">
          {(
            [
              { id: 'all', en: 'All', ar: 'الكل' },
              { id: 'weather', en: 'Weather', ar: 'الطقس' },
              { id: 'soil_water', en: 'Soil & Water', ar: 'التربة والمياه' },
              { id: 'plant', en: 'Plant Care', ar: 'النبات' },
              { id: 'security', en: 'Security', ar: 'الأمان' },
            ] as Array<{ id: 'all' | NotificationCategory; en: string; ar: string }>
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                filter === tab.id
                  ? 'bg-[#535C21] text-white'
                  : 'bg-[#f4f2ec] text-[#1C250C] hover:bg-[#e2ead2]'
              }`}
            >
              {isAr ? tab.ar : tab.en}
            </button>
          ))}
        </div>

        {/* Action Strip */}
        {notifications.length > 0 && (
          <div className="px-4 py-2 bg-[#faf8f4] border-b border-[#D5D5D5] flex items-center justify-between text-[11px]">
            <button
              type="button"
              onClick={onMarkAllRead}
              className="inline-flex items-center gap-1 font-semibold text-[#535C21] hover:underline cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>{isAr ? 'تحديد الكل كمقروء' : 'Mark all read'}</span>
            </button>
            <button
              type="button"
              onClick={onClearAll}
              className="inline-flex items-center gap-1 font-semibold text-[#8E7D49] hover:text-red-700 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isAr ? 'مسح التنبيهات' : 'Clear all'}</span>
            </button>
          </div>
        )}

        {/* Notification Cards */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#D5D5D5] p-6 text-center space-y-2">
              <Bell className="w-6 h-6 text-[#8E7D49] mx-auto" />
              <p className="text-xs font-semibold text-[#1C250C]">
                {isAr ? 'لا توجد تنبيهات حالياً في هذا القسم' : 'No active notifications in this category'}
              </p>
              <p className="text-[11px] text-[#8E7D49]">
                {isAr
                  ? 'تعتمد تنبيهات ثمرة حصرياً على قراءات ناسا الفعلية، حساسات المياه، وجدول الرعاية وأحداث الحساب.'
                  : 'THAMRA alerts trigger strictly from live NASA readings, connected water sensors, care due dates, and real account events.'}
              </p>
            </div>
          ) : (
            filtered.map((n) => {
              const sev = getSeverityStyle(n.severity);
              return (
                <div
                  key={n.id}
                  className={`rounded-xl border p-3 text-xs space-y-2 transition-opacity ${sev.box} ${
                    n.read ? 'opacity-75' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0">
                      {sev.icon}
                      <div className="min-w-0">
                        <p className="font-bold text-[#1C250C]">
                          {isAr ? n.titleAr : n.titleEn}
                        </p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-[#535C21]">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-semibold ${sev.badge}`}>
                            {getCategoryIcon(n.category)}
                            <span>{sev.label}</span>
                          </span>
                          <span className="font-mono-tabular text-[#8E7D49]">
                            {new Date(n.timestamp).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {!n.read && (
                        <button
                          type="button"
                          onClick={() => onMarkRead(n.id)}
                          title={isAr ? 'تحديد كمقروء' : 'Mark read'}
                          className="p-1 rounded hover:bg-black/10 text-[#535C21] cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onDismiss(n.id)}
                        title={isAr ? 'إخفاء' : 'Dismiss'}
                        className="p-1 rounded hover:bg-black/10 text-[#8E7D49] cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-[#1C250C]/90 leading-relaxed">
                    {isAr ? n.detailAr : n.detailEn}
                  </p>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        onMarkRead(n.id);
                        onOpenTarget(n);
                        onClose();
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-[#D5D5D5] hover:border-[#535C21] text-[11px] font-semibold text-[#1C250C] cursor-pointer"
                    >
                      <span>{isAr ? 'عرض التفاصيل' : 'View Details'}</span>
                      <ArrowRight className={`w-3 h-3 ${isAr ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>
    </div>
  );
};
