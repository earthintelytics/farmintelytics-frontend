import { useEffect, useState } from 'react';
import {
  Mail,
  Satellite,
  Bell,
  MapPin,
  Check,
  AlertCircle,
  Loader2,
  Lock,
  RotateCcw,
  Send,
  Radio,
} from 'lucide-react';
import {
  fetchIntegrations,
  updateIntegrationSettings,
  testSmtpConnection,
  testCdseConnection,
} from '../../services/adminApi';
import { Tabs } from '../components/ui';

const inputCls =
  'w-full px-3.5 py-2.5 rounded-xl border border-gray-300 bg-white text-sm text-gray-900 outline-none focus:border-green-600 transition-colors';

const Card = ({ className = '', children }) => (
  <div className={`bg-white rounded-2xl border border-gray-200 ${className}`}>
    {children}
  </div>
);

// Sub-pages of the Integrations page. An integration not listed here appears under "Other", so a new
// one added on the backend is never hidden.
const GROUPS = [
  { id: 'email', label: 'Email', members: ['smtp', 'alerts'] },
  { id: 'data', label: 'Data', members: ['cdse', 'stac'] },
  { id: 'maps', label: 'Maps', members: ['maps'] },
];
const groupOf = (id) => (GROUPS.find((g) => g.members.includes(id)) || { id: 'other' }).id;

const INTEGRATION_ICONS = {
  smtp: Mail,
  cdse: Satellite,
  alerts: Bell,
  maps: MapPin,
};

export default function Integrations() {
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form field state per integration: { [integrationId]: { [fieldKey]: value } }
  const [formData, setFormData] = useState({});
  // Track which secrets are in "replace" mode: { [`${integ}:${key}`]: boolean }
  const [replacingSecret, setReplacingSecret] = useState({});
  // Status messages per integration: { [integId]: { type: 'success' | 'error', message: string } }
  const [statusMsg, setStatusMsg] = useState({});
  // Test result messages: { [integId]: { type: 'success' | 'error', message: string } }
  const [testResult, setTestResult] = useState({});
  // Busy spinner state: string ('save:smtp', 'test:smtp', etc.)
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState('email');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchIntegrations();
      const list = Array.isArray(data) ? data : data?.integrations || [];
      setIntegrations(list);

      // Initialize form values from current settings
      const initial = {};
      list.forEach((integ) => {
        initial[integ.integration] = {};
        integ.fields.forEach((f) => {
          // For secrets, do not set form value to masked text; keep empty unless replacing
          initial[integ.integration][f.key] = f.is_secret ? '' : f.value || '';
        });
      });
      setFormData(initial);
    } catch (err) {
      setError(err.message || 'Could not load integrations settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFieldChange = (integId, key, value) => {
    setFormData((prev) => ({
      ...prev,
      [integId]: {
        ...(prev[integId] || {}),
        [key]: value,
      },
    }));
  };

  const handleSave = async (integId) => {
    setBusy(`save:${integId}`);
    setStatusMsg((prev) => ({ ...prev, [integId]: null }));
    try {
      const fields = formData[integId] || {};
      const updated = await updateIntegrationSettings(integId, fields);
      
      // Update integration state with new values from server
      setIntegrations((prev) =>
        prev.map((item) => (item.integration === integId ? updated : item))
      );

      // Reset replace flags for this integration
      setReplacingSecret((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((k) => {
          if (k.startsWith(`${integId}:`)) delete next[k];
        });
        return next;
      });

      setStatusMsg((prev) => ({
        ...prev,
        [integId]: { type: 'success', message: 'Settings saved successfully.' },
      }));
    } catch (err) {
      setStatusMsg((prev) => ({
        ...prev,
        [integId]: { type: 'error', message: err.message || 'Failed to save settings.' },
      }));
    } finally {
      setBusy('');
    }
  };

  const handleTestSmtp = async () => {
    setBusy('test:smtp');
    setTestResult((prev) => ({ ...prev, smtp: null }));
    try {
      const res = await testSmtpConnection();
      setTestResult((prev) => ({
        ...prev,
        smtp: { type: 'success', message: res.message || 'Test email sent successfully.' },
      }));
    } catch (err) {
      setTestResult((prev) => ({
        ...prev,
        smtp: { type: 'error', message: err.message || 'SMTP test failed.' },
      }));
    } finally {
      setBusy('');
    }
  };

  const handleTestCdse = async () => {
    setBusy('test:cdse');
    setTestResult((prev) => ({ ...prev, cdse: null }));
    try {
      const res = await testCdseConnection();
      setTestResult((prev) => ({
        ...prev,
        cdse: { type: 'success', message: res.message || 'Connection verified successfully.' },
      }));
    } catch (err) {
      setTestResult((prev) => ({
        ...prev,
        cdse: { type: 'error', message: err.message || 'CDSE connection test failed.' },
      }));
    } finally {
      setBusy('');
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-12 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        <p className="text-sm text-gray-500">Loading integration settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* ── Page Header ── */}
      <div>
        <h1 className="font-display text-3xl font-semibold text-gray-900 tracking-tight">
          Integrations
        </h1>
        <p className="text-sm text-gray-500 mt-2 max-w-3xl">
          Configure external service connections including email notifications, Copernicus satellite data access, and map layers. Settings take effect immediately without server restarts.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-sm text-red-800">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
          <div className="flex-1">
            <p className="font-medium">Failed to load integration settings</p>
            <p className="mt-0.5 text-xs text-red-700">{error}</p>
          </div>
          <button
            onClick={loadData}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-900 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      <Tabs value={tab} onChange={setTab} tabs={[
        ...GROUPS.map((g) => ({ id: g.id, label: g.label })),
        ...(integrations.some((i) => groupOf(i.integration) === 'other') ? [{ id: 'other', label: 'Other' }] : []),
      ]} />

      {/* ── Integrations of the chosen sub-page ── */}
      <div className="space-y-6">
        {integrations.filter((integ) => groupOf(integ.integration) === tab).map((integ) => {
          const Icon = INTEGRATION_ICONS[integ.integration] || Radio;
          const isConfigured = integ.fields.some((f) => f.is_set);
          const isSaving = busy === `save:${integ.integration}`;
          const isTesting = busy === `test:${integ.integration}`;
          const msg = statusMsg[integ.integration];
          const testMsg = testResult[integ.integration];

          return (
            <Card key={integ.integration} className="p-6 space-y-6">
              {/* Section Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center shrink-0 text-gray-700">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">
                      {integ.label}
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {integ.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                      isConfigured
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-white text-gray-600 border-gray-200'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isConfigured ? 'bg-green-500' : 'bg-gray-400'
                      }`}
                    />
                    {isConfigured ? 'Configured' : 'Not configured'}
                  </span>
                </div>
              </div>

              {/* Form Fields Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {integ.fields.map((field) => {
                  const fieldKey = field.key;
                  const isSecret = field.is_secret;
                  const isSet = field.is_set;
                  const replaceKey = `${integ.integration}:${fieldKey}`;
                  const isReplacing = replacingSecret[replaceKey];

                  return (
                    <div key={fieldKey} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor={`${integ.integration}-${fieldKey}`}
                          className="text-xs font-semibold text-gray-700"
                        >
                          {field.label}
                        </label>
                        {field.source && field.source !== 'not_set' && (
                          <span className="text-[11px] text-gray-400 capitalize">
                            From {field.source}
                          </span>
                        )}
                      </div>

                      {/* Secret Field with Masked Preview */}
                      {isSecret && isSet && !isReplacing ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-mono text-gray-700 flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-xs text-gray-500">
                              <Lock className="w-3.5 h-3.5 text-gray-400" />
                              Stored key
                            </span>
                            <span className="font-semibold text-gray-900 tracking-wider">
                              ••••••••{field.value?.replace(/^\.\.\./, '') || ''}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setReplacingSecret((prev) => ({
                                ...prev,
                                [replaceKey]: true,
                              }))
                            }
                            className="px-3 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-colors"
                          >
                            Replace
                          </button>
                        </div>
                      ) : (
                        <div className="relative">
                          <input
                            id={`${integ.integration}-${fieldKey}`}
                            type={isSecret ? 'password' : 'text'}
                            autoComplete="off"
                            placeholder={field.hint || `Enter ${field.label.toLowerCase()}`}
                            value={formData[integ.integration]?.[fieldKey] || ''}
                            onChange={(e) =>
                              handleFieldChange(
                                integ.integration,
                                fieldKey,
                                e.target.value
                              )
                            }
                            className={inputCls}
                          />
                          {isSecret && isReplacing && (
                            <button
                              type="button"
                              onClick={() => {
                                setReplacingSecret((prev) => ({
                                  ...prev,
                                  [replaceKey]: false,
                                }));
                                handleFieldChange(integ.integration, fieldKey, '');
                              }}
                              className="absolute right-2.5 top-2.5 text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
                            >
                              <RotateCcw className="w-3 h-3" />
                              Cancel
                            </button>
                          )}
                        </div>
                      )}

                      {field.hint && (
                        <p className="text-[11px] text-gray-500">{field.hint}</p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Status Message */}
              {msg && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    msg.type === 'success'
                      ? 'bg-green-50 text-green-800 border border-green-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  {msg.type === 'success' ? (
                    <Check className="w-4 h-4 text-green-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span>{msg.message}</span>
                </div>
              )}

              {/* Test Result Message */}
              {testMsg && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    testMsg.type === 'success'
                      ? 'bg-sky-50 text-sky-800 border border-sky-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  {testMsg.type === 'success' ? (
                    <Check className="w-4 h-4 text-sky-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span>{testMsg.message}</span>
                </div>
              )}

              {/* Actions Footer */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  {integ.integration === 'smtp' && (
                    <button
                      type="button"
                      disabled={isTesting || isSaving}
                      onClick={handleTestSmtp}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 disabled:opacity-50 transition-colors"
                    >
                      {isTesting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-500" />
                      ) : (
                        <Send className="w-3.5 h-3.5 text-gray-500" />
                      )}
                      Send test email
                    </button>
                  )}

                  {integ.integration === 'cdse' && (
                    <button
                      type="button"
                      disabled={isTesting || isSaving}
                      onClick={handleTestCdse}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 disabled:opacity-50 transition-colors"
                    >
                      {isTesting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-500" />
                      ) : (
                        <Satellite className="w-3.5 h-3.5 text-gray-500" />
                      )}
                      Test connection
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  disabled={isSaving || isTesting}
                  onClick={() => handleSave(integ.integration)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-700 hover:bg-green-800 text-white text-xs font-semibold disabled:opacity-50 transition-colors shadow-sm"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save settings
                </button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
