/**
 * Helper to dynamically generate the correct WebSocket URL based on the current host.
 */
export const getWebSocketUrl = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const hostname = window.location.hostname;
  const port = window.location.port === '3000' ? '8000' : window.location.port;
  const host = port ? `${hostname}:${port}` : window.location.host;
  return `${protocol}//${host}/api/stream/ws`;
};
