'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield,
  Key,
  Clock,
  Calendar,
  Building,
  Phone,
  Mail,
  Save,
  CheckCircle2,
  AlertCircle,
  Lock,
  Unlock,
  RefreshCw,
  Sparkles,
  ChevronLeft,
  Timer,
  Sliders,
  ExternalLink,
} from 'lucide-react';

export default function DeveloperAdminPage() {
  const router = useRouter();
  const [devKey, setDevKey] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // License form fields
  const [hotelName, setHotelName] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [isManualLock, setIsManualLock] = useState(false);
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [customMessage, setCustomMessage] = useState('');

  // Live countdown state
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: false });

  // Load license data
  const fetchLicense = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/developer/license');
      const data = await res.json();
      if (data?.success && data?.license) {
        const lic = data.license;
        setHotelName(lic.hotelName || '');
        setContactPhone(lic.contactPhone || '');
        setContactEmail(lic.contactEmail || '');
        setCustomMessage(lic.customMessage || '');
        setIsManualLock(Boolean(lic.isManualLock));

        if (lic.expiresAt) {
          // Format for datetime-local input (YYYY-MM-DDTHH:mm)
          const d = new Date(lic.expiresAt);
          const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
          setExpiresAt(localIso);
        }
      }
    } catch (err) {
      console.error('Failed to fetch license data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLicense();
    // Check if previously logged in this session
    const savedKey = sessionStorage.getItem('dev_admin_key');
    if (savedKey) {
      setDevKey(savedKey);
      setIsAuthenticated(true);
    }
  }, []);

  // Update countdown every second
  useEffect(() => {
    if (!expiresAt) return;

    const updateTimer = () => {
      const target = new Date(expiresAt).getTime();
      const now = new Date().getTime();
      const diff = target - now;

      if (diff <= 0 || isManualLock) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true });
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setCountdown({ days, hours, minutes, seconds, isPast: false });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, isManualLock]);

  // Handle dev key login
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!devKey) return;
    setLoading(true);
    setMessage(null);

    try {
      // Test the key against POST API with current state
      const res = await fetch('/api/developer/license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ devKey }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid Developer Key');
      }

      setIsAuthenticated(true);
      sessionStorage.setItem('dev_admin_key', devKey);
      setMessage({ type: 'success', text: 'Developer authorization verified.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Authorization failed' });
    } finally {
      setLoading(false);
    }
  };

  // Add time preset
  const addTimePreset = (unit: 'days' | 'months' | 'years', amount: number) => {
    const baseDate = new Date();
    if (unit === 'days') {
      baseDate.setDate(baseDate.getDate() + amount);
    } else if (unit === 'months') {
      baseDate.setMonth(baseDate.getMonth() + amount);
    } else if (unit === 'years') {
      baseDate.setFullYear(baseDate.getFullYear() + amount);
    }

    const localIso = new Date(baseDate.getTime() - baseDate.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setExpiresAt(localIso);
    setIsManualLock(false);
  };

  // Save changes
  const handleSave = async () => {
    setSaveLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/developer/license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          devKey,
          hotelName,
          expiresAt: new Date(expiresAt).toISOString(),
          isManualLock,
          contactPhone,
          contactEmail,
          customMessage,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save changes');

      setMessage({ type: 'success', text: 'System license & timer updated successfully!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save' });
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center">
      {/* Background radial highlight */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="w-full max-w-4xl flex items-center justify-between mb-8 z-10">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 transition"
        >
          <ChevronLeft size={16} /> Back to POS
        </button>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold uppercase tracking-wider">
          <Shield size={14} /> Developer Control Center
        </div>
      </div>

      {!isAuthenticated ? (
        /* Login Card */
        <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative z-10">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
              <Key size={32} />
            </div>
            <h1 className="text-2xl font-bold text-white">Developer Access</h1>
            <p className="text-sm text-slate-400 mt-1">Enter master developer key to manage license timers</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Developer Authorization Key
              </label>
              <input
                type="password"
                value={devKey}
                onChange={(e) => setDevKey(e.target.value)}
                placeholder="Enter master developer authorization key"
                className="w-full px-4 py-3.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                required
              />
              <p className="text-[11px] text-slate-500 mt-1.5">
                Requires the master <code className="text-indigo-400">DEVELOPER_ADMIN_KEY</code> configured in environment variables.
              </p>
            </div>

            {message && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  message.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}
              >
                {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {loading ? <RefreshCw className="animate-spin" size={18} /> : 'Unlock Developer Portal'}
            </button>
          </form>
        </div>
      ) : (
        /* Main Developer Dashboard */
        <div className="w-full max-w-4xl bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-8 relative z-10">
          {/* Top Banner & Status */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div>
              <h1 className="text-2xl font-black text-white flex items-center gap-3">
                <Timer className="text-indigo-400" /> Hotel License & Timer Controller
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Control system runtime expiry, lock status, and hotel subscription renewals.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                  countdown.isPast || isManualLock
                    ? 'bg-red-500/10 text-red-400 border-red-500/30'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                }`}
              >
                {countdown.isPast || isManualLock ? (
                  <>
                    <Lock size={14} /> EXPIRED / LOCKED
                  </>
                ) : (
                  <>
                    <Unlock size={14} /> ACTIVE & RUNNING
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Live Countdown Display */}
          <div className="bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 rounded-2xl p-6 text-center">
            <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center justify-center gap-2">
              <Clock size={16} className="text-indigo-400" /> Time Remaining Until POS Lock
            </div>

            <div className="grid grid-cols-4 gap-3 max-w-lg mx-auto">
              <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl">
                <div className="text-2xl sm:text-4xl font-extrabold text-white">{countdown.days}</div>
                <div className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase mt-1">Days</div>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl">
                <div className="text-2xl sm:text-4xl font-extrabold text-white">{countdown.hours}</div>
                <div className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase mt-1">Hours</div>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl">
                <div className="text-2xl sm:text-4xl font-extrabold text-white">{countdown.minutes}</div>
                <div className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase mt-1">Mins</div>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl">
                <div className="text-2xl sm:text-4xl font-extrabold text-indigo-400">{countdown.seconds}</div>
                <div className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase mt-1">Secs</div>
              </div>
            </div>

            {countdown.isPast && (
              <div className="mt-4 text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/20 py-2 px-4 rounded-xl inline-block">
                ⚠ The license timer has expired! The POS screen is currently showing the upgrade screen.
              </div>
            )}
          </div>

          {/* Quick Preset Buttons */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
              <Sparkles size={14} className="text-amber-400" /> Quick Extension Presets (From Today)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              <button
                type="button"
                onClick={() => addTimePreset('days', 7)}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition text-center"
              >
                +7 Days (Trial)
              </button>
              <button
                type="button"
                onClick={() => addTimePreset('months', 1)}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition text-center"
              >
                +1 Month
              </button>
              <button
                type="button"
                onClick={() => addTimePreset('months', 6)}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition text-center"
              >
                +6 Months
              </button>
              <button
                type="button"
                onClick={() => addTimePreset('years', 1)}
                className="py-2.5 px-3 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/40 border border-indigo-500/40 text-xs font-bold text-indigo-300 transition text-center"
              >
                +1 Year (Recommended)
              </button>
              <button
                type="button"
                onClick={() => addTimePreset('years', 2)}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition text-center"
              >
                +2 Years
              </button>
            </div>
          </div>

          {/* Configuration Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Expiry Date & Time */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5">
                <Calendar size={14} /> Custom Expiry Date & Time
              </label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500 transition"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                The POS will automatically lock once this date and time is reached.
              </p>
            </div>

            {/* Hotel / Client Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5">
                <Building size={14} /> Client / Hotel Name
              </label>
              <input
                type="text"
                value={hotelName}
                onChange={(e) => setHotelName(e.target.value)}
                placeholder="e.g. Hotel Grand Royal"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Developer Contact Phone */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5">
                <Phone size={14} /> Developer Phone / WhatsApp (For Renewal)
              </label>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+91 9876543210"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Developer Contact Email */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5">
                <Mail size={14} /> Developer Email Support
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="developer@agency.com"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Custom Expired Message */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5">
                <Sliders size={14} /> Custom Upgrade Notice / Reason
              </label>
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={2}
                placeholder="e.g. Your annual license has ended. Contact SMIT to renew your package."
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition text-sm"
              />
            </div>

            {/* Manual Kill Switch */}
            <div className="md:col-span-2 p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="font-bold text-sm text-white flex items-center gap-2">
                  <Lock size={16} className={isManualLock ? 'text-red-400' : 'text-slate-400'} /> Immediate Kill Switch / Manual Lock
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Forces the POS to immediately lock and display the upgrade screen regardless of timer date.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsManualLock(!isManualLock)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition border ${
                  isManualLock
                    ? 'bg-red-500 text-white border-red-600 shadow-lg shadow-red-500/30'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                {isManualLock ? 'LOCKED (ACTIVE)' : 'UNLOCKED (NORMAL)'}
              </button>
            </div>
          </div>

          {/* Feedback message */}
          {message && (
            <div
              className={`p-4 rounded-2xl text-sm flex items-center gap-3 ${
                message.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}
            >
              {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              {message.text}
            </div>
          )}

          {/* Action footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                sessionStorage.removeItem('dev_admin_key');
                setIsAuthenticated(false);
              }}
              className="text-xs text-slate-500 hover:text-slate-400 transition"
            >
              Lock Developer Portal
            </button>

            <div className="flex gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="flex-1 sm:flex-initial px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm transition"
              >
                Open POS App
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saveLoading}
                className="flex-1 sm:flex-initial px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                {saveLoading ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
