import { useState, useEffect } from 'react';
import { Copy, Check, Trash2, Globe, Clock, MessageSquare, Share2, Sparkles, ExternalLink } from 'lucide-react';
import { Modal, PrimaryButton, SecondaryButton, StatusPill, ErrorNote, Field } from '../../../components/page/PageKit';
import { fetchSuitabilityShares, createSuitabilityShare, revokeSuitabilityShare } from '../../../services/suitabilityApi';

export const ShareModal = ({ runId, isOpen, onClose }) => {
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
      loadShares(); // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [isOpen, runId]); // eslint-disable-line react-hooks/exhaustive-deps

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
          ? `Link created and emailed directly to ${res.client_email}!`
          : res.email === 'not_configured'
          ? 'Link created! (SMTP not configured on server, copy the link below to share with your client)'
          : 'Link created successfully!'
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
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
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
          Create an expiring, secure link allowing any client or partner to explore this analysis
          interactively with all 30 m map layers, download the official PDF report, and query the AI
          agronomic assistant without needing a FarmIntelytics account.
        </p>

        {error && <ErrorNote message={error} onRetry={loadShares} />}

        {newlyCreatedUrl && (
          <div className="p-4 rounded-xl border border-green-200 bg-green-50/70 space-y-2">
            <div className="flex items-center gap-2 text-green-900 font-semibold text-sm">
              <Sparkles size={16} className="text-green-600" />
              {successMsg || 'Share link is ready!'}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={newlyCreatedUrl}
                className="w-full text-xs font-mono px-3 py-2 bg-white border border-green-300 rounded-lg text-gray-800 select-all"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(newlyCreatedUrl, 'new')}
                className="flex items-center gap-1.5 px-3 py-2 bg-green-700 hover:bg-green-800 text-white rounded-lg text-xs font-semibold whitespace-nowrap transition-colors"
              >
                {copiedId === 'new' ? <Check size={14} /> : <Copy size={14} />}
                {copiedId === 'new' ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          </div>
        )}

        {/* Create Link Form */}
        <form onSubmit={handleCreate} className="p-5 bg-gray-50/80 rounded-2xl border border-gray-200 space-y-4">
          <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Share2 size={16} className="text-green-700" />
            Generate New Client Link
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
                placeholder="e.g. Chief Adebayo or Agro Corp Ltd"
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
              Active & Previous Client Shares
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
                          {s.state === 'active' ? `${s.days_left} days left` : s.state}
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
