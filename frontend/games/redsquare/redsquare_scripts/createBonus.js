export const createBonus = () => {
    const area = document.querySelector('.game-area');
    if (!area) return;
    const bonus = document.createElement('div');
    bonus.classList.add('bonus');
    bonus.style.top = `${Math.random() * 90}%`;
    bonus.style.left = `${Math.random() * 90}%`;
    area.appendChild(bonus);
    setTimeout(() => bonus.remove(), 5000);
};

export const checkBonusCollision = (onCollect) => {
    const player = document.getElementById('player');
    if (!player) return;
    const playerRect = player.getBoundingClientRect();
    const bonuses = document.querySelectorAll('.bonus');
    bonuses.forEach((bonus) => {
        const bonusRect = bonus.getBoundingClientRect();
        if (
            playerRect.left < bonusRect.right &&
            playerRect.right > bonusRect.left &&
            playerRect.top < bonusRect.bottom &&
            playerRect.bottom > bonusRect.top
        ) {
            bonus.remove();
            if (typeof onCollect === 'function') onCollect();
            createBonus();
        }
    });
};
