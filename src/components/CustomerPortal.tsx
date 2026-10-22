import React, { useState } from 'react';
import { Lang, TRANSLATIONS } from '../utils/translations';
import { DepositRecord } from '../types';
import { Smartphone, Search, Zap, Clock, MapPin, CheckCircle2, ShieldCheck, QrCode, PhoneCall } from 'lucide-react';

interface CustomerPortalProps {
  lang: Lang;
  deposits: DepositRecord[];
  onOpenReceipt: (record: DepositRecord) => void;
}

export const CustomerPortal: React.FC<CustomerPortalProps> = ({
  lang,
  deposits,
  onOpenReceipt,
}) => {
  const t = TRANSLATIONS[lang];
  const [query, setQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const cleanQuery = query.trim().toLowerCase();

  // Match by 10-digit mobile, last 4 digits, or token (pad to 5 or exact)
  const matchedRecords = deposits.filter((d) => {
    if (!cleanQuery) return false;
    const tokenNorm = String(d.token);
    const tokenPadded = d.tokenStr.toLowerCase();
    const queryNum = cleanQuery.replace(/^0+/, '');

    const tokenMatch =
      tokenPadded.includes(cleanQuery) ||
      tokenNorm === cleanQuery ||
      (queryNum !== '' && tokenNorm === queryNum);

    const mobileMatch =
      d.mobile.includes(cleanQuery) ||
      d.mobile.endsWith(cleanQuery);

    const slotMatch = d.slotKey.toLowerCase().includes(cleanQuery);

    return tokenMatch || mobileMatch || slotMatch;
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setHasSearched(true);
  };

  const getElapsedTime = (isoTime: string) => {
    try {
      const diffMs = Date.now() - new Date(isoTime).getTime();
      const mins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
      if (mins < 60) return `${mins} min`;
      const hrs = Math.floor(mins / 60);
      const remainMins = mins % 60;
      return `${hrs}h ${remainMins}m`;
    } catch {
      return 'Just now';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Banner Card */}
      <div className="bg-gradient-to-r from-emerald-900 to-teal-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-emerald-800/60 relative overflow-hidden">
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold mb-3 border border-emerald-500/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>ChargeSafe Customer Hub</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
            {t.custTitle}
          </h2>
          <p className="text-emerald-100/80 text-sm leading-relaxed mb-6">
            {t.custSub}
          </p>

          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (!hasSearched) setHasSearched(true);
                }}
                placeholder={lang === 'ml' ? 'ടോക്കൺ (00001) അല്ലെങ്കിൽ 10 അക്ക മൊബൈൽ' : 'Enter Token (00001) or 10-digit mobile'}
                className="w-full pl-11 pr-4 py-3 bg-white text-slate-900 rounded-2xl text-sm font-medium placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-400 shadow-lg"
              />
            </div>
            <button
              type="submit"
              className="py-3 px-6 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl text-sm transition shadow-lg shrink-0 flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4 stroke-[2.5]" />
              <span>{t.custCheckBtn}</span>
            </button>
          </form>

          {/* Quick Demo Pill Helper */}
          <div className="flex items-center gap-2 mt-4 text-xs text-emerald-200/90 flex-wrap">
            <span>{lang === 'ml' ? 'ഉദാഹരണങ്ങൾ:' : 'Quick try:'}</span>
            <button
              type="button"
              onClick={() => { setQuery('00001'); setHasSearched(true); }}
              className="px-2 py-0.5 rounded bg-emerald-800/80 hover:bg-emerald-700 underline text-emerald-200"
            >
              Token 00001
            </button>
            <button
              type="button"
              onClick={() => { setQuery('9876543210'); setHasSearched(true); }}
              className="px-2 py-0.5 rounded bg-emerald-800/80 hover:bg-emerald-700 underline text-emerald-200"
            >
              9876543210
            </button>
          </div>
        </div>

        {/* Decorative background circle */}
        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Results Section */}
      {hasSearched && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">
              {lang === 'ml' ? 'കണ്ടെത്തിയ വിവരങ്ങൾ' : 'Lookup Results'} ({matchedRecords.length})
            </h3>
            {matchedRecords.length > 0 && (
              <span className="text-xs text-slate-500">
                {lang === 'ml' ? 'നിങ്ങളുടെ ടോക്കൺ സുരക്ഷിതമായി സൂക്ഷിക്കുക' : 'Keep your token safe for collection'}
              </span>
            )}
          </div>

          {matchedRecords.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-sm space-y-3">
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">
                {lang === 'ml' ? 'വിവരങ്ങൾ ഒന്നും കണ്ടെത്തിയില്ല' : 'No Record Found'}
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {t.custNotFound}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {matchedRecords.map((record) => {
                const isCharging = record.status === 'CHARGING';
                return (
                  <div
                    key={record.token}
                    className={`bg-white rounded-2xl p-5 border shadow-sm transition hover:shadow-md ${
                      isCharging ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg ${
                            isCharging
                              ? 'bg-emerald-500 text-slate-950 shadow-sm'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {record.tokenStr.slice(-3)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-bold text-slate-900">
                              #{record.tokenStr}
                            </span>
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                isCharging
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {isCharging ? (
                                <>
                                  <Zap className="w-3 h-3 text-emerald-600 animate-pulse" />
                                  <span>{t.statusCharging}</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-3 h-3 text-slate-500" />
                                  <span>{t.statusCollected}</span>
                                </>
                              )}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">
                            {record.phoneModel || 'Smartphone'}
                          </p>
                        </div>
                      </div>

                      {/* Photo preview thumbnail */}
                      {record.photo ? (
                        <img
                          src={record.photo}
                          alt="Customer verification photo"
                          className="w-14 h-14 rounded-xl object-cover border border-slate-200 bg-slate-100"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-400 text-[10px] text-center p-1">
                          No Photo
                        </div>
                      )}
                    </div>

                    {/* Metadata details */}
                    <div className="bg-slate-50 rounded-xl p-3 space-y-2 text-xs border border-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{t.custSlotLabel}:</span>
                        </span>
                        <span className="font-bold text-slate-900 font-mono text-sm bg-white px-2 py-0.5 rounded border border-slate-200">
                          {record.box} · {record.socket}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-blue-600" />
                          <span>{t.custTimeLabel}:</span>
                        </span>
                        <span className="font-medium text-slate-800">
                          {record.formattedTime}
                        </span>
                      </div>

                      {isCharging && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5 text-amber-500" />
                            <span>{t.custElapsedLabel}:</span>
                          </span>
                          <span className="font-bold text-emerald-700">
                            {getElapsedTime(record.time)}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Mobile:</span>
                        <span className="font-mono text-slate-700 font-medium">
                          ******{record.mobile.slice(-4)}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => onOpenReceipt(record)}
                        className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-sm"
                      >
                        <QrCode className="w-4 h-4 text-emerald-400" />
                        <span>{t.custShowPassBtn}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Instructions & Help */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-emerald-600" />
          <span>{lang === 'ml' ? 'ഫോൺ തിരികെ വാങ്ങുമ്പോൾ ശ്രദ്ധിക്കുക' : 'How to Collect Your Deposited Phone'}</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="font-bold text-slate-800 mb-1">1. {lang === 'ml' ? 'ടോക്കൺ കാണിക്കുക' : 'Show Token / Slip'}</div>
            <p>{lang === 'ml' ? 'കൗണ്ടറിലെ സ്റ്റാഫിന് നിങ്ങളുടെ ടോക്കൺ നമ്പറോ ഡിജിറ്റൽ പാസ്സോ കാണിക്കുക.' : 'Present your 5-digit token number or digital QR pass to the counter staff.'}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="font-bold text-slate-800 mb-1">2. {lang === 'ml' ? 'ഫോട്ടോ പരിശോധന' : 'Face Verification'}</div>
            <p>{lang === 'ml' ? 'ഡിപ്പോസിറ്റ് സമയത്തെടുത്ത ഫോട്ടോ ഒത്തുനോക്കി സുരക്ഷിതത്വം ഉറപ്പുവരുത്തുന്നു.' : 'Staff verifies your face against the secure photo taken during deposit.'}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="font-bold text-slate-800 mb-1">3. {lang === 'ml' ? 'ഫോൺ സ്വീകരിക്കുക' : 'Collect Device'}</div>
            <p>{lang === 'ml' ? 'ചാർജ്ജർ വിച്ഛേദിച്ച് നിങ്ങളുടെ ഫോൺ സുരക്ഷിതമായി കൈപ്പറ്റുക.' : 'Safely collect your charged device from Box & Socket.'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
