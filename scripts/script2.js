		console.log('JavaScript файл подключен и работает.');
		let pieces = [];
                let showAds = false; // Установи в true, чтобы показывать рекламу
                let deferredPrompt;

		const cookieConsent = document.getElementById('cookie-consent');
                const acceptCookiesButton = document.getElementById('accept-cookies');
                const declineCookiesButton = document.getElementById('decline-cookies');
/*
		// Прокси-запрос для конфигурации SDK
                    function initializeVKID(accessToken) {
                        fetch(`/proxy/vkid_sdk_get_config?app_id=52459571&v=5.207&access_token=${accessToken}`)
                        .then(response => response.json())
                        .then(config => {
                                VKID.Config.init(config);
                                console.log('Конфигурация SDK успешно загружена:', config);
                        })
                        .catch(error => {
                                console.error('Ошибка загрузки конфигурации VKID SDK:', error);
                        });
                    }
*/
		// Прокси-запрос для событий статистики
                    function fetchStatEvents(accessToken) {
                        fetch(`/proxy/stat_events_vkid_sdk?app_id=52459571&v=5.207&access_token=${accessToken}`, { mode: 'cors' })
                            .then(response => response.json())
                            .then(data => {
                                // Обработка данных статистики
                                console.log('Статистика:', data);
                            })
                            .catch(error => {
                                console.error('Ошибка Fetch:', error);
                            });
                    }

		    function setCookie(name, value, days) {
			let expires = "";
			if (days) {
			    const date = new Date();
			    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
			    expires = "; expires=" + date.toUTCString();
			}
			document.cookie = name + "=" + (value || "") + expires + "; path=/";
			console.log(`Куки установлено: ${name}=${value}; expires=${expires}; path=/`);
		    }


		    function getCookie(name) {
			    const value = `; ${document.cookie}`;
			    const parts = value.split(`; ${name}=`);
			    console.log(`Значение всех куки: ${document.cookie}`); // Логируем все куки
			    if (parts.length === 2) {
			        const cookieValue = parts.pop().split(';').shift();
			        console.log(`Получено куки: ${name}=${cookieValue}`); // Логируем значение куки
			        return cookieValue;
			    }
			    return null;
		    }


		    function vkidOnSuccess(data) {
			alert("Авторизация прошла успешно!");
			console.log("Данные, полученные после запроса:", data); // Логируем данные
		    }

		    // Обработчик ошибок
		    function vkidOnError(error) {
		    	console.error("Error:", error);
		    	alert("Ошибка авторизации.");
	 	    }

		    function refreshAccessToken(refreshToken) {
                        fetch(`/proxy/refresh?refresh_token=${refreshToken}`)
                            .then(response => response.json())
                            .then(data => {
                                if (data.access_token) {
                                    document.cookie = `vk_access_token=${data.access_token}; path=/`;
                                } else {
                                    vkidOnError({ message: "Unable to refresh access token" });
                                }
                            })
                            .catch(vkidOnError);
                    }

		    function toggleMenu(event) {
                    var menuButton = document.getElementById('menuButton');
                    var menuContainer = document.getElementById('menuContainer');
                    if (menuContainer.style.display === 'block') {
                        menuContainer.style.display = 'none';
                        menuButton.innerHTML = '<span class="s">S</span><span class="n">n</span>';
                        menuButton.style.width = 'auto';
                    } else {
                        menuContainer.style.display = 'block';
                        menuButton.innerHTML = '<span class="s">Serp</span><span class="n">monn</span>';
                        menuButton.style.width = 'auto';
                    }
                }

                function toggleSubmenu(event, submenuId) {
                  var submenu = document.getElementById(submenuId);
                  if (submenu) {
                    if (submenu.style.display === 'block') {
                      submenu.style.display = 'none';
                    } else {
                      submenu.style.display = 'block';
                    }
                  } else {
                    console.error(`Submenu with ID ${submenuId} not found.`);
                  }
                }

		function handleInstallApp() {
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

                async function loadNews() {
                    try {
                        const response = await fetch('https://www.serpmonn.ru/news', {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        });
                        if (!response.ok) {
                            throw new Error(`HTTP error! status: ${response.status}`);
                        }
                        const data = await response.json();
                        const newsContainer = document.getElementById('news-container');

                        if (data.articles && data.articles.length > 0) {
                            data.articles.forEach(article => {
                                const newsItem = document.createElement('div');
                                newsItem.className = 'news-item';

                                const newsLink = document.createElement('a');
                                newsLink.className = 'news-link';
                                newsLink.href = article.url;
                                newsLink.target = '_blank';

                                const newsTitle = document.createElement('div');
                                newsTitle.className = 'news-title';
                                newsTitle.textContent = article.title;

                                const newsDate = document.createElement('div');
                                newsDate.className = 'news-date';
                                newsDate.textContent = new Date(article.publishedAt).toLocaleDateString();

                                const newsContent = document.createElement('div');
                                newsContent.className = 'news-content';
                                newsContent.textContent = article.description;

                                newsLink.appendChild(newsTitle);
                                newsLink.appendChild(newsDate);
                                newsLink.appendChild(newsContent);

                                newsItem.appendChild(newsLink);
                                newsContainer.appendChild(newsItem);
                            });
                        } else {
                            newsContainer.textContent = 'Нет доступных новостей.';
                        }
                    } catch (error) {
                        console.error('Ошибка загрузки новостей:', error);
                    }
                }

		async function loadBackgroundImage() {
                    try {
                        const response = await fetch('https://www.serpmonn.ru/background', {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        });
                        if (!response.ok) {
                            throw new Error(`HTTP error! status: ${response.status}`);
                        }
                        const data = await response.json();
                        const imageUrl = data.urls.full;
                        createPuzzlePieces(imageUrl);
                        window.addEventListener('resize', () => updatePuzzlePieces(imageUrl));
                    } catch (error) {
                        console.error('Ошибка загрузки фонового изображения:', error);
                    }
                }

                function createPuzzlePieces(imageUrl) {
                    const rows = 4;
                    const cols = 4;
                    const pieceWidth = window.innerWidth / cols;
                    const pieceHeight = window.innerHeight / rows;
                    const fragment = document.createDocumentFragment();

                    for (let row = 0; row < rows; row++) {
                        for (let col = 0; col < cols; col++) {
                            const piece = document.createElement('div');
                            piece.classList.add('puzzle-piece');
                            piece.style.width = `${pieceWidth}px`;
                            piece.style.height = `${pieceHeight}px`;
                            piece.style.left = `${col * pieceWidth}px`;
                            piece.style.top = `${row * pieceHeight}px`;
                            piece.style.backgroundImage = `url(${imageUrl})`;
                            piece.style.backgroundSize = `${window.innerWidth}px ${window.innerHeight}px`;
                            piece.style.backgroundPosition = `-${col * pieceWidth}px -${row * pieceHeight}px`;
                            fragment.appendChild(piece);
                            pieces.push(piece);
                        }
                    }

                    document.body.appendChild(fragment);

                    // Перемешиваем массив кусочков
                    for (let i = pieces.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
                    }

                    // Устанавливаем задержку для каждого кусочка
                    pieces.forEach((piece, index) => {
                        setTimeout(() => {
                            piece.style.opacity = 1;
                        }, index * 200);
                    });
                }

		function updatePuzzlePieces(imageUrl) {
                    const rows = 4;
                    const cols = 4;
                    const pieceWidth = window.innerWidth / cols;
                    const pieceHeight = window.innerHeight / rows;

                    pieces.forEach((piece, index) => {
                        const row = Math.floor(index / cols);
                        const col = index % cols;
                        piece.style.width = `${pieceWidth}px`;
                        piece.style.height = `${pieceHeight}px`;
                        piece.style.left = `${col * pieceWidth}px`;
                        piece.style.top = `${row * pieceHeight}px`;
                        piece.style.backgroundImage = `url(${imageUrl})`;
                        piece.style.backgroundSize = `${window.innerWidth}px ${window.innerHeight}px`;
                        piece.style.backgroundPosition = `-${col * pieceWidth}px -${row * pieceHeight}px`;
                    });
                }

                async function fetchBestOffer() {
                    try {
                        const response = await fetch('https://www.serpmonn.ru/best-offer');
                        if (!response.ok) {
                            throw new Error(`HTTP error! status: ${response.status}`);
                        }
                        const bestOffer = await response.json();
                        return bestOffer;
                    } catch (error) {
                        console.error('Failed to fetch best offer:', error);
                    }
                }

                async function displayAds() {
                    if (!showAds) {
                        console.log('Показ рекламы отключен.');
                        return;
                    }
                    const bestOffer = await fetchBestOffer();
                    const adContainer = document.getElementById('ad-container');

                    for (let i = 0; i < 18; i++) {
                        const adBanner = document.createElement('div');
                        adBanner.className = 'ad-banner';

                        if (bestOffer && bestOffer.url) {
                            adBanner.innerHTML = `<iframe src="${bestOffer.url}"></iframe>`;
                        } else {
                            adBanner.innerHTML = 'Нет доступных предложений.';
                        }

                        adContainer.appendChild(adBanner);
                    }
                }

                function closeAd(adId) {
                    const adBanner = document.getElementById(adId);
                    adBanner.style.display = 'none';
                }

		function generateRandomString(length = 80) {
		    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		    let randomString = '';
		    for (let i = 0; i < length; i++) {
			const randomIndex = Math.floor(Math.random() * charset.length);
			randomString += charset[randomIndex];
		    }
		    return randomString;
		}

		async function sha256(plain) {
		    const encoder = new TextEncoder();
		    const data = encoder.encode(plain);
		    const hash = await crypto.subtle.digest('SHA-256', data);
		    return new Uint8Array(hash);
		}

		function base64urlEncode(buffer) {
		    return btoa(String.fromCharCode(...new Uint8Array(buffer)))
		        .replace(/\+/g, '-')
		        .replace(/\//g, '_')
		        .replace(/=+$/, '');
		}

		async function createCodeChallenge(codeVerifier) {
		    const codeChallenge = base64urlEncode(await sha256(codeVerifier));
		    console.log("Сгенерирован codeChallenge:", codeChallenge);
		    // Возвращаем codeChallenge
		    return { codeChallenge };
		}


		document.addEventListener('DOMContentLoaded', () => {

		if (cookieConsent && acceptCookiesButton && declineCookiesButton) {
		    // Проверяем, было ли ранее принято использование куки
		    const cookiesAccepted = getCookie('cookies_accepted');
		    console.log("Проверка куки 'cookies_accepted':", cookiesAccepted);

		    if (!cookiesAccepted) {
		        // Если куки не было принято, отображаем уведомление
		        cookieConsent.style.display = 'block';
		    }

		    // Обрабатываем событие клика по кнопке "Принять куки"
		    acceptCookiesButton.addEventListener('click', () => {
		        // Устанавливаем куки с флагом принятия на 365 дней
		        setCookie('cookies_accepted', 'true', 365);
		        console.log("Куки 'cookies_accepted' установлено");

		        // Скрываем уведомление
		        cookieConsent.style.display = 'none';
		        console.log("Политика принята, уведомление скрыто.");
		    });

		    // Обрабатываем событие клика по кнопке "Отклонить куки"
		    declineCookiesButton.addEventListener('click', () => {
		        // Скрываем уведомление
		        cookieConsent.style.display = 'none';
		        console.log("Политика отклонена, уведомление скрыто.");
		    });
		}

				async function handleLoginSuccess(payload) {
                                        const code = payload.code;
                                        const deviceId = payload.device_id;

                                        console.log("Получен код и deviceId:", { code, deviceId });

					// Генерация codeVerifier
					const codeVerifier = generateRandomString(); 				// Генерация code_verifier
					const codeChallenge = base64urlEncode(await sha256(codeVerifier));
					const state = generateRandomString(16); 				// Генерация случайной строки для состояния
					const scopes = 'vkid.personal_info'; 					// Пример списка прав доступа

					console.log("Code Verifier:", codeVerifier);
					console.log("Code Challenge:", codeChallenge);
					console.log("state:", state);
					console.log("scopes:", scopes);

					// Проверка значений перед отправкой на сервер
					console.log("Отправляемые данные:", JSON.stringify({ code, deviceId, codeVerifier, codeChallenge }));

					fetch('/getAccessToken', {
					    method: 'POST',
					    headers: {
						'Content-Type': 'application/json'
					    },
					    body: JSON.stringify({ code, deviceId, codeVerifier, codeChallenge })
					})
					.then(response => response.json())
					.then(data => {
					    console.log("Данные, полученные от бэкенда:", data);
					    const access_Token = data.access_token;

					    // Сохранение токена в куки на 7 дней
					    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString(); // Токен истекает через 7 дней
					    document.cookie = `vk_access_token=${access_token}; expires=${expires}; path=/`;
					})
					.catch(error => {
					    console.error("Ошибка при получении токена:", error);
					});

                                        // Используем ваш сервер-прокси для обмена кодом, deviceId и accessToken на токен доступа
                                        fetch(`/proxy/stat_events_vkid_sdk?access_token=${code}&device_id=${deviceId}`)
                                        .then(response => {
					    console.log("Ответ от сервера:", response);
					    return response.json();
					})
                                        .then(data => {
					     console.log("Данные, полученные после запроса:", data); // Логируем данные
					     vkidOnSuccess(data);
					})
                                        .catch(error => {
					     console.error("Ошибка при обработке запроса:", error);
					     vkidOnError(error);
					});
				}

					if ('VKIDSDK' in window) {
	                                const VKID = window.VKIDSDK;

	                                VKID.Config.init({
	                                        app: 52459571,
	                                        redirectUrl: 'https://www.serpmonn.ru/main2.html',
	                                        responseMode: VKID.ConfigResponseMode.Callback,
	                                        source: VKID.ConfigSource.LOWCODE,
						codeChallenge: codeChallenge,
						codeChallengeMethod: 'S256',
						state: state,
						scopes: scopes,
	                                });

	                                const floatingOneTap = new VKID.FloatingOneTap();

	                                floatingOneTap.render({
	                                        appName: 'Serpmonn',
	                                        oauthList: ['ok_ru','mail_ru'],
	                                        showAlternativeLogin: true
	                                })
	                                .on(VKID.WidgetEvents.ERROR, vkidOnError)
	                                .on(VKID.FloatingOneTapInternalEvents.LOGIN_SUCCESS, handleLoginSuccess);

					// Вызов метода VKID.Auth.login()
					VKID.Auth.login();
	                                }

		});


                document.getElementById('menuButton').addEventListener('click', function(event) {
                    event.stopPropagation();
                    toggleMenu(event);
                });

                document.querySelectorAll('.menu-item').forEach(function(item) {
                  item.addEventListener('click', function(event) {
                    event.preventDefault();
                    event.stopPropagation();
                    const submenuId = item.getAttribute('data-submenu');
                    if (submenuId) {
                      toggleSubmenu(event, submenuId);
                    } else if (item.id === 'installAppButton') {
                      handleInstallApp();
                    }
                  });
                });

                // Закрытие меню при клике вне его области
                document.addEventListener('click', function(event) {
                    var menuContainer = document.getElementById('menuContainer');
                    var menuButton = document.getElementById('menuButton');
                    if (!menuContainer.contains(event.target) && !menuButton.contains(event.target)) {
                        menuContainer.style.display = 'none';
                        menuButton.innerHTML = '<span class="s">S</span><span class="n">n</span>';
                        menuButton.style.width = 'auto';
                    }
                });

                window.addEventListener('beforeinstallprompt', (e) => {
                  // Сохраняем событие
                  deferredPrompt = e;
                  e.prompt();
                });

		document.querySelector('#installAppButton').addEventListener('click', async () => {
                  if (deferredPrompt) {
                    // Показываем диалоговое окно установки
                    deferredPrompt.prompt();
                    // Ждем, пока пользователь сделает выбор
                    const { outcome } = await deferredPrompt.userChoice;
                    if (outcome === 'accepted') {
                      console.log('User accepted the install prompt');
                    } else {
                      console.log('User dismissed the install prompt');
                    }
                    // Обнуляем сохраненное событие
                    deferredPrompt = null;
                  } else {
                    // Показываем инструкции по установке
                    document.querySelector('#installInstructions').style.display = 'block';
                    setTimeout(() => {
                      document.querySelector('#installInstructions').style.display = 'none';
                    }, 15000);
                  }
                });

                window.onload = () => {
                    Promise.all([loadNews(), loadBackgroundImage(), displayAds()]);
                };
