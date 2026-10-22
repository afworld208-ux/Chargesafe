import React, { useState, useEffect } from 'react';
import { Lang, TRANSLATIONS } from './utils/translations';
import { UserRole, DepositRecord, AuditLogItem } from './types';
import { syncManager } from './utils/storage';
import { Header } from './components/Header';
import { CustomerPortal } from './components/CustomerPortal';
import { StaffDeposit } from './components/StaffDeposit';
import { StaffReturn } from './components/StaffReturn';
import { SlotVisualizer } from './components/SlotVisualizer';
import { AdminMobileDashboard } from './components/AdminMobileDashboard';
import { LoginModal } from './components/LoginModal';
import { PrintReceiptModal } from './components/PrintReceiptModal';
import { Zap, Shield, Smartphone, UserCheck, Download, CheckCircle2, ArrowRight } from 'lucide-react';

export default function App() {
  const [lang, setLang] = useState<Lang>('ml'); // Default to Malayalam as requested by user, with 1-click toggle to EN
  const [activeTab, setActiveTab] = useState<'customer' | 'staff' | 'slots' | 'admin'>('customer');
  const [activeRole, setActiveRole] = useState<UserRole>('customer');
  const [currentUser, setCurrentUser] = useState<string>('AF World');
  const [userEmail, setUserEmail] = useState<string>('afworld208@gmail.com');
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(true);

  // Live state synchronized with Cloud server & LocalStorage
  const [deposits, setDeposits] = useState<DepositRecord[]>([]);
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [isCloudLive, setIsCloudLive] = useState(false);

  // Modals & Navigation state
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<DepositRecord | null>(null);
  const [staffSubTab, setStaffSubTab] = useState<'deposit' | 'return'>('deposit');
  const [preselectedSlot, setPreselectedSlot] = useState<{ box: string; socket: string } | null>(null);

  // Subscribe to real-time Cloud SSE sync & local storage
  useEffect(() => {
    const unsubscribe = syncManager.subscribe((data) => {
      setDeposits(data.deposits);
      setLogs(data.logs);
      setIsCloudLive(data.isCloudLive);
    });
    return unsubscribe;
  }, []);

  const t = TRANSLATIONS[lang];
  const occupiedCount = deposits.filter((d) => d.status === 'CHARGING').length;

  const handleToggleLang = () => {
    setLang((prev) => (prev === 'en' ? 'ml' : 'en'));
  };

  const handleLoginSuccess = (role: UserRole, username: string, email?: string, isSuper?: boolean) => {
    setActiveRole(role);
    setCurrentUser(username);
    if (email) setUserEmail(email);
    setIsSuperAdmin(isSuper ?? true);
    if (role === 'admin') setActiveTab('admin');
    else if (role === 'staff') setActiveTab('staff');
    else setActiveTab('customer');
  };

  const handleSelectTab = (tab: string) => {
    const selected = tab as 'customer' | 'staff' | 'slots' | 'admin';
    setActiveTab(selected);
    if (selected === 'admin') {
      setActiveRole('admin');
      setIsSuperAdmin(true);
    } else if (selected === 'staff') {
      setActiveRole('staff');
    } else if (selected === 'customer') {
      setActiveRole('customer');
    }
  };

  const handleSlotClickedFree = (box: string, socket: string) => {
    setPreselectedSlot({ box, socket });
    setActiveTab('staff');
    setStaffSubTab('deposit');
  };

  const handleSlotClickedOccupied = (record: DepositRecord) => {
    setActiveTab('staff');
    setStaffSubTab('return');
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Header */}
      <Header
        lang={lang}
        onToggleLang={handleToggleLang}
        activeRole={activeRole}
        onChangeRole={(role) => setActiveRole(role)}
        isCloudLive={isCloudLive}
        totalSlots={800}
        occupiedSlots={occupiedCount}
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        userEmail={userEmail}
        isSuperAdmin={isSuperAdmin}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* Customer Portal */}
        {activeTab === 'customer' && (
          <CustomerPortal
            lang={lang}
            deposits={deposits}
            onOpenReceipt={(rec) => setActiveReceipt(rec)}
          />
        )}

        {/* Staff Operations Desk */}
        {activeTab === 'staff' && (
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Staff Sub-Tabs */}
            <div className="flex items-center justify-between bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setStaffSubTab('deposit')}
                  className={`py-2 px-4 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    staffSubTab === 'deposit'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{t.staffDepositTitle}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStaffSubTab('return')}
                  className={`py-2 px-4 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    staffSubTab === 'return'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>{t.searchTitle}</span>
                </button>
              </div>

              <div className="text-xs text-slate-500 hidden sm:flex items-center gap-2 pr-2">
                <span>Staff: <strong className="text-slate-800">{currentUser}</strong></span>
              </div>
            </div>

            {staffSubTab === 'deposit' ? (
              <StaffDeposit
                lang={lang}
                deposits={deposits}
                onDepositComplete={(rec) => setActiveReceipt(rec)}
                staffName={currentUser}
                preselectedSlot={preselectedSlot}
                onClearPreselectedSlot={() => setPreselectedSlot(null)}
              />
            ) : (
              <StaffReturn
                lang={lang}
                deposits={deposits}
                staffName={currentUser}
                onOpenReceipt={(rec) => setActiveReceipt(rec)}
              />
            )}
          </div>
        )}

        {/* 800 Slots Matrix Visualizer */}
        {activeTab === 'slots' && (
          <SlotVisualizer
            lang={lang}
            deposits={deposits}
            onSelectFreeSlot={handleSlotClickedFree}
            onSelectOccupiedDeposit={handleSlotClickedOccupied}
          />
        )}

        {/* Admin Mobile Live Control Center */}
        {activeTab === 'admin' && (
          <AdminMobileDashboard
            lang={lang}
            deposits={deposits}
            logs={logs}
            isCloudLive={isCloudLive}
            onOpenReturnModal={(rec) => {
              setActiveTab('staff');
              setStaffSubTab('return');
            }}
            adminName={currentUser}
            userEmail={userEmail}
            isSuperAdmin={isSuperAdmin}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-6 px-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">ChargeSafe</span>
            <span>·</span>
            <span>800 Phone Charging Station Infrastructure</span>
            <span>·</span>
            <span className="text-emerald-600 font-semibold">
              {isCloudLive ? '● Live Online Server' : '○ Offline Cache'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/chargesafe-project.zip"
              download="chargesafe-project.zip"
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition font-medium"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Download Project ZIP</span>
            </a>
            <span>Demo: staff001 / 1234 · admin / ChangeMe123!</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        lang={lang}
        currentRole={activeRole}
        onLoginSuccess={handleLoginSuccess}
      />

      <PrintReceiptModal
        record={activeReceipt}
        onClose={() => setActiveReceipt(null)}
        lang={lang}
      />
    </div>
  );
}
