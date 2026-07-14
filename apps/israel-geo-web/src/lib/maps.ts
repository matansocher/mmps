let mapsPromise: Promise<typeof google> | undefined;

export function loadGoogleMaps(): Promise<typeof google> {
  if (window.google?.maps) return Promise.resolve(window.google);
  if (mapsPromise) return mapsPromise;

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return Promise.reject(new Error('VITE_GOOGLE_MAPS_API_KEY is not configured'));

  mapsPromise = new Promise((resolve, reject) => {
    const callbackName = `initIsraelGeoMaps_${Date.now()}`;
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&callback=${callbackName}`;
    script.async = true;
    script.onerror = () => {
      delete window[callbackName as keyof Window];
      mapsPromise = undefined;
      reject(new Error('Google Maps failed to load'));
    };
    Object.assign(window, {
      [callbackName]: () => {
        delete window[callbackName as keyof Window];
        resolve(window.google);
      },
    });
    document.head.appendChild(script);
  });

  return mapsPromise;
}
