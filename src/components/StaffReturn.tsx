import React, { useState } from 'react';
import { Lang, TRANSLATIONS } from '../utils/translations';
import { DepositRecord } from '../types';
import { syncManager } from '../utils/storage';
import { playCollectSound } from '../utils/sound';
import confetti from 'canvas-confetti';
import {
  Search,
  CheckCircle2,
  Clock,
  MapPin,
  ShieldCheck,
  X,
  Phone,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';

interface StaffReturnProps {
  lang: Lang;
  deposits: DepositRecord[];
  staffName?: string;
  onOpenReceipt: (record: DepositRecord) => void;
}

export const StaffReturn: React.FC<StaffReturnProps> = ({
  lang,
  deposits,
  staffName = 'staff001',
  onOpenReceipt,
}) => {
  const t = TRANSLATIONS[lang];
  const [query, setQuery] = useState('');
  const [filterChargingOnly, setFilterChargingOnly] = useState(true);

  // Return verification modal
  const [verifyingRecord, setVerifyingRecord] = useState<DepositRecord | null>(null);
  const [chkFace, setChkFace] = useState(false);
  const [chkToken, setChkToken] = useState(false);
  const [chkCable, setChkCable] = useState(false);
  const [returnNotes, setReturnNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const cleanQuery = query.trim().toLowerCase();

  const filteredDeposits = deposits.filter((d) => {
    if (filterChargingOnly && d.status !== 'CHARGING') return false;
    if (!cleanQuery) return true;

    const tokenNorm = String(d.token);
    const tokenPadded = d.tokenStr.toLowerCase();
    const queryNum = cleanQuery.replace(/^0+/, '');

    const tokenMatch =
      tokenPadded.includes(cleanQuery) ||
      tokenNorm === cleanQuery ||
      (queryNum !== '' && tokenNorm === queryNum);

    const mobileMatch = d.mobile.includes(cleanQuery) || d.mobile.endsWith(cleanQuery);
    const slotMatch = d.slotKey.toLowerCase().includes(cleanQuery);
    const modelMatch = (d.phoneModel || '').toLowerCase().includes(cleanQuery);

    return tokenMatch || mobileMatch || slotMatch || modelMatch;
  });

  const getElapsedTime = (isoTime: string) => {
    try {
      const diffMs = Date.now() - new Date(isoTime).getTime();
      const mins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
      if (mins < 60) return `${mins} mins`;
      const hrs = Math.floor(mins / 60);
      const remainMins = mins % 60;
      return `${hrs}h ${remainMins}m`;
    } catch {
      return 'Just now';
    }
  };

  const handleStartReturn = (record: DepositRecord) => {
    setVerifyingRecord(record);
    setChkFace(false);
    setChkToken(false);
    setChkCable(false);
    setReturnNotes('');
  };

  const handleConfirmCollect = async () => {
    if (!verifyingRecord) return;
    setLoading(true);

    try {
      const ok = await syncManager.collectDeposit(
        verifyingRecord.token,
        staffName,
        returnNotes
      );
      if (ok) {
        playCollectSound();
        try {
          confetti({
            particleCount: 40,
            spread: 55,
            origin: { y: 0.6 },
          });
        } catch {
          // ignore
        }
        setVerifyingRecord(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const canConfirm = chkFace && chkToken && chkCable;

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              {t.searchTitle}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {lang === 'ml'
              ? 'ടോക്കൺ, മൊബൈൽ നമ്പർ അല്ലെങ്കിൽ സ്ലോട്ട് നൽകി തിരഞ്ഞ് വെരിഫിക്കേഷൻ നടത്തി ഫോൺ നൽകുക.'
              : 'Search active deposits by token, mobile number or slot to verify and return safely.'}
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <input
              type="checkbox"
              checked={filterChargingOnly}
              onChange={(e) => setFilterChargingOnly(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="font-semibold text-slate-700">
              {lang === 'ml' ? 'ചാർജ്ജിംഗ് ഉള്ളവ മാത്രം' : 'Active Charging Only'}
            </span>
          </label>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.searchPlaceholder}
          className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition shadow-sm"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-semibold p-1"
          >
            Clear
          </button>
        )}
      </div>

      {/* Results List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span>{lang === 'ml' ? 'ഫലങ്ങൾ' : 'Showing'} {filteredDeposits.length} record(s)</span>
          {filterChargingOnly && (
            <span className="text-emerald-600 font-semibold">
              ● {deposits.filter((d) => d.status === 'CHARGING').length} Active in Charging Slots
            </span>
          )}
        </div>

        {filteredDeposits.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-500 space-y-2">
            <Search className="w-8 h-8 mx-auto text-slate-400" />
            <p className="text-xs font-semibold">
              {lang === 'ml' ? 'ചാർജ്ജിംഗ് വിവരങ്ങൾ ഒന്നും കണ്ടെത്തിയില്ല' : 'No matching deposits found.'}
            </p>
            <p className="text-[11px] text-slate-400">
              {lang === 'ml' ? 'ടോക്കൺ നമ്പറോ 10 അക്ക മൊബൈൽ നമ്പറോ പരിശോധിക്കുക.' : 'Try searching by token (e.g. 00001) or 10-digit mobile number.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredDeposits.map((item) => {
              const isCharging = item.status === 'CHARGING';
              return (
                <div
                  key={item.token}
                  className={`p-4 rounded-2xl border transition flex flex-col justify-between ${
                    isCharging
                      ? 'bg-white border-blue-200 shadow-sm hover:border-blue-300'
                      : 'bg-slate-50 border-slate-200 opacity-80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center font-black ${
                          isCharging
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-slate-300 text-slate-700'
                        }`}
                      >
                        <span className="text-[10px] uppercase font-bold opacity-80">TOKEN</span>
                        <span className="text-base font-mono leading-none">
                          {item.tokenStr.slice(-3)}
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-slate-900">
                            #{item.tokenStr}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isCharging
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isCharging ? t.statusCharging : t.statusCollected}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-slate-600 mt-0.5">
                          {item.phoneModel || 'Smartphone'} ({item.cableType || 'Type-C'})
                        </p>
                      </div>
                    </div>

                    {/* Customer Photo */}
                    {item.photo ? (
                      <img
                        src={item.photo}
                        alt="Customer Photo"
                        className="w-14 h-14 rounded-xl object-cover border border-slate-200 bg-slate-100 shrink-0 shadow-sm"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl border border-dashed border-slate-300 bg-slate-100 flex items-center justify-center text-slate-400 text-[10px] text-center p-1 shrink-0">
                        No Photo
                      </div>
                    )}
                  </div>

                  {/* Metadata strip */}
                  <div className="bg-slate-50 rounded-xl p-2.5 text-xs text-slate-600 space-y-1.5 border border-slate-100 mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-blue-600" />
                        <span>Slot:</span>
                      </span>
                      <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {item.box} - {item.socket}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Mobile:</span>
                      </span>
                      <span className="font-mono text-slate-800 font-semibold">
                        {item.mobile}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>Deposited:</span>
                      </span>
                      <span className="font-medium text-slate-700">
                        {item.formattedTime} ({getElapsedTime(item.time)})
                      </span>
                    </div>

                    {item.notes && (
                      <p className="text-[11px] text-slate-500 italic truncate pt-1 border-t border-slate-200/60">
                        Note: {item.notes}
                      </p>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    {isCharging ? (
                      <button
                        onClick={() => handleStartReturn(item)}
                        className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>{t.verifyReturnBtn}</span>
                      </button>
                    ) : (
                      <div className="flex-1 py-1.5 px-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-medium flex items-center justify-between border border-emerald-200">
                        <span>Collected at {item.collectedAt || 'Recently'}</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      </div>
                    )}

                    <button
                      onClick={() => onOpenReceipt(item)}
                      className="py-2 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition"
                      title="View / Print Receipt"
                    >
                      Slip
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Return & Verification Modal */}
      {verifyingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-blue-600 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-6 h-6" />
                <div>
                  <h3 className="text-base font-bold">{t.returnConfirmTitle}</h3>
                  <p className="text-xs text-blue-100">
                    Token #{verifyingRecord.tokenStr} · Slot {verifyingRecord.box}-{verifyingRecord.socket}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setVerifyingRecord(null)}
                className="text-blue-200 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Photo & Comparison */}
              <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                {verifyingRecord.photo ? (
                  <img
                    src={verifyingRecord.photo}
                    alt="Customer Verification"
                    className="w-24 h-24 rounded-2xl object-cover border-2 border-white shadow-md bg-slate-200 shrink-0"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-2xl bg-slate-200 border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-500 text-xs text-center p-2 shrink-0">
                    No Photo Recorded
                  </div>
                )}

                <div className="space-y-1 text-xs">
                  <div className="font-bold text-slate-900 text-sm">
                    {verifyingRecord.phoneModel || 'Smartphone'}
                  </div>
                  <p className="text-slate-600">
                    <span className="text-slate-400">Mobile: </span>
                    <span className="font-mono font-bold text-slate-800">
                      {verifyingRecord.mobile}
                    </span>
                  </p>
                  <p className="text-slate-600">
                    <span className="text-slate-400">Deposited: </span>
                    <span>{verifyingRecord.formattedTime}</span>
                  </p>
                  <p className="text-slate-600">
                    <span className="text-slate-400">Duration: </span>
                    <span className="font-bold text-blue-700">
                      {getElapsedTime(verifyingRecord.time)}
                    </span>
                  </p>
                </div>
              </div>

              {/* Safety Checklist */}
              <div className="space-y-2.5">
                <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  {lang === 'ml' ? 'സുരക്ഷാ പരിശോധന (എല്ലാം ടിക്ക് ചെയ്യുക)' : 'Security Verification (Check all before handover)'}
                </p>

                <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer border border-slate-200 transition">
                  <input
                    type="checkbox"
                    checked={chkFace}
                    onChange={(e) => setChkFace(e.target.checked)}
                    className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <span className="text-xs font-medium text-slate-700">
                    {t.checklistFace}
                  </span>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer border border-slate-200 transition">
                  <input
                    type="checkbox"
                    checked={chkToken}
                    onChange={(e) => setChkToken(e.target.checked)}
                    className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <span className="text-xs font-medium text-slate-700">
                    {t.checklistToken} (Token #{verifyingRecord.tokenStr})
                  </span>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer border border-slate-200 transition">
                  <input
                    type="checkbox"
                    checked={chkCable}
                    onChange={(e) => setChkCable(e.target.checked)}
                    className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <span className="text-xs font-medium text-slate-700">
                    {t.checklistCable} ({verifyingRecord.box}-{verifyingRecord.socket})
                  </span>
                </label>
              </div>

              {/* Return Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {lang === 'ml' ? 'റിട്ടേൺ റിമാർക്കുകൾ (ഓപ്ഷണൽ)' : 'Handover Remarks (Optional)'}
                </label>
                <input
                  type="text"
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  placeholder="ID verified / Customer acknowledged"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setVerifyingRecord(null)}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition"
                >
                  {t.cancel}
                </button>

                <button
                  type="button"
                  onClick={handleConfirmCollect}
                  disabled={!canConfirm || loading}
                  className={`flex-1 py-2.5 px-4 font-bold rounded-xl text-xs text-white shadow-md transition flex items-center justify-center gap-1.5 ${
                    canConfirm && !loading
                      ? 'bg-blue-600 hover:bg-blue-700 active:scale-95'
                      : 'bg-slate-300 cursor-not-allowed'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t.confirmCollectAction}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
