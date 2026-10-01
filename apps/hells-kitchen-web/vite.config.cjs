const webPort = Number(process.env.HELLS_KITCHEN_WEB_PORT || 5387);
const apiPort = Number(process.env.HELLS_KITCHEN_API_PORT || 3387);

module.exports = {
  base: '/hells-kitchen/',
  build: { outDir: 'dist', emptyOutDir: true },
  server: { port: webPort, strictPort: true, proxy: { '/api/hells-kitchen': `http://127.0.0.1:${apiPort}` } },
};
