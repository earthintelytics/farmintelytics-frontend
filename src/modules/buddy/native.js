// Inside the FarmIntelytics Buddy Android app (Capacitor), Android's own speech recognition and voices are used
// through the app's plugins; on the web the browser's are. Nothing is imported: the app provides the
// plugins on window.Capacitor, so the web build carries no extra code.
export const nativePlugins = () => {
  const cap = typeof window !== 'undefined' ? window.Capacitor : null;
  return cap?.isNativePlatform?.() ? cap.Plugins || {} : null;
};

export const isNativeApp = () => !!nativePlugins();
