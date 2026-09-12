/** Trust forwarded IPs only when deployment topology is explicitly configured. */
export function parseTrustProxy(value: string | undefined): false | number | string[] {
  const configured = value?.trim();
  if (!configured || configured === 'false' || configured === '0') return false;
  if (/^[1-9]\d*$/.test(configured)) {
    const hops = Number(configured);
    if (!Number.isSafeInteger(hops)) throw new Error('TRUST_PROXY hop count must be a safe integer');
    return hops;
  }
  if (configured === 'true' || /^-?\d/.test(configured) && !configured.includes('.') && !configured.includes(':')) {
    throw new Error('TRUST_PROXY must be false, a positive hop count, or trusted proxy addresses');
  }
  const addresses = configured.split(',').map(address => address.trim());
  if (addresses.some(address => !address)) throw new Error('TRUST_PROXY contains an empty address');
  // Express validates address/CIDR entries when app.set compiles this list.
  return addresses;
}
