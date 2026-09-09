/** VK wall posts (текст). Несколько сообществ — через createVkChannel. */

const API = 'https://api.vk.com/method';
const V = '5.199';

export const VK_GROUP_DEFS = [
  {
    id: 'vk',
    label: 'VK Serpmonn | Официальное сообщество',
    tokenEnv: 'MARKETING_VK_TOKEN',
    groupEnv: 'MARKETING_VK_GROUP_ID',
    defaultGroupId: '229370902',
    screenName: 'serpmonn_site',
    url: 'https://vk.ru/serpmonn_site'
  },
  {
    id: 'vk_blog',
    label: 'VK Serpmonn | Блог',
    tokenEnv: 'MARKETING_VK_BLOG_TOKEN',
    groupEnv: 'MARKETING_VK_BLOG_GROUP_ID',
    defaultGroupId: '221611731',
    screenName: 'serpmonn_blog',
    url: 'https://vk.ru/serpmonn_blog'
  },
  {
    id: 'vk_ads',
    label: 'VK Serpmonn | Реклама',
    tokenEnv: 'MARKETING_VK_ADS_TOKEN',
    groupEnv: 'MARKETING_VK_ADS_GROUP_ID',
    defaultGroupId: '237439424',
    screenName: 'serpmonn_ads',
    url: 'https://vk.ru/serpmonn_ads'
  },
  {
    id: 'vk_vrnhoney',
    label: 'VK VRNHoney',
    tokenEnv: 'MARKETING_VK_VRNHONEY_TOKEN',
    groupEnv: 'MARKETING_VK_VRNHONEY_GROUP_ID',
    defaultGroupId: '226862508',
    screenName: 'vrnhoney_ru',
    url: 'https://vk.ru/vrnhoney_ru'
  }
];

export function isVkChannelId(id) {
  const s = String(id || '');
  return s === 'vk' || s.startsWith('vk_');
}

function env(name, fallback = '') {
  const v = String(process.env[name] || '').trim();
  return v || fallback;
}

export function createVkChannel(def) {
  const formats = ['text', 'video'];

  function token() {
    return env(def.tokenEnv);
  }

  function groupId() {
    return env(def.groupEnv, def.defaultGroupId || '');
  }

  async function vkCall(method, params = {}) {
    const body = new URLSearchParams({
      access_token: token(),
      v: V,
      ...Object.fromEntries(
        Object.entries(params).map(([k, v]) => [k, v == null ? '' : String(v)])
      )
    });
    const res = await fetch(`${API}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });
    const data = await res.json();
    if (data.error) {
      const e = new Error(data.error.error_msg || `VK ${method} error`);
      e.code = data.error.error_code;
      e.method = method;
      throw e;
    }
    return data.response;
  }

  function escapeRegExp(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /** Убрать из текста URL на тот же хост, чтобы CTA не дублировалась. */
  function stripSameHostUrls(text, cta) {
    let out = String(text || '');
    const raw = String(cta || '').trim();
    if (!raw || !out) return out.trim();
    if (out.includes(raw)) {
      out = out.split(raw).join(' ');
    }
    try {
      const u = new URL(raw);
      const host = u.host.replace(/^www\./i, '');
      if (host) {
        const full = new RegExp(
          `https?:\\/\\/(?:www\\.)?${escapeRegExp(host)}[^\\s\\]\\)>\"']*`,
          'gi'
        );
        out = out.replace(full, ' ');
        const bare = new RegExp(
          `(^|[\\s(\\[]|\\n)(?:www\\.)?${escapeRegExp(host)}(?:\\/[^\\s\\]\\)>\"']*)?`,
          'gi'
        );
        out = out.replace(bare, '$1');
      }
    } catch {
      /* ignore */
    }
    return out.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  function postMessage(item) {
    const cta = item.cta_url ? String(item.cta_url).trim() : '';
    const title = stripSameHostUrls(item.title ? String(item.title).trim() : '', cta);
    const body = stripSameHostUrls(item.body ? String(item.body).trim() : '', cta);
    const parts = [title, body, cta].filter(Boolean);
    return parts.join('\n\n').slice(0, 4000);
  }

  function scheduledPublishUnix(item) {
    if (!item?.publish_at) return null;
    const raw = String(item.publish_at).trim();
    let d;
    if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(raw) && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(raw)) {
      d = new Date(raw.replace(' ', 'T') + '+03:00');
    } else {
      d = new Date(raw);
    }
    if (Number.isNaN(d.getTime())) return null;
    const unix = Math.floor(d.getTime() / 1000);
    const minFuture = Math.floor(Date.now() / 1000) + 15 * 60;
    if (unix < minFuture) return null;
    return unix;
  }

  function parseVkPostId(url) {
    const m = String(url || '').match(/wall-?\d+_(\d+)/i);
    return m ? Number(m[1]) : null;
  }

  async function deleteWallPost(externalUrl) {
    const postId = parseVkPostId(externalUrl);
    if (!postId || !token() || !groupId()) return { ok: false, error: 'no post id' };
    try {
      await vkCall('wall.delete', {
        owner_id: `-${groupId()}`,
        post_id: postId
      });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    }
  }

  return {
    id: def.id,
    label: def.label,
    formats,
    screenName: def.screenName || null,
    groupUrl: def.url || null,

    isConfigured() {
      return Boolean(token() && groupId());
    },

    supports(item) {
      const f = String(item?.format || 'text');
      return formats.includes(f);
    },

    async healthCheck() {
      if (!token() || !groupId()) {
        const missing = [
          !token() ? 'токен' : null,
          !groupId() ? 'group id' : null
        ].filter(Boolean);
        return {
          ok: false,
          detail: `Не настроен (${missing.join(', ') || 'токен/группа'})`
        };
      }
      try {
        const r = await vkCall('groups.getById', { group_id: groupId() });
        const g = r?.groups?.[0] || r?.[0];
        const link = def.url || (g?.screen_name ? `https://vk.ru/${g.screen_name}` : '');
        return {
          ok: true,
          detail: g
            ? `${g.name || g.screen_name} (#${g.id}) · только текст${link ? ` · ${link}` : ''}`
            : `group ${groupId()} · только текст`
        };
      } catch (err) {
        return { ok: false, detail: err.message || String(err) };
      }
    },

    parseVkPostId,
    deleteWallPost,

    async publish(item) {
      if (!token() || !groupId()) {
        return { ok: false, error: `${def.label}: не подключён` };
      }

      const gid = groupId();
      const message = postMessage(item);

      try {
        const params = {
          owner_id: `-${gid}`,
          from_group: 1,
          message,
          guid: `mkt-${def.id}-${item.id || Date.now()}-${Date.now()}`
        };
        const publishDate = scheduledPublishUnix(item);
        if (publishDate) params.publish_date = publishDate;

        const post = await vkCall('wall.post', params);
        const postId = post?.post_id;
        const url = postId ? `https://vk.com/wall-${gid}_${postId}` : null;
        const when = publishDate
          ? `отложен на ${new Date(publishDate * 1000).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })} МСК`
          : 'сразу';
        return {
          ok: true,
          url,
          deferred: Boolean(publishDate),
          detail: `VK post #${postId} (${when})`
        };
      } catch (err) {
        return { ok: false, error: err.message || String(err) };
      }
    }
  };
}

export const VK_CHANNELS = VK_GROUP_DEFS.map(createVkChannel);

/** Обратная совместимость: основной канал как default export shape. */
const main = VK_CHANNELS.find((c) => c.id === 'vk') || VK_CHANNELS[0];
export const id = main.id;
export const label = main.label;
export const formats = main.formats;
export const isConfigured = main.isConfigured.bind(main);
export const supports = main.supports.bind(main);
export const healthCheck = main.healthCheck.bind(main);
export const publish = main.publish.bind(main);
export const deleteWallPost = main.deleteWallPost.bind(main);
export const parseVkPostId = main.parseVkPostId;
