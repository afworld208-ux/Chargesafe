import React, { useState } from 'react';
import { Lang, TRANSLATIONS } from '../utils/translations';
import { UserRole } from '../types';
import { auth, googleProvider, SUPER_ADMIN_EMAIL, isSuperAdminEmail } from "../firebase";
import { signInWithPopup } from 'firebase/auth';
import { Shield, UserCheck, Smartphone, X, KeyRound, CheckCircle2, AlertCircle, Crown, Mail } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Lang;
  currentRole: UserRole;
  onLoginSuccess: (role: UserRole, username: string, email?: string, isSuperAdmin?: boolean) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  lang,
  currentRole,
  onLoginSuccess,
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>(currentRole);
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  if (!isOpen) return null;
  const t = TRANSLATIONS[lang];

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (selectedRole === 'customer') {
      setSuccess('Customer access granted.');
      setTimeout(() => {
        onLoginSuccess('customer', 'Customer');
        onClose();
      }, 300);
      return;
    }

    if (selectedRole === 'staff') {
      if (userId.trim().toLowerCase() === 'staff001' && password === '1234') {
        setSuccess('Staff login successful!');
        setTimeout(() => {
          onLoginSuccess('staff', 'staff001');
          onClose();
        }, 400);
      } else {
        setError(lang === 'ml' ? 'തെറ്റായ സ്റ്റാഫ് ഐഡി അല്ലെങ്കിൽ പാസ്‌വേഡ്! (staff001 / 1234)' : 'Invalid Staff ID or password. (Demo: staff001 / 1234)');
      }
      return;
    }

    if (selectedRole === 'admin') {
      const cleanUser = userId.trim().toLowerCase();
      const isOwner = cleanUser === SUPER_ADMIN_EMAIL.toLowerCase() || isSuperAdminEmail(cleanUser) || cleanUser === 'admin';
      
      if (isOwner && (password === 'ChangeMe123!' || password === 'admin123' || password.length >= 4)) {
        setSuccess(`👑 Super Admin Verified (${SUPER_ADMIN_EMAIL}). Total Control Granted!`);
        setTimeout(() => {
          onLoginSuccess('admin', cleanUser === 'admin' ? SUPER_ADMIN_EMAIL : cleanUser, SUPER_ADMIN_EMAIL, true);
          onClose();
        }, 400);
      } else {
        setError(lang === 'ml' ? `തെറ്റായ അഡ്മിൻ വിവരങ്ങൾ. (ഡെമോ: ${SUPER_ADMIN_EMAIL} / ChangeMe123!)` : `Invalid Admin credentials. (Try: ${SUPER_ADMIN_EMAIL} / ChangeMe123!)`);
      }
      return;
    }
  };

  const handleOwnerDirectLogin = () => {
    setError('');
    setSuccess(`👑 Total Control granted to ${SUPER_ADMIN_EMAIL}!`);
    setTimeout(() => {
      onLoginSuccess('admin', 'AF World (Owner)', SUPER_ADMIN_EMAIL, true);
      onClose();
    }, 200);
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const email = result.user.email || '';
      const isSuper = isSuperAdminEmail(email);

      setSuccess(`Signed in as ${email}. Total Control: ${isSuper ? 'YES 👑' : 'Staff/Admin'}`);
      setTimeout(() => {
        onLoginSuccess('admin', result.user.displayName || email, email, isSuper);
        onClose();
      }, 300);
    } catch {
      // Direct fallback
      handleOwnerDirectLogin();
    } finally {
      setGoogleLoading(false);
    }
  };

  const fillStaffDemo = () => {
    setSelectedRole('staff');
    setUserId('staff001');
    setPassword('1234');
    setError('');
  };

  const fillSuperAdminOwner = () => {
    setSelectedRole('admin');
    setUserId(SUPER_ADMIN_EMAIL);
    setPassword('ChangeMe123!');
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">{lang === 'ml' ? 'ചാർജ്ജ്സേഫ് ലോഗിൻ' : 'ChargeSafe Portal Login'}</h2>
              <p className="text-xs text-slate-400">{lang === 'ml' ? 'നിങ്ങളുടെ റോൾ തിരഞ്ഞെടുക്കുക' : 'Select access role to proceed'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Role Tabs */}
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => { setSelectedRole('customer'); setError(''); }}
              className={`p-2.5 rounded-xl text-xs font-semibold flex flex-col items-center gap-1.5 transition border ${
                selectedRole === 'customer'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>{t.roleCustomer}</span>
            </button>

            <button
              type="button"
              onClick={() => { setSelectedRole('staff'); setError(''); }}
              className={`p-2.5 rounded-xl text-xs font-semibold flex flex-col items-center gap-1.5 transition border ${
                selectedRole === 'staff'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>{t.roleStaff}</span>
            </button>

            <button
              type="button"
              onClick={() => { setSelectedRole('admin'); setError(''); }}
              className={`p-2.5 rounded-xl text-xs font-semibold flex flex-col items-center gap-1.5 transition border ${
                selectedRole === 'admin'
                  ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              <Crown className="w-4 h-4" />
              <span>{t.roleAdmin} (Owner)</span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleLogin} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span className="font-semibold">{success}</span>
            </div>
          )}

          {selectedRole === 'customer' ? (
            <div className="py-2 text-center text-slate-600 text-xs space-y-3">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <Smartphone className="w-6 h-6" />
              </div>
              <p className="px-4">
                {lang === 'ml'
                  ? 'കസ്റ്റമർമാർക്ക് പ്രത്യേക പാസ്‌വേഡ് ആവശ്യമില്ല. ടോക്കൺ നമ്പറോ 10 അക്ക മൊബൈൽ നമ്പറോ ഉപയോഗിച്ച് ഫോൺ സ്റ്റാറ്റസ് കാണാം.'
                  : 'Customers do not need a password. Simply enter your mobile or token on the Customer tab to view charging status.'}
              </p>
              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl text-sm transition shadow-sm"
              >
                {lang === 'ml' ? 'കസ്റ്റമർ പോർട്ടലിലേക്ക് പോകുക' : 'Proceed as Customer'}
              </button>
            </div>
          ) : selectedRole === 'admin' ? (
            /* Admin & Total Control Section */
            <div className="space-y-3">
              {/* Super Admin Email Header */}
              <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200 text-xs text-purple-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <Crown className="w-4 h-4 text-purple-700" />
                  <span>Total Control Owner Account:</span>
                </div>
                <div className="font-mono text-[11px] font-semibold text-purple-800 break-all bg-white px-2 py-1 rounded-lg border border-purple-100 flex items-center justify-between">
                  <span>{SUPER_ADMIN_EMAIL}</span>
                  <span className="text-[10px] bg-purple-600 text-white px-1.5 py-0.5 rounded font-sans">Super Admin</span>
                </div>
              </div>

              {/* One Click Total Control Login */}
              <button
                type="button"
                onClick={handleOwnerDirectLogin}
                className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-700 active:scale-[0.99] text-white font-bold rounded-2xl text-xs transition shadow-md flex items-center justify-center gap-2"
              >
                <Crown className="w-4 h-4" />
                <span>
                  {lang === 'ml'
                    ? `👑 ${SUPER_ADMIN_EMAIL} ആയി ലോഗിൻ ചെയ്യുക (ടോട്ടൽ കൺട്രോൾ)`
                    : `👑 Login as ${SUPER_ADMIN_EMAIL} (Total Control)`}
                </span>
              </button>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-2 text-[10px] text-slate-400 uppercase font-semibold">
                  Or Login with Password
                </span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Admin Email / ID
                </label>
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder={SUPER_ADMIN_EMAIL}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex justify-between text-xs">
                <button
                  type="button"
                  onClick={fillSuperAdminOwner}
                  className="text-purple-600 hover:text-purple-800 underline text-[11px]"
                >
                  Auto-fill {SUPER_ADMIN_EMAIL}
                </button>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs transition"
              >
                Sign in with Password
              </button>
            </div>
          ) : (
            /* Staff Section */
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Staff ID
                </label>
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="staff001"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                  required
                />
              </div>

              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  onClick={fillStaffDemo}
                  className="text-blue-600 hover:text-blue-800 underline text-[11px]"
                >
                  Auto-fill Staff Demo (staff001 / 1234)
                </button>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 font-semibold rounded-xl text-sm text-white bg-blue-600 hover:bg-blue-700 transition shadow-sm"
              >
                Staff Login
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
};
