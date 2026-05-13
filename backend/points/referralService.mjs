// backend/referrals/referralService.mjs
import { query } from '../database/config.mjs';
import { awardPoints } from './pointsService.js';

// Бонус за качественного реферала
const QUALIFIED_REFERRER_BONUS = 300;

// Проверить одного реферала и при необходимости начислить 300 баллов рефереру
export async function checkAndRewardQualifiedReferral(referralId) {
  // Берём реферала и его реферера
  const rows = await query(
    `
      SELECT id, referred_by, confirmed, referral_qualified_bonus_awarded
      FROM users
      WHERE id = ?
    `,
    [referralId]
  );

  if (!rows || rows.length === 0) return;

  const referral = rows[0];

  // Нет реферера — нечего делать
  if (!referral.referred_by) return;

  // Уже начисляли бонус за качественного — выходим
  if (referral.referral_qualified_bonus_awarded) return;

  // Условие "качественного" — пока только confirmed = 1
  // Позже сюда добавишь доп. проверки по активности
  if (!referral.confirmed) return;

  // Всё ок — начисляем 300 баллов рефереру
  await awardPoints(
    referral.referred_by,
    QUALIFIED_REFERRER_BONUS,
    'invite_qualified',
    { referee_id: referral.id, reason: 'confirmed' }
  );

  // Помечаем, что бонус уже выдали
  await query(
    'UPDATE users SET referral_qualified_bonus_awarded = 1 WHERE id = ?',
    [referral.id]
  );
}