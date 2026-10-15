import { createContext, useContext, useState, useCallback } from 'react';

const LoadingContext = createContext();

export const LoadingProvider = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('Loading data...');

  const startLoading = useCallback((msg = 'Loading data...') => {
    setLoading(true);
    setProgress(0);
    setMessage(msg);
  }, []);

  const updateProgress = useCallback((percent) => {
    setProgress(Math.max(0, Math.min(100, percent)));
  }, []);

  const stopLoading = useCallback(() => {
    setLoading(false);
    setProgress(100);
    setTimeout(() => setProgress(0), 500);
  }, []);

  const value = {
    loading,
    progress,
    message,
    startLoading,
    updateProgress,
    stopLoading,
  };

  return (
    <LoadingContext.Provider value={value}>
      {children}
    </LoadingContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within LoadingProvider');
  }
  return context;
};
