import React, { useState, useMemo } from 'react';
import { Lang, TRANSLATIONS } from '../utils/translations';
import { DepositRecord, Slot } from '../types';
import { ALL_800_SLOTS } from '../utils/storage';
import { Zap, CheckCircle2, Search, Filter, ShieldCheck, MapPin, Clock, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface SlotVisualizerProps {
  lang: Lang;
  deposits: DepositRecord[];
  onSelectFreeSlot: (box: string, socket: string) => void;
  onSelectOccupiedDeposit: (record: DepositRecord) => void;
}

export const SlotVisualizer: React.FC<SlotVisualizerProps> = ({
  lang,
  deposits,
  onSelectFreeSlot,
  onSelectOccupiedDeposit,
}) => {
  const t = TRANSLATIONS[lang];

  // Box pagination (10 boxes per page = 80 slots per view, or all)
  const [currentPage, setCurrentPage] = useState(1);
  const boxesPerPage = 10; // 10 boxes × 8 sockets = 80 slots per page
  const totalPages = 10; // 100 boxes / 10 = 10 pages

  const [boxSearch, setBoxSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'FREE' | 'BUSY'>('ALL');
  const [inspectRecord, setInspectRecord] = useState<DepositRecord | null>(null);

  // Map of active deposits by slotKey
  const activeMap = useMemo(() => {
    const map = new Map<string, DepositRecord>();
    deposits.forEach((d) => {
      if (d.status === 'CHARGING') {
        map.set(d.slotKey, d);
      }
    });
    return map;
  }, [deposits]);

  const occupiedCount = activeMap.size;
  const availableCount = 800 - occupiedCount;
  const occupancyPercent = Math.round((occupiedCount / 800) * 100);

  // Group slots by box
  const boxes = useMemo(() => {
    const list: { box: string; boxNum: number; sockets: Slot[]; occupiedInBox: number }[] = [];
    for (let b = 1; b <= 100; b++) {
      const box = `B${String(b).padStart(3, '0')}`;
      const sockets: Slot[] = [];
      let occupiedInBox = 0;
      for (let s = 1; s <= 8; s++) {
        const socket = `S${String(s).padStart(2, '0')}`;
        const key = `${box}-${socket}`;
        if (activeMap.has(key)) occupiedInBox++;
        sockets.push({ box, socket, key, boxNum: b, socketNum: s });
      }
      list.push({ box, boxNum: b, sockets, occupiedInBox });
    }
    return list;
  }, [activeMap]);

  // Filter boxes by search
  const filteredBoxes = useMemo(() => {
    const clean = boxSearch.trim().toLowerCase();
    return boxes.filter((b) => {
      const matchesSearch =
        !clean ||
        b.box.toLowerCase().includes(clean) ||
        String(b.boxNum) === clean.replace(/\D/g, '');

      if (!matchesSearch) return false;

      if (statusFilter === 'FREE') return b.occupiedInBox < 8;
      if (statusFilter === 'BUSY') return b.occupiedInBox > 0;
      return true;
    });
  }, [boxes, boxSearch, statusFilter]);

  // Pagination slice
  const paginatedBoxes = useMemo(() => {
    if (boxSearch.trim()) return filteredBoxes;
    const start = (currentPage - 1) * boxesPerPage;
    return filteredBoxes.slice(start, start + boxesPerPage);
  }, [filteredBoxes, currentPage, boxSearch]);

  const handleSocketClick = (slot: Slot) => {
    const active = activeMap.get(slot.key);
    if (active) {
      setInspectRecord(active);
    } else {
      onSelectFreeSlot(slot.box, slot.socket);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
      {/* Title & Stats Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              {lang === 'ml' ? '800 ചാർജ്ജിംഗ് സ്ലോട്ടുകൾ' : '800 Charging Slots Matrix'}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {lang === 'ml'
              ? '100 ബോക്സുകൾ × 8 സോക്കറ്റുകൾ. സ്ലോട്ടിൽ ക്ലിക്ക് ചെയ്ത് വിശദാംശങ്ങൾ കാണുക അല്ലെങ്കിൽ ഡിപ്പോസിറ്റ് ചെയ്യുക.'
              : '100 Charging Boxes × 8 Sockets each. Click a free slot to deposit or busy slot to inspect.'}
          </p>
        </div>

        {/* Live Counters */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 bg-emerald-50 border border-emerald-200 rounded-2xl text-center">
            <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">{t.statAvailable}</div>
            <div className="text-lg font-black text-emerald-700">{availableCount}</div>
          </div>
          <div className="px-3.5 py-2 bg-amber-50 border border-amber-200 rounded-2xl text-center">
            <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">{t.statOccupied}</div>
            <div className="text-lg font-black text-amber-700">{occupiedCount}</div>
          </div>
          <div className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-center">
            <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Load</div>
            <div className="text-lg font-black text-slate-800">{occupancyPercent}%</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={boxSearch}
            onChange={(e) => setBoxSearch(e.target.value)}
            placeholder={lang === 'ml' ? 'ബോക്സ് തിരയുക (B001 - B100)' : 'Jump to Box (e.g. B005 or 5)'}
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 self-stretch sm:self-auto overflow-x-auto">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              statusFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            All Slots (800)
          </button>
          <button
            onClick={() => setStatusFilter('FREE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1 ${
              statusFilter === 'FREE'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
            <span>Free Only</span>
          </button>
          <button
            onClick={() => setStatusFilter('BUSY')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1 ${
              statusFilter === 'BUSY'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-white text-amber-700 hover:bg-amber-50 border border-amber-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>
            <span>Busy Only</span>
          </button>
        </div>
      </div>

      {/* Pagination Controls when not searching */}
      {!boxSearch && (
        <div className="flex items-center justify-between text-xs text-slate-600 px-1">
          <span>
            Viewing Boxes B{String((currentPage - 1) * boxesPerPage + 1).padStart(3, '0')} – B{String(Math.min(currentPage * boxesPerPage, 100)).padStart(3, '0')} (80 Slots)
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold px-2">Page {currentPage} of {totalPages}</span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Boxes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        {paginatedBoxes.map((b) => (
          <div
            key={b.box}
            className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition space-y-3"
          >
            {/* Box Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-slate-900 text-white font-mono font-bold text-xs flex items-center justify-center">
                  {b.box}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Charging Box {b.box}</h4>
                  <span className="text-[10px] text-slate-500">8 Sockets Available</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-[11px] font-semibold text-slate-600">
                  {b.occupiedInBox}/8 Occupied
                </span>
                <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 transition-all"
                    style={{ width: `${(b.occupiedInBox / 8) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 8 Sockets Grid */}
            <div className="grid grid-cols-4 gap-2">
              {b.sockets.map((slot) => {
                const active = activeMap.get(slot.key);
                const isBusy = !!active;

                return (
                  <button
                    key={slot.key}
                    type="button"
                    onClick={() => handleSocketClick(slot)}
                    className={`p-2 rounded-xl text-center transition flex flex-col items-center justify-center border shadow-xs ${
                      isBusy
                        ? 'bg-amber-100 hover:bg-amber-200 border-amber-300 text-amber-950 font-bold'
                        : 'bg-white hover:bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold'
                    }`}
                  >
                    <span className="font-mono text-xs">{slot.socket}</span>
                    <span className="text-[10px] mt-0.5 leading-none">
                      {isBusy ? (
                        <span className="text-amber-800 font-black">
                          #{active.tokenStr.slice(-3)}
                        </span>
                      ) : (
                        <span className="text-emerald-600">FREE</span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Inspect Occupied Slot Drawer / Modal */}
      {inspectRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-amber-600 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Zap className="w-5 h-5 fill-white" />
                <div>
                  <h3 className="text-base font-bold">Slot {inspectRecord.box}-{inspectRecord.socket}</h3>
                  <p className="text-xs text-amber-100">Token #{inspectRecord.tokenStr} · Active Charging</p>
                </div>
              </div>
              <button
                onClick={() => setInspectRecord(null)}
                className="text-amber-200 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                {inspectRecord.photo ? (
                  <img
                    src={inspectRecord.photo}
                    alt="Customer photo"
                    className="w-20 h-20 rounded-2xl object-cover border border-slate-200 bg-slate-100 shrink-0 shadow-sm"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-xs text-center p-2 shrink-0">
                    No Photo
                  </div>
                )}
                <div className="text-xs space-y-1">
                  <div className="font-bold text-slate-900 text-sm">
                    {inspectRecord.phoneModel || 'Smartphone'}
                  </div>
                  <p className="text-slate-600">
                    Mobile: <span className="font-mono font-semibold">{inspectRecord.mobile}</span>
                  </p>
                  <p className="text-slate-600">
                    Cable: <span className="font-semibold">{inspectRecord.cableType || 'Type-C'}</span>
                  </p>
                  <p className="text-slate-600">
                    Deposited: <span>{inspectRecord.formattedTime}</span>
                  </p>
                </div>
              </div>

              {inspectRecord.notes && (
                <div className="bg-slate-50 p-2.5 rounded-xl text-xs text-slate-600 border border-slate-100">
                  <span className="font-semibold">Notes: </span>
                  <span>{inspectRecord.notes}</span>
                </div>
              )}

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const rec = inspectRecord;
                    setInspectRecord(null);
                    onSelectOccupiedDeposit(rec);
                  }}
                  className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-sm flex items-center justify-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verify & Return Phone</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInspectRecord(null)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
