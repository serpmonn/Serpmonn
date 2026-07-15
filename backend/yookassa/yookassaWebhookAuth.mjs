/**
 * Проверка подлинности webhook ЮKassa: IP allowlist + GET payment из API.
 * @see https://yookassa.ru/developers/using-api/webhooks
 */

import net from 'net';

const IPV4_CIDRS = [
  '185.71.76.0/27',
  '185.71.77.0/27',
  '77.75.153.0/25',
  '77.75.154.128/25'
];

const IPV4_EXACT = new Set(['77.75.156.11', '77.75.156.35']);

const IPV6_PREFIX = '2a02:5180:';

function ipv4ToInt(ip) {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

function matchCidr(ip, cidr) {
  const [base, bitsStr] = cidr.split('/');
  const bits = Number(bitsStr);
  if (!Number.isInteger(bits) || bits < 0 || bits > 32) return false;
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipv4ToInt(ip) & mask) === (ipv4ToInt(base) & mask);
}

/** @param {string} ip */
export function isYooKassaIp(ip) {
  if (!ip || typeof ip !== 'string') return false;
  const normalized = ip.replace(/^::ffff:/i, '').trim();

  if (net.isIPv4(normalized)) {
    if (IPV4_EXACT.has(normalized)) return true;
    return IPV4_CIDRS.some((cidr) => matchCidr(normalized, cidr));
  }

  if (net.isIPv6(normalized)) {
    return normalized.toLowerCase().startsWith(IPV6_PREFIX);
  }

  return false;
}

/** Client IP with Express trust proxy */
export function getRequestIp(req) {
  return req.ip || req.socket?.remoteAddress || '';
}
