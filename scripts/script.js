
		console.log('JavaScript файл подключен и работает.');
		let pieces = [];
                let showAds = false; // Установи в true, чтобы показывать рекламу
                let deferredPrompt;

		const cookieConsent = document.getElementById('cookie-consent');
                const acceptCookiesButton = document.getElementById('accept-cookies');
                const declineCookiesButton = document.getElementById('decline-cookies');

		    function setCookie(name, value, days) {
			let expires = "";
			if (days) {
			    const date = new Date();
			    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
			    expires = "; expires=" + date.toUTCString();
			}
			document.cookie = name + "=" + (value || "") + expires + "; path=/";
		    }


		    function getCookie(name) {
			    const value = `; ${document.cookie}`;
			    const parts = value.split(`; ${name}=`);
			    if (parts.length === 2) {
			        const cookieValue = parts.pop().split(';').shift();
			        return cookieValue;
			    }
			    return null;
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
                    Promise.all([loadNews(), loadBackgroundImage() ]);
                };
});
