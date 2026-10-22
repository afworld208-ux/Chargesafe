import React, { useState } from 'react';
import { Lang, TRANSLATIONS } from '../utils/translations';
import { DepositRecord, AuditLogItem } from '../types';
import { syncManager } from '../utils/storage';
import { generateQRCodeSVG } from '../utils/qr';
import {
  Shield,
  Smartphone,
  PhoneCall,
  Wifi,
  Clock,
  Download,
  Upload,
  RotateCcw,
  AlertTriangle,
  Zap,
  CheckCircle2,
  Share2,
  FileText,
  Search,
  ExternalLink
} from 'lucide-react';

interface AdminMobileDashboardProps {
  lang: Lang;
  deposits: DepositRecord[];
  logs: AuditLogItem[];
  isCloudLive: boolean;
  onOpenReturnModal: (record: DepositRecord) => void;
  adminName?: string;
  userEmail?: string;
  isSuperAdmin?: boolean;
}

export const AdminMobileDashboard: React.FC<AdminMobileDashboardProps> = ({
  lang,
  deposits,
  logs,
  isCloudLive,
  onOpenReturnModal,
  adminName = 'admin',
  userEmail = 'afworld208@gmail.com',
  isSuperAdmin = true,
}) => {
  const t = TRANSLATIONS[lang];
  const [deviceSearch, setDeviceSearch] = useState('');
  const [showQrModal, setShowQrModal] = useState(false);
  const [vacateConfirmToken, setVacateConfirmToken] = useState<DepositRecord | null>(null);
  const [vacateReason, setVacateReason] = useState('');
  const [emailAlertsActive, setEmailAlertsActive] = useState(true);
  const [isLockdown, setIsLockdown] = useState(false);
  const [staffPass, setStaffPass] = useState('1234');
  const [showPassSaved, setShowPassSaved] = useState(false);

  const activeCharging = deposits.filter((d) => d.status === 'CHARGING');
  const collectedCount = deposits.filter((d) => d.status === 'COLLECTED').length;
  const occupiedCount = activeCharging.length;
  const availableCount = 800 - occupiedCount;
  const occupancyPercent = Math.round((occupiedCount / 800) * 100);

  const filteredCharging = activeCharging.filter((d) => {
    if (!deviceSearch.trim()) return true;
    const q = deviceSearch.toLowerCase().trim();
    return (
      d.tokenStr.includes(q) ||
      d.mobile.includes(q) ||
      d.slotKey.toLowerCase().includes(q) ||
      (d.phoneModel || '').toLowerCase().includes(q)
    );
  });

  const getElapsedTime = (isoTime: string) => {
    try {
      const diffMs = Date.now() - new Date(isoTime).getTime();
      const mins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
      if (mins < 60) return `${mins}m`;
      const hrs = Math.floor(mins / 60);
      return `${hrs}h ${mins % 60}m`;
    } catch {
      return 'Just now';
    }
  };

  const handleVacateSlot = async () => {
    if (!vacateConfirmToken) return;
    await syncManager.vacateSlot(vacateConfirmToken.token, adminName, vacateReason || 'Admin remote vacate');
    setVacateConfirmToken(null);
    setVacateReason('');
  };

  const handleExportBackup = () => {
    syncManager.exportBackup();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async () => {
        if (typeof reader.result === 'string') {
          const res = await syncManager.importBackup(reader.result);
          if (res.success) {
            alert(lang === 'ml' ? `വിജയകരമായി ${res.count} വിവരങ്ങൾ റീസ്റ്റോർ ചെയ്തു!` : `Successfully imported ${res.count} deposits!`);
          } else {
            alert(`Import error: ${res.error}`);
          }
        }
      };
      reader.readAsText(file);
    }
  };

  const handleReset = async () => {
    if (confirm(lang === 'ml' ? 'ഡെമോ ഡാറ്റ റീസെറ്റ് ചെയ്യണോ?' : 'Reset system data to demo state?')) {
      await syncManager.resetDemo();
    }
  };

  const appUrl = typeof window !== 'undefined' ? window.location.href : 'https://chargesafe.local';
  const qrSvg = generateQRCodeSVG(appUrl, 180);

  const generateEmailReport = () => {
    const subject = encodeURIComponent(`[ChargeSafe 800] Live Station Shift Report - ${new Date().toLocaleDateString()}`);
    const activeList = activeCharging.map(d => `• Token #${d.tokenStr} | Slot: ${d.slotKey} | Mobile: ${d.mobile} | Model: ${d.phoneModel || 'Phone'}`).join('\n');
    const body = encodeURIComponent(`ChargeSafe 800 Phone Charging Station Report
Date: ${new Date().toLocaleString()}
Database: ai-studio-chargesafephonec-ec1a703a-4ded-4757-85f1-8d106dead50e
Owner / Super Admin: ${userEmail}

SUMMARY:
---------------------------------------------
Total Station Capacity: 800 Slots
Currently Charging: ${occupiedCount} Devices
Available Free Slots: ${availableCount} Slots
Collected Devices Today: ${collectedCount}
Current Occupancy Rate: ${occupancyPercent}%

ACTIVE CHARGING DEVICES (${activeCharging.length}):
---------------------------------------------
${activeList || 'No devices currently charging.'}

---------------------------------------------
Report generated automatically by ChargeSafe Mobile Admin.`);

    window.open(`mailto:${userEmail}?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Super Admin Total Control Card */}
      <div className="bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-indigo-500/10 border-2 border-amber-400/50 rounded-3xl p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold text-lg shadow-md shrink-0">
              👑
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                  Total Control Active
                </span>
                <span className="text-xs text-slate-500 font-semibold">Master Owner</span>
              </div>
              <h3 className="text-base font-black text-slate-900 font-mono mt-0.5">
                {userEmail}
              </h3>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Direct Email Shift Report Button */}
            <button
              type="button"
              onClick={generateEmailReport}
              className="py-2 px-3.5 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white font-bold rounded-xl text-xs transition shadow-sm flex items-center gap-1.5"
            >
              <span>📧 Send Shift Report to My Email</span>
            </button>
          </div>
        </div>

        {/* Super Admin Quick Settings & Security Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-200 text-xs">
          <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Email Alerts</span>
              <span className="font-semibold text-slate-800">{emailAlertsActive ? 'Active to ' + userEmail.slice(0, 10) + '...' : 'Disabled'}</span>
            </div>
            <button
              type="button"
              onClick={() => setEmailAlertsActive(!emailAlertsActive)}
              className={`px-2 py-1 rounded text-[10px] font-bold ${emailAlertsActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}
            >
              {emailAlertsActive ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Staff Password</span>
              <input
                type="text"
                value={staffPass}
                onChange={(e) => {
                  setStaffPass(e.target.value);
                  setShowPassSaved(true);
                  setTimeout(() => setShowPassSaved(false), 2000);
                }}
                className="font-mono font-bold text-slate-900 w-16 text-xs bg-slate-50 px-1 py-0.5 rounded border border-slate-200"
              />
            </div>
            <span className="text-[10px] text-emerald-600 font-semibold">
              {showPassSaved ? 'Saved!' : 'Editable'}
            </span>
          </div>

          <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Emergency Lockdown</span>
              <span className="font-semibold text-slate-800">{isLockdown ? 'LOCKED' : 'Open'}</span>
            </div>
            <button
              type="button"
              onClick={() => setIsLockdown(!isLockdown)}
              className={`px-2 py-1 rounded text-[10px] font-bold ${isLockdown ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-700'}`}
            >
              {isLockdown ? 'UNLOCK' : 'LOCK'}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile-Optimized Admin Header Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-7 shadow-xl border border-purple-800/40 relative overflow-hidden">
        <div className="relative z-10 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold border border-purple-500/30">
              <Shield className="w-3.5 h-3.5" />
              <span>Admin Mobile Control</span>
            </div>

            {/* Live Connection Heartbeat */}
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>{isCloudLive ? 'Cloud Internet Live' : 'Offline Mode'}</span>
              </span>

              <button
                type="button"
                onClick={() => setShowQrModal(true)}
                className="px-2.5 py-1 bg-purple-800/80 hover:bg-purple-700 text-purple-200 rounded-lg text-xs font-semibold flex items-center gap-1 border border-purple-700 transition"
                title="Open on Admin Phone"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Phone QR</span>
              </button>
            </div>
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            {t.adminTitle}
          </h2>
          <p className="text-xs sm:text-sm text-purple-200/80 max-w-xl leading-relaxed">
            {t.adminSub}
          </p>
        </div>
      </div>

      {/* 4 Key Live Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            {t.statTotal}
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900">800</span>
            <span className="text-xs text-slate-400">Slots</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-sm bg-gradient-to-br from-amber-50/50 to-white">
          <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block mb-1 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
            <span>{t.statOccupied}</span>
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-600">{occupiedCount}</span>
            <span className="text-xs font-semibold text-amber-700">{occupancyPercent}%</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-sm bg-gradient-to-br from-emerald-50/50 to-white">
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block mb-1">
            {t.statAvailable}
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-600">{availableCount}</span>
            <span className="text-xs text-emerald-600 font-semibold">Free</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-sm bg-gradient-to-br from-blue-50/50 to-white">
          <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block mb-1">
            {t.statCollected}
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-blue-600">{collectedCount}</span>
            <span className="text-xs text-blue-600 font-semibold">Cleared</span>
          </div>
        </div>
      </div>

      {/* Real-time Currently Charging Phone Feed (Designed for Phone Screen) */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-purple-600" />
              <span>{t.adminDevicesTitle} ({activeCharging.length})</span>
            </h3>
            <p className="text-xs text-slate-500">
              {lang === 'ml'
                ? 'നിലവിൽ ചാർജ്ജറിലുള്ള എല്ലാ ഫോണുകളുടെയും വിവരങ്ങളും ഫോട്ടോയും'
                : 'Live list of all phones currently in charging slots with photo & call action'}
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={deviceSearch}
              onChange={(e) => setDeviceSearch(e.target.value)}
              placeholder="Filter by token, phone or slot"
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        {filteredCharging.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-500 text-xs">
            {activeCharging.length === 0
              ? (lang === 'ml' ? 'നിലവിൽ ചാർജ്ജിംഗിൽ ഫോണുകൾ ഒന്നും ഇല്ല. എല്ലാ സ്ലോട്ടുകളും ഫ്രീയാണ്!' : 'No phones currently charging. All 800 slots are free!')
              : 'No charging phones match your filter.'}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCharging.map((item) => (
              <div
                key={item.token}
                className="p-3.5 sm:p-4 rounded-2xl border border-slate-200 bg-white hover:border-purple-300 transition shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  {/* Photo Thumbnail */}
                  {item.photo ? (
                    <img
                      src={item.photo}
                      alt="Device photo"
                      className="w-14 h-14 rounded-xl object-cover border border-slate-200 bg-slate-100 shrink-0 shadow-xs"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-[10px] text-center p-1 shrink-0">
                      No Photo
                    </div>
                  )}

                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-black text-slate-900">
                        #{item.tokenStr}
                      </span>
                      <span className="font-mono text-xs font-bold px-2 py-0.5 bg-purple-100 text-purple-900 rounded-md">
                        {item.box} - {item.socket}
                      </span>
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-semibold border border-emerald-200">
                        {item.cableType || 'Type-C'}
                      </span>
                    </div>

                    <p className="text-xs font-medium text-slate-700">
                      {item.phoneModel || 'Smartphone'}
                    </p>

                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <span>Deposited: {item.formattedTime}</span>
                      <span>·</span>
                      <span className="font-bold text-amber-700 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{getElapsedTime(item.time)}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Mobile Quick Action Buttons */}
                <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  {/* Call Customer directly from admin phone */}
                  <a
                    href={`tel:${item.mobile}`}
                    className="flex-1 sm:flex-none py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border border-emerald-200"
                    title="Call Customer"
                  >
                    <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{item.mobile.slice(-4)}</span>
                  </a>

                  {/* Return / Collect modal trigger */}
                  <button
                    type="button"
                    onClick={() => onOpenReturnModal(item)}
                    className="flex-1 sm:flex-none py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Return</span>
                  </button>

                  {/* Force Vacate button for Admin */}
                  <button
                    type="button"
                    onClick={() => setVacateConfirmToken(item)}
                    className="py-1.5 px-2 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-700 rounded-xl text-xs transition border border-slate-200"
                    title="Force Vacate Slot"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Admin Quick Tools (Backup, Restore, Reset) */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
          {lang === 'ml' ? 'സിസ്റ്റം ഡാറ്റ & ബാക്കപ്പ് മാനേജ്മെന്റ്' : 'System Data & Cloud Backups'}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={handleExportBackup}
            className="py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>{t.backupExport}</span>
          </button>

          <label className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer border border-slate-200 text-center">
            <Upload className="w-4 h-4 text-blue-600" />
            <span>{t.backupImport}</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={handleReset}
            className="py-3 px-4 bg-red-50 hover:bg-red-100 text-red-700 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 border border-red-200"
          >
            <RotateCcw className="w-4 h-4 text-red-600" />
            <span>{t.resetDemo}</span>
          </button>
        </div>
      </div>

      {/* System Audit Logs */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-500" />
            <span>{t.adminAuditLogs}</span>
          </h3>
          <span className="text-xs text-slate-500">{logs.length} logged events</span>
        </div>

        <div className="max-h-60 overflow-y-auto space-y-2 pr-1 text-xs">
          {logs.map((log) => (
            <div
              key={log.id}
              className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start justify-between gap-2"
            >
              <div>
                <span className="font-bold text-slate-800 mr-2">[{log.action}]</span>
                <span className="text-slate-600">{log.details}</span>
                <div className="text-[10px] text-slate-400 mt-0.5">By {log.performedBy}</div>
              </div>
              <span className="text-[10px] text-slate-400 whitespace-nowrap shrink-0">
                {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Force Vacate Confirmation Modal */}
      {vacateConfirmToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h4 className="text-base font-bold text-slate-900">
                Force Vacate Slot {vacateConfirmToken.box}-{vacateConfirmToken.socket}?
              </h4>
              <p className="text-xs text-slate-500">
                Token #{vacateConfirmToken.tokenStr} (Mobile: {vacateConfirmToken.mobile}). This will free the charging socket immediately.
              </p>
            </div>

            <input
              type="text"
              value={vacateReason}
              onChange={(e) => setVacateReason(e.target.value)}
              placeholder="Reason (e.g. Unclaimed device moved to safe locker)"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
            />

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setVacateConfirmToken(null)}
                className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleVacateSlot}
                className="flex-1 py-2 px-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold"
              >
                Confirm Vacate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal for Admin Phone Sharing */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 text-center space-y-4 animate-in fade-in zoom-in-95">
            <div className="space-y-1">
              <h4 className="text-base font-bold text-slate-900">
                {lang === 'ml' ? 'അഡ്മിൻ മൊബൈലിൽ തുറക്കുക' : 'Open on Admin Mobile Phone'}
              </h4>
              <p className="text-xs text-slate-500">
                {lang === 'ml'
                  ? 'നിങ്ങളുടെ മൊബൈൽ ക്യാമറ ഉപയോഗിച്ച് ഈ QR കോഡ് സ്കാൻ ചെയ്യുക.'
                  : 'Scan with your mobile camera to monitor all 800 slots remotely in real-time.'}
              </p>
            </div>

            <div
              className="p-3 bg-white border border-slate-200 rounded-2xl shadow-inner inline-block"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />

            <div className="text-[11px] font-mono text-slate-500 break-all bg-slate-50 p-2 rounded-xl border border-slate-200">
              {appUrl}
            </div>

            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
