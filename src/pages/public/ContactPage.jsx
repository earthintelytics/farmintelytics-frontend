import React, { useState } from 'react';
import PublicHeader from './PublicHeader';
import PublicFooter from './PublicFooter';
import { Mail, Phone, MapPin, Send, CheckCircle2, ShieldCheck } from 'lucide-react';

const ContactPage = () => {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', organization: '', subject: 'Enterprise Deployment', message: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      <PublicHeader />

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-bold tracking-widest text-emerald-700 uppercase bg-emerald-100 px-3.5 py-1 rounded-full border border-emerald-200">
            Enterprise Support & Sales
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold font-display text-slate-900 mt-4">
            Connect with Agricultural Geospatial Specialists
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-2">
            Reach out for dedicated enterprise instances, custom biophysical crop calibrations, sovereign cloud deployments, or EUDR integration assistance.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Details Column */}
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
              <h3 className="text-lg font-bold font-display text-slate-900">Global Headquarters</h3>

              <div className="flex items-start gap-3.5 text-sm text-slate-700">
                <MapPin className="text-emerald-600 shrink-0 mt-1" size={18} />
                <div>
                  <p className="font-semibold text-slate-900">Earthintelytics Geospatial Hub</p>
                  <p className="text-xs text-slate-500 mt-0.5">Plot 14, Commercial District, Abuja & Lagos, Nigeria</p>
                </div>
              </div>

              <div className="flex items-center gap-3.5 text-sm text-slate-700">
                <Mail className="text-emerald-600 shrink-0" size={18} />
                <div>
                  <p className="font-semibold text-slate-900">Email Inquiries</p>
                  <a href="mailto:support@earthintelytics.com" className="text-xs text-emerald-600 hover:underline">support@earthintelytics.com</a>
                </div>
              </div>

              <div className="flex items-center gap-3.5 text-sm text-slate-700">
                <Phone className="text-emerald-600 shrink-0" size={18} />
                <div>
                  <p className="font-semibold text-slate-900">Direct Line</p>
                  <p className="text-xs text-slate-500">+234 (0) 800-FARM-INTEL</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-2">
                <ShieldCheck size={16} className="text-emerald-600" /> Enterprise SLA Guarantee
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Critical monitoring infrastructure is backed by 99.9% uptime SLA with real-time Sentinel-1 SAR and Sentinel-2 optical pipeline redundancy.
              </p>
            </div>
          </div>

          {/* Form Column */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
            {submitted ? (
              <div className="text-center py-12 space-y-4">
                <div className="w-16 h-16 bg-emerald-100 border border-emerald-200 rounded-full flex items-center justify-center text-emerald-700 mx-auto">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="text-2xl font-bold font-display text-slate-900">Inquiry Received</h3>
                <p className="text-sm text-slate-600 max-w-md mx-auto">
                  Thank you for contacting FarmIntelytics. A technical solution engineer will follow up with your organization within 4 business hours.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="mt-4 px-6 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-800 transition-colors"
                >
                  Send another inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h3 className="text-xl font-bold font-display text-slate-900 mb-2">Send an Inquiry</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Your Name</label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. Dr. Adebayo Ogunlesi"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Official Email</label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="adebayo@plantation.com"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Organization / Enterprise</label>
                    <input
                      type="text"
                      required
                      value={form.organization}
                      onChange={(e) => setForm({ ...form, organization: e.target.value })}
                      placeholder="e.g. Okomu Oil Palm PLC"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Subject</label>
                    <select
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white transition-colors"
                    >
                      <option value="Enterprise Deployment">Enterprise Multi-Tenant Deployment</option>
                      <option value="EUDR Compliance Audit">EUDR Audit & Due Diligence Tooling</option>
                      <option value="Custom Biophysical Model">Custom Crop & Biophysical Calibration</option>
                      <option value="API & Data Integration">API & Geospatial Data Integration</option>
                      <option value="Technical Support">Platform Technical Support</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Message / Requirements</label>
                  <textarea
                    rows={4}
                    required
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="Provide details about your project, estate hectarage, crop types, or specific compliance deadlines..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white resize-none transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-md flex items-center justify-center gap-2 mt-4"
                >
                  <Send size={16} /> Send Enterprise Inquiry
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};

export default ContactPage;
