export const createBonus = () => {
    const bonus = document.createElement('div');
    bonus.classList.add('bonus');
    bonus.style.top = `${Math.random() * 90}%`;
    bonus.style.left = `${Math.random() * 90}%`;
    document.querySelector('.game-area').appendChild(bonus);
    setTimeout(() => bonus.remove(), 5000);
};

export const checkBonusCollision = () => {
    const player = document.getElementById('player');
    const playerRect = player.getBoundingClientRect();
    const bonuses = document.querySelectorAll('.bonus');
    const scoreDisplay = document.getElementById('score');
    let score = parseInt(scoreDisplay.textContent.replace('Очки: ', ''));
    bonuses.forEach(bonus => {
        const bonusRect = bonus.getBoundingClientRect();
        if (
            playerRect.left < bonusRect.right &&
            playerRect.right > bonusRect.left &&
            playerRect.top < bonusRect.bottom &&
            playerRect.bottom > bonusRect.top
        ) {
            score += 10;
            scoreDisplay.textContent = 'Очки: ' + score;
            bonus.remove();
            createBonus();
        }
    });
    return score;
};