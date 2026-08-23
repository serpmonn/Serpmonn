import { query as dbQuery } from '../database/config.mjs';
import {
  checkAndIncrementWebUsage,
  checkAndIncrementWebProMonthly,
} from './web-usage-store.mjs';
import {
  AI_GUEST_DAILY_LIMIT,
  AI_USER_DAILY_LIMIT,
  checkAndIncrementAiUsage,
  checkAndIncrementAiProMonthly,
} from './ai-usage-store.mjs';

const GUEST_DAILY_LIMIT = AI_GUEST_DAILY_LIMIT;
const USER_DAILY_LIMIT = AI_USER_DAILY_LIMIT;

async function checkAndIncrementUsage(identity) {
  const limit = identity.type === 'guest' ? GUEST_DAILY_LIMIT : USER_DAILY_LIMIT;
  return checkAndIncrementAiUsage(identity, limit);
}

async function getUserPlan(userId) {
  const sql = 'SELECT plan, pro_until FROM users WHERE id = ? LIMIT 1';
  const rows = await dbQuery(sql, [userId]);

  if (!rows || rows.length === 0) {
    return { plan: 'free', proUntil: null };
  }

  return {
    plan: rows[0].plan || 'free',
    proUntil: rows[0].pro_until,
  };
}

async function checkAndIncrementProMonthly(userId) {
  return checkAndIncrementAiProMonthly(userId);
}

async function enforceLogicalSearchLimit(req, identity, t) {
  if (identity.type === 'guest') {
    const usage = await checkAndIncrementUsage(identity);

    if (!usage.ok) {
      const isVkAgent = req.headers['x-client'] === 'vk-agent';

      if (isVkAgent) {
        return {
          ok: false,
          status: 403,
          payload: {
            error: t.guestLimitVk,
            needAuth: true,
            limit: usage.limit,
            used: usage.used,
          },
        };
      }

      return {
        ok: false,
        status: 403,
        payload: {
          error: t.guestLimit,
          needAuth: true,
          limit: usage.limit,
          used: usage.used,
        },
      };
    }

    return { ok: true, usage };
  }

  if (identity.type === 'user') {
    const userId = req.user.id;
    const planInfo = await getUserPlan(userId);
    const now = new Date();

    const isProActive =
      planInfo.plan === 'pro' &&
      planInfo.proUntil &&
      new Date(planInfo.proUntil) > now;

    if (isProActive) {
      const proUsage = await checkAndIncrementProMonthly(userId);

      if (!proUsage.ok) {
        return {
          ok: false,
          status: 403,
          payload: {
            error: t.proLimit,
            needAuth: false,
            limit: proUsage.limit,
            used: proUsage.used,
          },
        };
      }

      return { ok: true, usage: proUsage, plan: 'pro' };
    }

    const usage = await checkAndIncrementUsage(identity);

    if (!usage.ok) {
      return {
        ok: false,
        status: 403,
        payload: {
          error: t.freeLimit,
          needAuth: false,
          limit: usage.limit,
          used: usage.used,
        },
      };
    }

    return { ok: true, usage, plan: 'free' };
  }

  return { ok: true };
}

async function enforceWebSearchLimit(req, identity, t) {
  if (identity.type === 'user') {
    const userId = req.user.id;
    const planInfo = await getUserPlan(userId);
    const now = new Date();
    const isProActive =
      planInfo.plan === 'pro' &&
      planInfo.proUntil &&
      new Date(planInfo.proUntil) > now;

    if (isProActive) {
      const usage = await checkAndIncrementWebProMonthly(userId);
      if (!usage.ok) {
        return {
          ok: false,
          status: 403,
          payload: {
            error: t.proLimit,
            limit: usage.limit,
            used: usage.used,
          },
        };
      }
      return { ok: true, plan: 'pro', usage };
    }
  }

  const usage = await checkAndIncrementWebUsage(identity);
  if (!usage.ok) {
    const isGuest = identity.type === 'guest';
    return {
      ok: false,
      status: 403,
      payload: {
        error: isGuest ? t.guestLimit : t.freeLimit,
        needAuth: isGuest,
        limit: usage.limit,
        used: usage.used,
      },
    };
  }

  return { ok: true, usage };
}

export {
  GUEST_DAILY_LIMIT,
  USER_DAILY_LIMIT,
  getUserPlan,
  checkAndIncrementUsage,
  enforceLogicalSearchLimit,
  enforceWebSearchLimit,
};
