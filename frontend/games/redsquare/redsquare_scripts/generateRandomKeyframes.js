export const generateRandomKeyframes = ({ styleSheet }) => {
    if (!styleSheet) {
        throw new Error("No stylesheet provided for adding keyframes.");
    }
    for (let i = 1; i <= 5; i++) {
        const keyframes = `
            @keyframes move${i} {
                0% { top: ${Math.random() * 90}%; left: ${Math.random() * 90}%; }
                25% { top: ${Math.random() * 90}%; left: ${Math.random() * 90}%; }
                50% { top: ${Math.random() * 90}%; left: ${Math.random() * 90}%; }
                75% { top: ${Math.random() * 90}%; left: ${Math.random() * 90}%; }
                100% { top: ${Math.random() * 90}%; left: ${Math.random() * 90}%; }
            }
        `;
        try {
            styleSheet.insertRule(keyframes, styleSheet.cssRules.length);
        } catch (error) {
            console.error(`Failed to add keyframes: ${error.message}`);
        }
    }
};