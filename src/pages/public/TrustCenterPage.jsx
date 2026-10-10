import React from 'react';
import PublicHeader from './PublicHeader';
import PublicFooter from './PublicFooter';
import { Shield, Key, FileCheck, CheckCircle2, Activity, Database } from 'lucide-react';

const TrustCenterPage = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      <PublicHeader />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 flex-1 w-full">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
              <Shield size={22} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold font-display text-slate-900">Trust & Security Center</h1>
              <p className="text-xs text-slate-500">Infrastructure Integrity & Regulatory Assurances</p>
            </div>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed mt-4">
            FarmIntelytics delivers enterprise-grade agricultural telemetry and earth observation capabilities engineered to meet stringent corporate compliance and sovereign data governance standards.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center mb-3">
                <Key size={18} />
              </div>
              <h3 className="text-base font-bold text-slate-900">Role-Based Access Control (RBAC)</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Granular permission gates (Admin, Analyst, Field Officer, Viewer) with distinct Superadmin vs Tenant JWT tokens.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center mb-3">
                <FileCheck size={18} />
              </div>
              <h3 className="text-base font-bold text-slate-900">Immutable Audit Logs</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Every pipeline evaluation, boundary modification, and PDF report export is recorded with timestamped provenance.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center mb-3">
                <Database size={18} />
              </div>
              <h3 className="text-base font-bold text-slate-900">High-Availability Geospatial Storage</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                PostGIS spatial indexing paired with MinIO S3-compatible object storage and distributed Redis queue processing.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center mb-3">
                <Activity size={18} />
              </div>
              <h3 className="text-base font-bold text-slate-900">99.9% Uptime & SLA Guarantee</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Monitored container health checks and automated background pipeline recovery for mission-critical farm management.
              </p>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};

export default TrustCenterPage;
