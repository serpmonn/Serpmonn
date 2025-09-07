// Аналитические запросы для истории лайков
// Позволяет анализировать конверсию гостевых лайков в авторизованные

import { query } from '../database/config.mjs';

// Получить статистику конверсии гостевых лайков
export async function getGuestLikesConversionStats() {
  try {
    const stats = await query(`
      SELECT 
        COUNT(*) as total_auth_likes,
        SUM(CASE WHEN was_guest = TRUE THEN 1 ELSE 0 END) as migrated_from_guest,
        SUM(CASE WHEN was_guest = FALSE THEN 1 ELSE 0 END) as direct_auth_likes,
        ROUND(
          (SUM(CASE WHEN was_guest = TRUE THEN 1 ELSE 0 END) / COUNT(*)) * 100, 
          2
        ) as conversion_rate_percent
      FROM likes 
      WHERE like_type = 'auth'
    `);
    
    return stats[0] || {
      total_auth_likes: 0,
      migrated_from_guest: 0,
      direct_auth_likes: 0,
      conversion_rate_percent: 0
    };
  } catch (error) {
    console.error('Ошибка получения статистики конверсии:', error);
    return null;
  }
}

// Получить топ URL по количеству мигрированных лайков
export async function getTopMigratedUrls(limit = 10) {
  try {
    const results = await query(`
      SELECT 
        url,
        COUNT(*) as migrated_likes,
        MAX(migrated_at) as last_migration
      FROM likes 
      WHERE was_guest = TRUE AND like_type = 'auth'
      GROUP BY url
      ORDER BY migrated_likes DESC
      LIMIT ?
    `, [limit]);
    
    return results;
  } catch (error) {
    console.error('Ошибка получения топ мигрированных URL:', error);
    return [];
  }
}

// Получить статистику миграций по дням
export async function getMigrationStatsByDay(days = 30) {
  try {
    const results = await query(`
      SELECT 
        DATE(migrated_at) as date,
        COUNT(*) as migrations_count
      FROM likes 
      WHERE was_guest = TRUE 
        AND like_type = 'auth' 
        AND migrated_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY DATE(migrated_at)
      ORDER BY date DESC
    `, [days]);
    
    return results;
  } catch (error) {
    console.error('Ошибка получения статистики миграций по дням:', error);
    return [];
  }
}

// Получить общую статистику лайков
export async function getOverallLikesStats() {
  try {
    const stats = await query(`
      SELECT 
        COUNT(*) as total_likes,
        SUM(CASE WHEN like_type = 'guest' THEN 1 ELSE 0 END) as guest_likes,
        SUM(CASE WHEN like_type = 'auth' THEN 1 ELSE 0 END) as auth_likes,
        SUM(CASE WHEN was_guest = TRUE THEN 1 ELSE 0 END) as migrated_likes,
        COUNT(DISTINCT url) as unique_urls,
        COUNT(DISTINCT user_id) as unique_auth_users
      FROM likes
    `);
    
    return stats[0] || {
      total_likes: 0,
      guest_likes: 0,
      auth_likes: 0,
      migrated_likes: 0,
      unique_urls: 0,
      unique_auth_users: 0
    };
  } catch (error) {
    console.error('Ошибка получения общей статистики:', error);
    return null;
  }
}

// Получить статистику для конкретного URL
export async function getUrlLikesStats(url) {
  try {
    const stats = await query(`
      SELECT 
        url,
        COUNT(*) as total_likes,
        SUM(CASE WHEN like_type = 'guest' THEN 1 ELSE 0 END) as guest_likes,
        SUM(CASE WHEN like_type = 'auth' THEN 1 ELSE 0 END) as auth_likes,
        SUM(CASE WHEN was_guest = TRUE THEN 1 ELSE 0 END) as migrated_likes,
        MAX(created_at) as last_like,
        MAX(migrated_at) as last_migration
      FROM likes 
      WHERE url = ?
      GROUP BY url
    `, [url]);
    
    return stats[0] || null;
  } catch (error) {
    console.error('Ошибка получения статистики URL:', error);
    return null;
  }
}