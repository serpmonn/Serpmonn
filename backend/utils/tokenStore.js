const tokenMap = new Map();

export function saveToken(token, userId) {
    tokenMap.set(token, userId);
    setTimeout(() => tokenMap.delete(token), 15 * 60 * 1000); // 15 минут
}

export function getTokenData(token) {
    return tokenMap.get(token);
}

export function removeToken(token) {
    tokenMap.delete(token);
}