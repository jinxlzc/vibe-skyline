// Server-only shell configuration, shared by production, standalone and Vite relays.
// Production never permits the local fake-IP exception or implicit localhost CORS.
export function relayEnvironment(env: NodeJS.ProcessEnv, defaultOrigins: string[]) {
  const production = env.NODE_ENV === 'production';
  return {
    origins: env.RELAY_ORIGINS === undefined ? (production ? [] : defaultOrigins) : env.RELAY_ORIGINS.split(',').map(s => s.trim()).filter(Boolean),
    fakeIpCidrs: !production && env.RELAY_LOCAL_FAKE_IP_CIDRS?.trim()
      ? env.RELAY_LOCAL_FAKE_IP_CIDRS.split(',').map(s => s.trim()) : [],
  };
}
