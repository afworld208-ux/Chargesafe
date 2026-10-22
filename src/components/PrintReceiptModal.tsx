import React from 'react';
import { Lang, TRANSLATIONS } from '../utils/translations';
import { DepositRecord } from '../types';
import { generateQRCodeSVG, generateBarcodeSVG } from '../utils/qr';
import { Printer, X, Download, ShieldCheck, Zap } from 'lucide-react';

interface PrintReceiptModalProps {
  record: DepositRecord | null;
  onClose: () => void;
  lang: Lang;
}

export const PrintReceiptModal: React.FC<PrintReceiptModalProps> = ({
  record,
  onClose,
  lang,
}) => {
  if (!record) return null;
  const t = TRANSLATIONS[lang];

  const qrData = `CHARGESAFE:TOKEN=${record.tokenStr};SLOT=${record.slotKey};MOBILE=${record.mobile}`;
  const qrSvg = generateQRCodeSVG(qrData, 140);
  const barcodeSvg = generateBarcodeSVG(`CS-${record.tokenStr}`, 240, 48);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 print:shadow-none print:border-none print:max-w-none">
        {/* Header - Hidden on print */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider">{t.printReceipt}</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Physical Slip Body */}
        <div id="printable-slip" className="p-6 text-slate-900 space-y-4 font-mono text-center">
          <div className="border-b-2 border-dashed border-slate-300 pb-3">
            <div className="text-lg font-black tracking-tight font-sans text-slate-950 flex items-center justify-center gap-1.5">
              <span>🔌 CHARGESAFE</span>
            </div>
            <div className="text-[10px] text-slate-500 font-sans tracking-wide">
              SMART PHONE CHARGING STATION • 800 SLOTS
            </div>
          </div>

          {/* Big Token Number */}
          <div className="py-2 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              CUSTOMER CLAIM TOKEN
            </div>
            <div className="text-4xl font-black text-slate-950 tracking-wider my-1">
              #{record.tokenStr}
            </div>
            <div className="text-xs font-bold text-emerald-700 font-sans">
              SLOT: {record.box} · {record.socket}
            </div>
          </div>

          {/* Details Table */}
          <div className="text-xs text-left space-y-1.5 border-y border-dashed border-slate-300 py-3">
            <div className="flex justify-between">
              <span className="text-slate-500">Mobile:</span>
              <span className="font-bold">******{record.mobile.slice(-4)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Device:</span>
              <span className="font-medium text-slate-800">{record.phoneModel || 'Phone'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Cable:</span>
              <span className="font-medium">{record.cableType || 'Type-C'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Time:</span>
              <span>{record.formattedTime}</span>
            </div>
          </div>

          {/* QR Code and Barcode */}
          <div className="flex flex-col items-center justify-center py-1 space-y-2">
            <div
              className="p-2 bg-white border border-slate-200 rounded-xl inline-block"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
            <div
              className="inline-block"
              dangerouslySetInnerHTML={{ __html: barcodeSvg }}
            />
          </div>

          {/* Security note */}
          <div className="text-[10px] text-slate-500 leading-tight pt-2 border-t border-dashed border-slate-300 font-sans">
            Please present this token slip or QR code to the staff counter to collect your device. Photo verification will be conducted.
          </div>
        </div>

        {/* Modal Buttons - Hidden on print */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-2 print:hidden">
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition shadow-sm flex items-center justify-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>{t.printReceipt}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl text-xs transition"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
