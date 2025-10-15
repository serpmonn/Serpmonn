const tokenMap = new Map();
const cooldownMap = new Map();                                                                                          // для хранения времени последней отправки по userId

export function saveToken(token, userId) {
    tokenMap.set(token, userId);
    cooldownMap.set(userId, Date.now());                                                                                // обновление времени последней отправки
    setTimeout(() => {
        tokenMap.delete(token);
                                                                                                                        // cooldownMap не удаляется, чтобы сохранить ограничение частоты
    }, 15 * 60 * 1000);                                                                                                 // 15 минут
}

export function getTokenData(token) {
    return tokenMap.get(token);
}

export function removeToken(token) {
    tokenMap.delete(token);
}

export function canSendToken(userId, cooldownMs = 5 * 60 * 1000) {                                                      // Проверка: можно ли отправить ссылку для userId с учётом cooldown (по умолчанию 5 минут)
    const lastSent = cooldownMap.get(userId);
    if (!lastSent) return true;
    return (Date.now() - lastSent) > cooldownMs;
}