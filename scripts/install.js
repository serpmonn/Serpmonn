let deferredPrompt;

export function handleInstallApp() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the install prompt');
            } else {
                console.log('User dismissed the install prompt');
            }
            deferredPrompt = null;
        });
    } else {
        document.querySelector('#installInstructions').style.display = 'block';
    }
}

export function setupInstallEvent() {
    window.addEventListener('beforeinstallprompt', (e) => {
        // Предотвращаем автоматический показ
        e.preventDefault();
        deferredPrompt = e;
        console.log('beforeinstallprompt event captured');
    });
}

export function setupInstallAppButton(deferredPrompt) {
    const installAppButton = document.querySelector('#installAppButton');
    const installInstructions = document.querySelector('#installInstructions');

    if (!installAppButton || !installInstructions) {
        console.error('Required elements not found in the DOM.');
        return;
    }

    installAppButton.addEventListener('click', async () => {
        if (deferredPrompt) {
            // Показываем диалоговое окно установки
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                console.log('User accepted the install prompt');
            } else {
                console.log('User dismissed the install prompt');
            }
            deferredPrompt = null;
        } else {
            // Показываем инструкции по установке
            installInstructions.style.display = 'block';
        }
    });
}


