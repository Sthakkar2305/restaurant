'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AlertTriangle, Clock, Lock, Phone, Mail, ShieldAlert, Sparkles, KeyRound } from 'lucide-react';

interface LicenseData {
  hotelName: string;
  expiresAt: string;
  isManualLock: boolean;
  isExpired: boolean;
  remainingDays: number;
  contactPhone: string;
  contactEmail: string;
  customMessage: string;
}

export function LicenseGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [license, setLicense] = useState<LicenseData | null>(null);
  const [loading, setLoading] = useState(true);

  // Skip guard check on developer-admin route
  const isDevAdmin = pathname?.startsWith('/developer-admin');

  useEffect(() => {
    if (isDevAdmin) {
      setLoading(false);
      return;
    }

    const checkLicense = async () => {
      try {
        const res = await fetch('/api/developer/license');
        const data = await res.json();
        if (data?.success && data?.license) {
          setLicense(data.license);
        }
      } catch (err) {
        console.error('Failed to verify license:', err);
      } finally {
        setLoading(false);
      }
    };

    checkLicense();
    // Poll every 60 seconds
    const interval = setInterval(checkLicense, 60000);
    return () => clearInterval(interval);
  }, [pathname, isDevAdmin]);

  if (isDevAdmin) {
    return <>{children}</>;
  }

  if (loading) {
    return <>{children}</>;
  }

  if (license?.isExpired) {
    const expiryDateFormatted = license.expiresAt
      ? new Date(license.expiresAt).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : 'Recently';

    return (
      <div className="fixed inset-0 z-[9999] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4 text-slate-100 font-sans">
        <div className="w-full max-w-lg bg-slate-900 border border-red-500/30 rounded-3xl p-8 shadow-2xl text-center relative overflow-hidden">
          {/* Background Glow */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-red-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Icon Header */}
          <div className="w-20 h-20 mx-auto rounded-3xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-6 shadow-lg shadow-red-500/10">
            <Lock className="w-10 h-10" />
          </div>

          {/* Title */}
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 mb-3 uppercase tracking-wider">
            <ShieldAlert size={14} /> Subscription Expired
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
            Plan Renewal Required
          </h1>
          <p className="text-slate-400 text-sm sm:text-base mb-6 leading-relaxed">
            {license.hotelName ? (
              <span className="text-white font-medium">{license.hotelName}&apos;s </span>
            ) : (
              'The '
            )}
            POS license expired on <span className="text-red-400 font-semibold">{expiryDateFormatted}</span>.
            Access to ordering and billing is temporarily suspended until renewed.
          </p>

          {/* Custom Message if set */}
          {license.customMessage && (
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 mb-6 text-xs text-slate-300">
              {license.customMessage}
            </div>
          )}

          {/* Contact / Renewal Details */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-850 border border-slate-700 rounded-2xl p-5 mb-6 text-left space-y-3">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-400" /> Upgrade & Renewal Support
            </div>

            {license.contactPhone && (
              <a
                href={`tel:${license.contactPhone.replace(/\s+/g, '')}`}
                className="flex items-center gap-3 text-sm text-slate-200 hover:text-white transition"
              >
                <div className="p-2 rounded-lg bg-slate-700 text-slate-300">
                  <Phone size={16} />
                </div>
                <div>
                  <div className="text-xs text-slate-400">Call / WhatsApp Support</div>
                  <div className="font-semibold text-emerald-400">{license.contactPhone}</div>
                </div>
              </a>
            )}

            {license.contactEmail && (
              <a
                href={`mailto:${license.contactEmail}`}
                className="flex items-center gap-3 text-sm text-slate-200 hover:text-white transition"
              >
                <div className="p-2 rounded-lg bg-slate-700 text-slate-300">
                  <Mail size={16} />
                </div>
                <div>
                  <div className="text-xs text-slate-400">Email Support</div>
                  <div className="font-semibold text-sky-400">{license.contactEmail}</div>
                </div>
              </a>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => router.push('/developer-admin')}
              className="w-full py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 flex items-center justify-center gap-2 transition"
            >
              <KeyRound size={16} /> Developer Portal
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 transition"
            >
              <Clock size={16} /> Check Status
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
