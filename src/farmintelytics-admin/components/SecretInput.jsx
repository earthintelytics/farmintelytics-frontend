import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

/**
 * A field for an API key or other secret that is not a sign-in password. It is a plain text field
 * whose characters are drawn as dots, so the browser does not offer to save it as a password.
 * Browsers that cannot draw the dots fall back to a password field.
 */
const MASKS = typeof CSS !== 'undefined' && CSS.supports?.('-webkit-text-security', 'disc');

export default function SecretInput({ className = '', value, onChange, offset = '', ...props }) {
  const [show, setShow] = useState(false);
  const masked = !show;
  return (
    <div className="relative">
      <input
        {...props}
        type={masked && !MASKS ? 'password' : 'text'}
        value={value}
        onChange={onChange}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        data-lpignore="true"
        data-1p-ignore="true"
        data-form-type="other"
        className={`${className} pr-10 ${masked && MASKS ? '[-webkit-text-security:disc]' : ''}`}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? 'Hide' : 'Show'}
        className={`absolute top-1/2 -translate-y-1/2 ${offset || 'right-2.5'} p-1 rounded-md text-gray-500 hover:text-gray-800`}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}
