import paseto from 'paseto';
import { findPartnerById } from './partnerModel.mjs';

const { V2 } = paseto;

export const PARTNER_COOKIE = 'partner_token';

const COOKIE_OPTS = {
  httpOnly: true,
  secure: true,
  sameSite: 'Lax',
  path: '/',
  domain: '.serpmonn.ru'
};

export function setPartnerCookie(res, token, maxAgeMs = 7 * 24 * 60 * 60 * 1000) {
  res.cookie(PARTNER_COOKIE, token, { ...COOKIE_OPTS, maxAge: maxAgeMs });
}

export function clearPartnerCookie(res) {
  res.clearCookie(PARTNER_COOKIE, COOKIE_OPTS);
  res.clearCookie(PARTNER_COOKIE, { httpOnly: true, secure: true, sameSite: 'Lax', path: '/' });
}

export async function signPartnerToken(payload) {
  const secretKey = process.env.SECRET_KEY;
  if (!secretKey) throw new Error('SECRET_KEY missing');
  return V2.sign({ ...payload, kind: 'partner' }, secretKey);
}

export async function verifyPartnerToken(req, res, next) {
  try {
    const token = req.cookies?.[PARTNER_COOKIE];
    if (!token) {
      return res.status(401).json({ message: 'Нет сессии партнёра' });
    }
    const secretKey = process.env.SECRET_KEY;
    const payload = await V2.verify(token, secretKey);
    if (payload.kind !== 'partner' || !payload.id) {
      return res.status(401).json({ message: 'Неверный токен партнёра' });
    }
    const user = await findPartnerById(payload.id);
    if (!user || user.status !== 'active') {
      return res.status(401).json({ message: 'Аккаунт недоступен' });
    }
    req.partner = {
      id: user.id,
      email: user.email,
      role: user.role,
      company: user.company,
      publisherCode: user.publisher_code
    };
    next();
  } catch (err) {
    console.error('[partners] verifyPartnerToken', err.message);
    return res.status(401).json({ message: 'Сессия истекла' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.partner || !roles.includes(req.partner.role)) {
      return res.status(403).json({ message: 'Недостаточно прав' });
    }
    next();
  };
}

export function isBootstrapAdminEmail(email) {
  const raw = process.env.PARTNER_ADMIN_EMAILS || '';
  const list = raw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  return list.includes(String(email || '').toLowerCase());
}
