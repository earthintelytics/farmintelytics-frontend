/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const PortalRouterContext = createContext(null);

function normalizePath(to) {
  const raw = String(to || '/');
  const [p, qs] = raw.split('?');
  const path = p.startsWith('/') ? p : `/${p}`;
  return { pathname: path, search: qs ? `?${qs}` : '' };
}

export function PortalRouter({ initialEntry = '/', children }) {
  const [loc, setLoc] = useState(() => normalizePath(initialEntry));

  const navigate = useCallback((to, options = {}) => {
    if (typeof to === 'number') return;
    const next = normalizePath(to);
    setLoc(next);
    if (options?.scroll !== false && typeof window !== 'undefined') {
      const mainEl = document.getElementById('main-content');
      if (mainEl) mainEl.scrollTop = 0;
    }
  }, []);

  const setSearchParams = useCallback((updater) => {
    setLoc((prev) => {
      const current = new URLSearchParams(prev.search);
      const nextParams =
        typeof updater === 'function'
          ? updater(current)
          : updater instanceof URLSearchParams
            ? updater
            : new URLSearchParams(updater || {});
      const qs = nextParams.toString();
      return { ...prev, search: qs ? `?${qs}` : '' };
    });
  }, []);

  const value = useMemo(
    () => ({
      pathname: loc.pathname,
      search: loc.search,
      navigate,
      setSearchParams,
    }),
    [loc, navigate, setSearchParams],
  );

  return <PortalRouterContext.Provider value={value}>{children}</PortalRouterContext.Provider>;
}

export function useLocation() {
  const ctx = useContext(PortalRouterContext);
  return ctx ? { pathname: ctx.pathname, search: ctx.search } : { pathname: '/', search: '' };
}

export function useNavigate() {
  const ctx = useContext(PortalRouterContext);
  return ctx ? ctx.navigate : () => {};
}

export function useSearchParams() {
  const ctx = useContext(PortalRouterContext);
  const params = useMemo(() => new URLSearchParams(ctx?.search || ''), [ctx?.search]);
  return [params, ctx ? ctx.setSearchParams : () => {}];
}

export function Navigate({ to }) {
  const navigate = useNavigate();
  React.useEffect(() => {
    navigate(to, { replace: true });
  }, [navigate, to]);
  return null;
}

export function NavLink({ to, end = false, className, style, onClick, children, ...rest }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const targetPath = normalizePath(to).pathname;
  const isActive = end ? pathname === targetPath : pathname === targetPath || (targetPath !== '/' && pathname.startsWith(`${targetPath}/`));
  const cls = typeof className === 'function' ? className({ isActive }) : className;
  const stl = typeof style === 'function' ? style({ isActive }) : style;

  return (
    <a
      href={`#${targetPath}`}
      className={cls}
      style={stl}
      onClick={(e) => {
        e.preventDefault();
        if (onClick) onClick(e);
        navigate(to);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}

export function Link({ to, className, style, onClick, children, ...rest }) {
  const navigate = useNavigate();
  const targetPath = normalizePath(to).pathname;
  return (
    <a
      href={`#${targetPath}`}
      className={className}
      style={style}
      onClick={(e) => {
        e.preventDefault();
        if (onClick) onClick(e);
        navigate(to);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}

export function Route({ element }) {   // path is read by Routes from the props
  return element ?? null;
}

export function Routes({ children }) {
  const { pathname } = useLocation();
  const list = React.Children.toArray(children).filter(React.isValidElement);
  const exact = list.find((c) => normalizePath(c.props.path).pathname === pathname);
  if (exact) return exact.props.element ?? null;
  const fallback = list.find((c) => c.props.path === '*');
  return fallback ? fallback.props.element ?? null : null;
}
