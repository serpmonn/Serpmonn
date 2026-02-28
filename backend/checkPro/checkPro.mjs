import dotenv from 'dotenv';
import express from 'express';
import cookieParser from 'cookie-parser';
import paseto from 'paseto';
import { query as dbQuery } from '../database/config.mjs';

dotenv.config({ path: '/var/www/serpmonn.ru/backend/.env' });

const { V2 } = paseto;
const secretKey = process.env.SECRET_KEY;

const app = express();
app.use(cookieParser());

async function getUserPlan(userId) {                                                                                                                                                    // та же функция, что в ai-search
  const sql = 'SELECT plan, pro_until FROM users WHERE id = ? LIMIT 1';
  const rows = await dbQuery(sql, [userId]);
  if (!rows || rows.length === 0) return { plan: 'free', proUntil: null };

  const row = rows[0];
  return {
    plan: row.plan || 'free',
    proUntil: row.pro_until
  };
}

async function getUserFromToken(req) {
  const token = req.cookies.token;                                                                                                                                                      // та же кука, что и в ai-search/auth
  if (!token || !secretKey) return null;

  try {
    const payload = await V2.verify(token, secretKey);
    return payload;                                                                                                                                                                     // { id, username, email }
  } catch (e) {
    console.warn('Недействительный токен в check-pro:', e.message);
    return null;
  }
}

app.get('/auth/check-pro', async (req, res) => {                                                                                                                                        // единственный маршрут
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return res.sendStatus(401);                                                                                                                                                       // не залогинен
    }

    const planInfo = await getUserPlan(user.id);
    const now = new Date();
    const isProActive =
      planInfo.plan === 'pro' &&
      planInfo.proUntil &&
      new Date(planInfo.proUntil) > now;

    if (!isProActive) {
      return res.sendStatus(403);                                                                                                                                                       // нет Pro
    }

    return res.sendStatus(200);                                                                                                                                                         // всё ок
  } catch (err) {
    console.error('check-pro error:', err);
    return res.sendStatus(500);
  }
});

const PORT = 7000;
app.listen(PORT, () => {
  console.log(`check-pro service on port ${PORT}`);
});
