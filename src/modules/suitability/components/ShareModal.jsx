import { daysLeftText } from '../suitabilityLabels';
import { useState, useEffect } from 'react';
import { Copy, Check, Trash2, Globe, Clock, MessageSquare, Share2, Sparkles, ExternalLink, Mail, MessageCircle } from 'lucide-react';
import { Modal, PrimaryButton, SecondaryButton, StatusPill, ErrorNote, Field } from '../../../components/page/PageKit';
import { fetchSuitabilityShares, createSuitabilityShare, revokeSuitabilityShare } from '../../../services/suitabilityApi';

export const ShareModal = ({ runId, isOpen = true, onClose, cropName = 'Crop', companyName = 'Estate' }) => {
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  // Form state
  const [clientEmail, setClientEmail] = useState('');
  const [clientName, setClientName] = useState('');
  const [days, setDays] = useState(14);
  const [aiLimit, setAiLimit] = useState(10);
  const [sendEmail, setSendEmail] = useState(true);
  const [newlyCreatedUrl, setNewlyCreatedUrl] = useState('');

  const loadShares = async () => {
    if (!runId) return;
    setLoading(true);
    setError('');
    try {
      const data = await fetchSuitabilityShares(runId);
      setShares(data.items || []);
      if (data.default_days != null && days === 14) setDays(data.default_days);
      if (data.ai_questions_per_day != null && aiLimit === 10) setAiLimit(data.ai_questions_per_day);
    } catch (err) {
      setError(err?.message || 'Failed to load existing share links.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadShares(); // eslint-disable-line react-hooks/set-state-in-effect -- load the links when the window opens
    }
  }, [isOpen, runId]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeShare = shares.find((s) => s.state === 'active') || null;
  const currentShareUrl = newlyCreatedUrl || activeShare?.url || '';

  const shareSubject = `${cropName} Land Suitability Analysis - ${companyName}`;
  const shareMessage = `Hello,

Here is your interactive Land Suitability Analysis for ${cropName} on ${companyName}:
${currentShareUrl}

You can explore high-resolution 30m terrain, climate, and soil maps, inspect planting recommendations, review the FAO class evaluation, and ask questions to the AI agronomic advisor.`;

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!clientEmail.trim()) {
      setError('Enter client email address.');
      return;
    }
    setCreating(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await createSuitabilityShare(runId, {
        client_email: clientEmail.trim(),
        client_name: clientName.trim(),
        days: Number(days),
        ai_questions_per_day: Number(aiLimit),
        send_email: sendEmail,
      });

      setNewlyCreatedUrl(res.url);
      setSuccessMsg(
        res.email === 'sent'
          ? `Link created and emailed to ${res.client_email}.`
          : res.email === 'not_configured'
          ? 'Link created. Email is not set up yet (Admin, Integrations, Email), so copy the link below and send it yourself.'
          : String(res.email || '').startsWith('failed')
          ? 'Link created, but the email could not be sent. Copy the link below and send it yourself.'
          : 'Link created. Copy it below to send to your client.'
      );
      setClientEmail('');
      setClientName('');
      loadShares();
    } catch (err) {
      setError(err?.message || 'Could not create share link.');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (shareId, email) => {
    if (!window.confirm(`Revoke client access for ${email}? The link will stop working immediately.`)) return;
    try {
      await revokeSuitabilityShare(shareId);
      loadShares();
    } catch (err) {
      setError(err?.message || 'Failed to revoke link.');
    }
  };

  const copyToClipboard = (text, id) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
    } else {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(shareMessage);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  const handleShareEmail = () => {
    const subject = encodeURIComponent(shareSubject);
    const body = encodeURIComponent(shareMessage);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  if (!isOpen) return null;

  return (
    <Modal
      title="Share Suitability Analysis with Client"
      onClose={onClose}
      wide={true}
      footer={<SecondaryButton onClick={onClose}>Close</SecondaryButton>}
    >
      <div className="space-y-6">
        <p className="text-sm text-gray-600">
          Share this evaluation with your client or stakeholders. They can explore the 30 m interactive
          suitability maps, download the PDF report, and query the AI agronomic advisor without logging in.
        </p>

        {error && <ErrorNote message={error} onRetry={loadShares} />}
        {successMsg && <p role="status" className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">{successMsg}</p>}

        {/* ── Share the link (only a real link: none exists until one is created) ── */}
        {currentShareUrl ? (
        <div className="p-5 rounded-2xl border border-green-200 bg-green-50/60 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Sparkles size={16} className="text-green-700" />
              <span>Instant Client Share</span>
            </h4>
            {activeShare && (
              <span className="text-[11px] font-mono text-green-800 bg-green-100 px-2 py-0.5 rounded-full font-semibold">
                {activeShare.days_left > 0 ? `Valid for ${daysLeftText(activeShare.days_left)} more` : 'Last day'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={currentShareUrl}
              className="w-full text-xs font-mono px-3.5 py-2.5 bg-white border border-green-300 rounded-xl text-gray-800 select-all shadow-2xs"
            />
            <button
              type="button"
              onClick={() => copyToClipboard(currentShareUrl, 'primary')}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-green-700 hover:bg-green-800 text-white rounded-xl text-xs font-semibold whitespace-nowrap transition-all shadow-xs cursor-pointer"
            >
              {copiedId === 'primary' ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedId === 'primary' ? 'Copied!' : 'Copy Link'}</span>
            </button>
          </div>

          {/* Quick Share Buttons: WhatsApp, Email, Copy Link */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[#25D366] hover:bg-[#20ba59] text-white transition-all shadow-xs"
            >
              <MessageCircle size={15} />
              <span>Share via WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handleShareEmail}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-gray-900 hover:bg-black text-white transition-all shadow-xs"
            >
              <Mail size={15} />
              <span>Share via Email</span>
            </button>

            <button
              type="button"
              onClick={() => copyToClipboard(shareMessage, 'msg')}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all shadow-xs"
            >
              <Copy size={14} className="text-gray-500" />
              <span>{copiedId === 'msg' ? 'Message Copied!' : 'Copy Formatted Message'}</span>
            </button>
          </div>
        </div>
        ) : (
          <p className="rounded-xl border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-600">No link yet. Create one below: each link is for one client and stops working after the days you set.</p>
        )}

        {/* ── CREATE CUSTOM LINK FORM ── */}
        <form onSubmit={handleCreate} className="p-5 bg-gray-50/80 rounded-2xl border border-gray-200 space-y-4">
          <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Share2 size={16} className="text-green-700" />
            <span>Generate New Client Link</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Client Email" required hint="Where the report/link is addressed">
              <input
                type="email"
                required
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="client@organization.com"
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
              />
            </Field>

            <Field label="Client Name" hint="Personalised greeting on the client portal">
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g. Sammy or Agro Corp Ltd"
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Duration of Access (Days)" hint="Link automatically expires afterwards">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-600 font-mono"
                />
                <span className="text-xs text-gray-500 whitespace-nowrap">days</span>
              </div>
            </Field>

            <Field label="AI Question Daily Quota" hint="Questions the client can ask AI per day">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={200}
                  value={aiLimit}
                  onChange={(e) => setAiLimit(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-600 font-mono"
                />
                <span className="text-xs text-gray-500 whitespace-nowrap">queries/day</span>
              </div>
            </Field>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                className="rounded border-gray-300 text-green-700 focus:ring-green-600"
              />
              <span>Send notification email to client automatically if email is enabled</span>
            </label>

            <PrimaryButton type="submit" disabled={creating}>
              {creating ? 'Generating Link…' : 'Create & Share Link'}
            </PrimaryButton>
          </div>
        </form>

        {/* Existing Links List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Globe size={16} className="text-gray-500" />
              <span>Active & Previous Client Shares</span>
            </h4>
            <span className="text-xs text-gray-500 font-mono">
              {shares.length} {shares.length === 1 ? 'link' : 'links'}
            </span>
          </div>

          {loading ? (
            <p className="text-xs text-gray-500 py-3">Loading links…</p>
          ) : shares.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-gray-200 rounded-xl text-xs text-gray-500">
              No share links created for this analysis yet.
            </div>
          ) : (
            <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100 bg-white">
              {shares.map((s) => {
                const isActive = s.state === 'active';
                const tone = isActive ? 'good' : s.state === 'expired' ? 'warning' : 'critical';
                return (
                  <div key={s.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/50">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-gray-900">{s.client_name || s.client_email}</span>
                        {s.client_name && (
                          <span className="text-xs text-gray-500 font-mono">({s.client_email})</span>
                        )}
                        <StatusPill tone={tone}>
                          {s.state === 'active' ? (s.days_left > 0 ? `${daysLeftText(s.days_left)} left` : 'last day') : s.state}
                        </StatusPill>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                        <span className="inline-flex items-center gap-1">
                          <Clock size={12} />
                          Expires {new Date(s.expires_at).toLocaleDateString()}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MessageSquare size={12} />
                          {s.ai_questions_per_day} AI queries/day
                        </span>
                        <span>Opened {s.open_count} {s.open_count === 1 ? 'time' : 'times'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isActive && (
                        <>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(s.url, s.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            title="Copy link"
                          >
                            {copiedId === s.id ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
                            {copiedId === s.id ? 'Copied' : 'Copy'}
                          </button>
                          <a
                            href={s.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            title="Open link in new tab"
                          >
                            <ExternalLink size={13} />
                            Preview
                          </a>
                          <button
                            type="button"
                            onClick={() => handleRevoke(s.id, s.client_email)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-200 bg-red-50 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors"
                            title="Revoke client access"
                          >
                            <Trash2 size={13} />
                            Revoke
                          </button>
                        </>
                      )}
                      {!isActive && (
                        <span className="text-xs text-gray-400 italic">Access closed</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ShareModal;
