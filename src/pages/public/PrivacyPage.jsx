import React from 'react';
import PublicHeader from './PublicHeader';
import PublicFooter from './PublicFooter';
import { ShieldCheck, Lock, EyeOff, Server, CheckCircle2 } from 'lucide-react';

const PrivacyPage = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      <PublicHeader />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 flex-1 w-full">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold font-display text-slate-900">Privacy Policy</h1>
              <p className="text-xs text-slate-500">Last updated: October 2026</p>
            </div>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed mt-4">
            At FarmIntelytics, we prioritize the strict confidentiality and sovereign ownership of your agricultural geospatial data, field boundaries, crop health analytics, and smallholder registries.
          </p>

          <div className="mt-8 space-y-6">
            <section className="border-t border-slate-100 pt-6">
              <h2 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                <Lock size={18} className="text-emerald-600" /> 1. Strict Tenant Boundary Isolation
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                All plantation boundaries, GeoJSON spatial files, satellite time-series arrays (Zarr), and agronomic indices are stored under cryptographically isolated tenant keys. Cross-tenant queries are strictly rejected at the API gateway layer.
              </p>
            </section>

            <section className="border-t border-slate-100 pt-6">
              <h2 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                <EyeOff size={18} className="text-emerald-600" /> 2. Zero Telemetry Resale or Secondary Monetization
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                FarmIntelytics does not sell, aggregate, or license your proprietary plantation data, yield forecasts, or smallholder member identities to third-party commercial commodity brokers.
              </p>
            </section>

            <section className="border-t border-slate-100 pt-6">
              <h2 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                <Server size={18} className="text-emerald-600" /> 3. Data Retention and Encryption
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Data at rest is secured via AES-256 encryption across all MinIO object stores and PostgreSQL tables. All traffic in transit is enforced using TLS 1.3 encryption.
              </p>
            </section>

            <section className="border-t border-slate-100 pt-6">
              <h2 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-600" /> 4. EUDR Due Diligence Statements
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Audit logs generated for EU Deforestation Regulation compliance are preserved for the statutory 5-year requirement and remain under the exclusive custody of the subscribing organisation.
              </p>
            </section>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};

export default PrivacyPage;
