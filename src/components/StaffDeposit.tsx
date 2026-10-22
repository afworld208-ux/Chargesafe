import React, { useState, useRef, useEffect } from 'react';
import { Lang, TRANSLATIONS } from '../utils/translations';
import { DepositRecord, Slot, CableType } from '../types';
import { syncManager, ALL_800_SLOTS } from '../utils/storage';
import { playDepositSound } from '../utils/sound';
import confetti from 'canvas-confetti';
import {
  Camera,
  RefreshCw,
  Zap,
  Check,
  AlertCircle,
  Smartphone,
  CheckCircle2,
  Sparkles,
  Upload,
  X,
  FlipHorizontal
} from 'lucide-react';

interface StaffDepositProps {
  lang: Lang;
  deposits: DepositRecord[];
  onDepositComplete: (record: DepositRecord) => void;
  staffName?: string;
  preselectedSlot?: { box: string; socket: string } | null;
  onClearPreselectedSlot?: () => void;
}

export const StaffDeposit: React.FC<StaffDepositProps> = ({
  lang,
  deposits,
  onDepositComplete,
  staffName = 'staff001',
  preselectedSlot,
  onClearPreselectedSlot,
}) => {
  const t = TRANSLATIONS[lang];

  // Form State
  const [mobile, setMobile] = useState('');
  const [box, setBox] = useState('B001');
  const [socket, setSocket] = useState('S01');
  const [phoneModel, setPhoneModel] = useState('Smartphone');
  const [cableType, setCableType] = useState<CableType>('Type-C');
  const [notes, setNotes] = useState('');
  const [photoData, setPhotoData] = useState<string>('');

  // Camera State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('environment');
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Handle pre-selected slot from 800-slot visualizer
  useEffect(() => {
    if (preselectedSlot) {
      setBox(preselectedSlot.box);
      setSocket(preselectedSlot.socket);
    }
  }, [preselectedSlot]);

  // Find next available free slot automatically
  const findNextFreeSlot = (): { box: string; socket: string } | null => {
    const occupiedKeys = new Set(
      deposits.filter((d) => d.status === 'CHARGING').map((d) => d.slotKey)
    );
    for (const slot of ALL_800_SLOTS) {
      if (!occupiedKeys.has(slot.key)) {
        return { box: slot.box, socket: slot.socket };
      }
    }
    return null;
  };

  const handleAutoAssign = () => {
    const nextSlot = findNextFreeSlot();
    if (nextSlot) {
      setBox(nextSlot.box);
      setSocket(nextSlot.socket);
      setFormError('');
    } else {
      setFormError(lang === 'ml' ? 'ക്ഷമിക്കുക! എല്ലാ 800 സ്ലോട്ടുകളും നിറഞ്ഞുകഴിഞ്ഞു.' : 'All 800 slots are currently occupied!');
    }
  };

  // Camera control
  const startCamera = async (facing: 'user' | 'environment' = cameraFacing) => {
    stopCamera();
    setCameraError('');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError(
        lang === 'ml'
          ? 'ബ്രൗസർ ലൈവ് ക്യാമറ പിന്തുണയ്ക്കുന്നില്ല. താഴെയുള്ള അപ്‌ലോഡ് ബട്ടൺ ഉപയോഗിച്ച് ക്യാമറ തുറക്കുക.'
          : 'Live webcam is not available in this context. Use the photo upload/camera button below.'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: unknown) {
      console.warn('Camera stream error:', err);
      setCameraError(
        lang === 'ml'
          ? 'ക്യാമറ അനുമതി ലഭിച്ചില്ല. ദയവായി അനുമതി നൽകുക അല്ലെങ്കിൽ താഴെയുള്ള ബട്ടൺ വഴി ഫോട്ടോ തിരഞ്ഞെടുക്കുക.'
          : 'Camera permission denied or camera not found. You can also use the file upload/native camera below.'
      );
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const switchCameraFacing = () => {
    const newFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(newFacing);
    if (isCameraActive) {
      startCamera(newFacing);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, width, height);
      const dataUri = canvas.toDataURL('image/jpeg', 0.82);
      setPhotoData(dataUri);
      stopCamera();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setPhotoData(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanMobile = mobile.trim();
    if (!/^\d{10}$/.test(cleanMobile)) {
      setFormError(lang === 'ml' ? 'ദയവായി സാധുവായ 10 അക്ക മൊബൈൽ നമ്പർ നൽകുക.' : 'Please enter a valid 10-digit mobile number.');
      return;
    }

    const slotKey = `${box}-${socket}`;
    const isOccupied = deposits.some((d) => d.slotKey === slotKey && d.status === 'CHARGING');
    if (isOccupied) {
      setFormError(lang === 'ml' ? `സ്ലോട്ട് ${slotKey} ഇപ്പോൾ ചാർജ്ജിംഗിലാണ്. മറ്റൊരു സ്ലോട്ട് തിരഞ്ഞെടുക്കുക!` : `Slot ${slotKey} is currently occupied! Please select a free slot.`);
      return;
    }

    setLoading(true);
    try {
      const res = await syncManager.createDeposit({
        mobile: cleanMobile,
        box,
        socket,
        photo: photoData,
        phoneModel,
        cableType,
        notes,
        createdBy: staffName,
      });

      if (res.success && res.record) {
        playDepositSound();
        try {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.7 },
          });
        } catch {
          // ignore
        }
        onDepositComplete(res.record);
        // Reset form
        setMobile('');
        setPhotoData('');
        setNotes('');
        if (onClearPreselectedSlot) onClearPreselectedSlot();
        // Auto assign next slot for rapid successive customer deposits!
        const next = findNextFreeSlot();
        if (next) {
          setBox(next.box);
          setSocket(next.socket);
        }
      } else {
        setFormError(res.error || 'Failed to create deposit.');
      }
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Error creating deposit');
    } finally {
      setLoading(false);
    }
  };

  // Generate unique available box lists
  const availableBoxes = Array.from({ length: 100 }, (_, i) => `B${String(i + 1).padStart(3, '0')}`);
  const sockets = Array.from({ length: 8 }, (_, i) => `S${String(i + 1).padStart(2, '0')}`);

  const currentSlotOccupied = deposits.some(
    (d) => d.slotKey === `${box}-${socket}` && d.status === 'CHARGING'
  );

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              {t.staffDepositTitle}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">{t.staffDepositSub}</p>
        </div>

        <button
          type="button"
          onClick={handleAutoAssign}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold rounded-xl text-xs transition border border-emerald-200"
        >
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <span>{t.autoAssignSlot}</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {formError && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-medium">{formError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Camera / Photo Capture Section */}
          <div className="lg:col-span-5 space-y-4">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              {lang === 'ml' ? 'കസ്റ്റമർ / ഫോൺ ഫോട്ടോ (നിർബന്ധം)' : 'Customer / Phone Photo Proof'}
            </label>

            <div className="bg-slate-900 rounded-2xl p-4 text-white space-y-3 relative overflow-hidden">
              {/* Live Video Viewfinder */}
              <div className="relative aspect-4/3 w-full bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center border border-slate-800">
                {isCameraActive ? (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    {/* Viewfinder crosshairs */}
                    <div className="absolute inset-4 border border-dashed border-white/40 rounded-lg pointer-events-none" />
                  </>
                ) : photoData ? (
                  <div className="relative w-full h-full">
                    <img
                      src={photoData}
                      alt="Captured"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setPhotoData('')}
                      className="absolute top-2 right-2 p-1.5 bg-slate-900/80 hover:bg-red-600 text-white rounded-lg transition"
                      title="Remove photo"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-2 left-2 px-2.5 py-1 bg-emerald-600/90 text-white text-[11px] font-bold rounded-md flex items-center gap-1 shadow-sm">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{t.photoPreview}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-4 text-slate-400 space-y-2">
                    <Camera className="w-8 h-8 mx-auto text-slate-500" />
                    <p className="text-xs">
                      {lang === 'ml' ? 'ക്യാമറ തുറന്ന് ഫോട്ടോ എടുക്കുക' : 'Camera inactive. Tap Open Camera to capture.'}
                    </p>
                  </div>
                )}
              </div>

              {/* Hidden canvas for snapshotting */}
              <canvas ref={canvasRef} className="hidden" />

              {cameraError && (
                <p className="text-[11px] text-amber-300 bg-amber-950/60 p-2 rounded-lg border border-amber-800">
                  {cameraError}
                </p>
              )}

              {/* Camera Controls */}
              <div className="flex flex-wrap gap-2">
                {!isCameraActive ? (
                  <button
                    type="button"
                    onClick={() => startCamera()}
                    className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow"
                  >
                    <Camera className="w-4 h-4" />
                    <span>{t.cameraOpen}</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="flex-1 py-2 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow"
                    >
                      <Zap className="w-4 h-4 fill-slate-950" />
                      <span>{t.cameraCapture}</span>
                    </button>
                    <button
                      type="button"
                      onClick={switchCameraFacing}
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition"
                      title={t.cameraSwitch}
                    >
                      <FlipHorizontal className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition"
                    >
                      {t.cameraStop}
                    </button>
                  </>
                )}

                {/* Mobile direct camera / file upload trigger */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs flex items-center justify-center gap-1.5 transition border border-slate-700"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{lang === 'ml' ? 'ഫയൽ / മൊബൈൽ' : 'Upload / File'}</span>
                </button>

                {/* Quick Demo Phone Photo */}
                <button
                  type="button"
                  onClick={() => {
                    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="225" viewBox="0 0 300 225">
                      <rect width="300" height="225" fill="#0f172a"/>
                      <rect x="90" y="25" width="120" height="175" rx="16" fill="#1e293b" stroke="#10b981" stroke-width="3"/>
                      <rect x="100" y="40" width="100" height="135" rx="8" fill="#020617"/>
                      <circle cx="150" cy="188" r="4" fill="#10b981"/>
                      <text x="150" y="105" font-family="sans-serif" font-size="11" fill="#10b981" text-anchor="middle" font-weight="bold">DEVICE VERIFIED</text>
                      <text x="150" y="122" font-family="sans-serif" font-size="9" fill="#94a3b8" text-anchor="middle">SLOT PHOTO PROOF</text>
                    </svg>`;
                    setPhotoData(`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`);
                  }}
                  className="py-2 px-3 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 rounded-xl text-xs flex items-center justify-center gap-1.5 transition border border-emerald-800"
                  title="Generate instant verified phone photo"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{lang === 'ml' ? 'ഡെമോ ഫോട്ടോ' : 'Demo Photo'}</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              <p className="text-[10px] text-slate-400 leading-tight">
                {t.cameraHint}
              </p>
            </div>
          </div>

          {/* Right Column: Customer & Slot Details */}
          <div className="lg:col-span-7 space-y-4">
            {/* Mobile Number Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                {t.custMobileLabel} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                  +91
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                  placeholder="9876543210"
                  className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-2xl text-sm font-semibold tracking-wider text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                  required
                />
              </div>
            </div>

            {/* Slot Box & Socket Assignment */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  {t.boxSelectLabel} <span className="text-red-500">*</span>
                </label>
                <select
                  value={box}
                  onChange={(e) => setBox(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-2xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                >
                  {availableBoxes.map((b) => (
                    <option key={b} value={b}>
                      Box {b}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  {t.socketSelectLabel} <span className="text-red-500">*</span>
                </label>
                <select
                  value={socket}
                  onChange={(e) => setSocket(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-2xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                >
                  {sockets.map((s) => (
                    <option key={s} value={s}>
                      Socket {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Current Slot Status Banner */}
            <div
              className={`p-3 rounded-2xl text-xs flex items-center justify-between border ${
                currentSlotOccupied
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm">{box}-{socket}</span>
                <span>
                  {currentSlotOccupied
                    ? (lang === 'ml' ? '🔴 നിലവിൽ ചാർജ്ജിംഗിലാണ് (ഒഴിവില്ല)' : '🔴 Occupied (Select another slot)')
                    : (lang === 'ml' ? '🟢 സ്ലോട്ട് ലഭ്യമാണ് (സൗജന്യം)' : '🟢 Slot is Free and Ready')}
                </span>
              </div>
              {!currentSlotOccupied && (
                <span className="text-[11px] font-semibold text-emerald-600 bg-white px-2 py-0.5 rounded-full border border-emerald-100">
                  Ready to Assign
                </span>
              )}
            </div>

            {/* Phone Model & Cable Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  {t.phoneModelLabel}
                </label>
                <input
                  type="text"
                  value={phoneModel}
                  onChange={(e) => setPhoneModel(e.target.value)}
                  placeholder="e.g. iPhone 15, Samsung Galaxy"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-2xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  {t.cableTypeLabel}
                </label>
                <select
                  value={cableType}
                  onChange={(e) => setCableType(e.target.value as CableType)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-2xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                >
                  <option value="Type-C">Type-C (Android / New iPhone)</option>
                  <option value="Lightning (iPhone)">Lightning (iPhone 14 & older)</option>
                  <option value="Micro-USB">Micro-USB</option>
                  <option value="Own Cable">Customer Own Cable</option>
                  <option value="Other">Other Adapter</option>
                </select>
              </div>
            </div>

            {/* Additional notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                {t.notesLabel}
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={lang === 'ml' ? 'കവർ നിറം, പോറൽ അല്ലെങ്കിൽ മറ്റ് കുറിപ്പുകൾ' : 'Case color, scratches, or special notes'}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-2xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || currentSlotOccupied}
                className={`w-full py-3.5 px-6 font-bold rounded-2xl text-sm text-white shadow-lg transition flex items-center justify-center gap-2 ${
                  currentSlotOccupied
                    ? 'bg-slate-400 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99]'
                }`}
              >
                {loading ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Zap className="w-5 h-5 stroke-[2.5]" />
                    <span>{t.createDepositBtn}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
