/**
 * The organisation's uploaded logo, or the fallback (the default icon tile) when it has none.
 * The logo is served at a fixed address per organisation (/branding/<tenant>/logo), so it never
 * expires; `version` changes the address after a new upload so the new logo shows at once.
 */
import { useState } from 'react';
import { API_BASE } from '../services/apiBase';

const orgLogoSrc = (tenant, version) =>
  tenant ? `${API_BASE}/branding/${encodeURIComponent(tenant)}/logo${version ? `?v=${encodeURIComponent(version)}` : ''}` : '';

export default function OrgLogo({ tenant, version, className = '', fallback = null }) {
  const src = orgLogoSrc(tenant, version);
  // Remembers which address failed, so a new upload (new version) is tried again.
  const [failedSrc, setFailedSrc] = useState('');
  if (!src || failedSrc === src) return fallback;
  return (
    <div className={`flex items-center justify-center overflow-hidden bg-white border border-gray-200 ${className}`}>
      <img src={src} alt="" className="w-full h-full object-contain p-1" onError={() => setFailedSrc(src)} />
    </div>
  );
}
