/**
 * Plain message for a failed request. The server's own message is used when it sent one;
 * a proxy's HTML page (502 while the server restarts, for example) is never shown.
 */
const BY_STATUS = {
  400: 'Some details are not right. Check them and try again.',
  401: 'Your email or password is not right, or your session has ended. Sign in again.',
  403: 'You do not have access to this.',
  404: 'This was not found on the server.',
  408: 'The server took too long to answer. Try again.',
  413: 'The file is too large.',
  429: 'Too many tries. Wait a minute and try again.',
  500: 'Something went wrong on our side. Try again in a moment.',
  502: 'The service is restarting or cannot be reached. Try again in a minute.',
  503: 'The service is busy or being updated. Try again in a minute.',
  504: 'The server took too long to answer. Try again in a minute.',
};

export function friendlyMessage(status, text = '', path = '') {
  let msg = '';
  try {
    const body = JSON.parse(text);
    if (typeof body === 'string') msg = body;
    else if (body?.error && typeof body.error === 'object') msg = body.error.message || '';
    else msg = body?.message || (typeof body?.error === 'string' ? body.error : '')
      || (Array.isArray(body?.detail) ? body.detail.map((d) => d.msg || String(d)).join('; ') : (typeof body?.detail === 'string' ? body.detail : ''));
  } catch {
    // not JSON: HTML from a proxy, or plain text
    if (text && !/^\s*</.test(text) && text.length < 300) msg = text.trim();
  }
  if (!msg && status === 401 && path.includes('/auth/login')) msg = 'Your email or password is not right.';
  return msg || BY_STATUS[status] || `The request could not be completed (error ${status}). Try again in a moment.`;
}

/** An Error with a plain message; the status and path stay on it for logs. */
export async function responseError(res, path = '') {
  const text = await res.text().catch(() => '');
  const err = new Error(friendlyMessage(res.status, text, path));
  err.status = res.status;
  err.path = path;
  return err;
}
