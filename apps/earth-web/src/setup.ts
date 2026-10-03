// Must run before Cesium is imported so workers and assets resolve under /earth/.
(window as Window & { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL = `${import.meta.env.BASE_URL}cesiumStatic/`;
