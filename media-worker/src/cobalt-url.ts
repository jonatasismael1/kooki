export function normalizeCobaltTunnelUrl(url: string, configuredUrl: string) {
  const tunnel = new URL(url); const configured = new URL(configuredUrl);
  if (tunnel.origin !== configured.origin) { tunnel.protocol = configured.protocol; tunnel.host = configured.host; }
  return tunnel.toString();
}
