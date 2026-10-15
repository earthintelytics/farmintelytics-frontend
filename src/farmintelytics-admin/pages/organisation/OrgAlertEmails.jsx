import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { fetchAlertRecipients, updateAlertRecipients } from '../../../services/adminApi';
import { inputCls } from '../../components/formHelpers';
import { Button, IconButton, Loading, Note, Empty } from '../../components/ui';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Manage alert email recipients for one organisation (T2/T28).
 * Alert emails are dispatched automatically when a monitoring run completes
 * and detects new critical alerts.
 */
const OrgAlertEmails = ({ org }) => {
  const [recipients, setRecipients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [inputError, setInputError] = useState('');
  const [dirty, setDirty] = useState(false);

  const orgId = org.schema_name;

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetchAlertRecipients(orgId);
        if (active) {
          setRecipients(Array.isArray(res?.alert_recipients) ? res.alert_recipients : []);
        }
      } catch (e) {
        if (active) setError(e.message || 'Failed to load alert recipients.');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [orgId]);

  const validateAddress = (val) => {
    const trimmed = val.trim().toLowerCase();
    if (!trimmed) {
      return 'Email address is required.';
    }
    if (!EMAIL_REGEX.test(trimmed)) {
      return 'Enter a valid email address (e.g. name@organisation.com).';
    }
    if (recipients.some((r) => r.toLowerCase() === trimmed)) {
      return 'This email address is already in the recipient list.';
    }
    return '';
  };

  const handleAdd = (e) => {
    e?.preventDefault();
    const err = validateAddress(newEmail);
    if (err) {
      setInputError(err);
      return;
    }
    const clean = newEmail.trim().toLowerCase();
    setRecipients((prev) => [...prev, clean]);
    setNewEmail('');
    setInputError('');
    setDirty(true);
    setSuccess('');
  };

  const handleRemove = (emailToRemove) => {
    setRecipients((prev) => prev.filter((r) => r !== emailToRemove));
    setDirty(true);
    setSuccess('');
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await updateAlertRecipients(orgId, recipients);
      setRecipients(Array.isArray(res?.alert_recipients) ? res.alert_recipients : recipients);
      setSuccess('Alert email recipients saved successfully.');
      setDirty(false);
    } catch (e) {
      setError(e.message || 'Failed to update alert recipients.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Loading>Loading alert recipients…</Loading>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Alert email recipients</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            When a monitoring run detects new critical alerts, an email notification is automatically sent to each address listed here.
          </p>
        </div>
        <Link to="/admin/email-log" className="text-xs font-medium text-green-700 hover:text-green-800 shrink-0">
          View email log &rarr;
        </Link>
      </div>

      {error && <Note tone="warning">{error}</Note>}
      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
          <CheckCircle2 size={16} className="text-green-700 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Add new recipient form */}
      <form onSubmit={handleAdd} className="space-y-2">
        <label className="block text-xs font-medium text-gray-700">Add an email address</label>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 relative">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => {
                setNewEmail(e.target.value);
                if (inputError) setInputError('');
              }}
              placeholder="recipient@example.com"
              className={`${inputCls} text-sm`}
            />
          </div>
          <Button type="submit" variant="secondary" className="!py-2 shrink-0">
            <Plus size={15} />
            Add recipient
          </Button>
        </div>
        {inputError && <p className="text-xs text-red-600 mt-1">{inputError}</p>}
      </form>

      {/* Recipients list */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-gray-700">
            Current recipients ({recipients.length})
          </p>
          {dirty && (
            <span className="text-xs text-amber-700 font-medium">
              Unsaved changes
            </span>
          )}
        </div>

        {recipients.length === 0 ? (
          <Empty>
            No alert recipients configured yet.
            <br />
            <span className="text-xs text-gray-400 mt-1 inline-block">
              Add at least one address above so critical alert emails can be delivered.
            </span>
          </Empty>
        ) : (
          <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white overflow-hidden">
            {recipients.map((email) => (
              <li key={email} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0 text-gray-500">
                    <Mail size={14} />
                  </span>
                  <span className="font-mono text-xs text-gray-900 truncate">{email}</span>
                </div>
                <IconButton
                  label={`Remove ${email}`}
                  danger
                  onClick={() => handleRemove(email)}
                >
                  <Trash2 size={15} />
                </IconButton>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
        <Button
          onClick={handleSave}
          disabled={!dirty || saving}
          className="!py-2"
        >
          {saving ? 'Saving…' : 'Save recipients'}
        </Button>
      </div>
    </div>
  );
};

export default OrgAlertEmails;
