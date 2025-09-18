(function() {
	try {
		var lang = (document.documentElement.getAttribute('lang') || '').toLowerCase();
		if (!lang.startsWith('en')) return;

		var EN = {
			copy: 'Copy',
			copied: 'Code copied!',
			noPromo: 'No promo code',
			descriptionLater: 'Description will be available later',
			details: 'More details',
			hide: 'Hide',
			validUntil: 'Valid until',
			expired: 'Expired',
			goToPartner: 'Go to partner',
			adPrefix: 'Ad.',
			promosUpdated: 'Promo codes updated!',
			conditions: 'Conditions:'
		};

		var originals = {
			createPromoCard: window.createPromoCard,
			toggleDetails: window.toggleDetails,
			showToast: window.showToast,
			formatDate: window.formatDate,
			updateCategorySelect: window.updateCategorySelect
		};

		// Date formatting to en-US
		if (typeof originals.formatDate === 'function') {
			window.formatDate = function(date) {
				try {
					return date.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' });
				} catch (e) {
					return originals.formatDate ? originals.formatDate(date) : date.toLocaleDateString();
				}
			};
		}

		// Toast messages mapping
		if (typeof originals.showToast === 'function') {
			window.showToast = function(message, type) {
				try {
					if (message === 'Код скопирован!') message = EN.copied;
					if (message === 'Промокоды обновлены!') message = EN.promosUpdated;
				} catch (_) {}
				return originals.showToast(message, type);
			};
		}

		// Toggle details label
		if (typeof originals.toggleDetails === 'function') {
			window.toggleDetails = function(button) {
				originals.toggleDetails(button);
				try {
					var content = button.nextElementSibling;
					var textSpan = button.querySelector('.details-text');
					var isExpanded = content && content.style.display === 'block';
					if (textSpan) textSpan.textContent = isExpanded ? EN.hide : EN.details;
				} catch (_) {}
			};
		}

		// Localize created promo card elements
		if (typeof originals.createPromoCard === 'function') {
			window.createPromoCard = function(promo, isTopOffer) {
				var card = originals.createPromoCard(promo, isTopOffer);
				if (!card) return card;
				try {
					var codeBtn = card.querySelector('.code .submit-btn');
					if (codeBtn) {
						var codeVal = promo && promo.promocode ? String(promo.promocode) : '';
						codeBtn.textContent = EN.copy;
						codeBtn.setAttribute('aria-label', EN.copy + (codeVal ? (' ' + codeVal) : ''));
					}

					var codeP = card.querySelector('.code');
					if (codeP && /Без промокода/i.test(codeP.textContent.trim())) {
						codeP.textContent = EN.noPromo;
					}

					var desc = card.querySelector('.description');
					if (desc && /Описание будет доступно позже/i.test(desc.textContent.trim())) {
						desc.textContent = EN.descriptionLater;
					}

					var detailsText = card.querySelector('.details-btn .details-text');
					if (detailsText) {
						detailsText.textContent = EN.details;
					}

					var expiry = card.querySelector('.expiry');
					if (expiry) {
						var expired = expiry.classList.contains('expired');
						var dateStr;
						try {
							var dt = new Date(card.dataset.expiry || '');
							dateStr = (window.formatDate ? window.formatDate(dt) : dt.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' }));
						} catch (_) {
							dateStr = expiry.textContent.replace(/.*?:\s*/, '').trim();
						}
						expiry.textContent = EN.validUntil + ': ' + dateStr + (expired ? (' (' + EN.expired + ')') : '');
					}

					var partnerLink = card.querySelector('.register-link');
					if (partnerLink) {
						partnerLink.textContent = EN.goToPartner;
					}

					var ad = card.querySelector('.ad');
					if (ad) {
						ad.textContent = ad.textContent.replace(/^Реклама\./, EN.adPrefix);
					}

					var condStrong = card.querySelector('p > strong');
					if (condStrong && /Условия/i.test(condStrong.textContent)) {
						condStrong.textContent = EN.conditions;
					}
				} catch (_) {}
				return card;
			};
		}

		// Adjust category labels after original update
		var enLabels = {
			'еда': 'Food & Restaurants',
			'продукты': 'Groceries',
			'развлечения': 'Entertainment',
			'товары': 'Goods',
			'услуги': 'Services',
			'другие': 'Other',
			'игры': 'Games',
			'гаджеты': 'Gadgets',
			'сервисы': 'Services',
			'мода': 'Fashion',
			'здоровье': 'Health',
			'транспорт': 'Transport',
			'путешествия': 'Travel',
			'финансы': 'Finance',
			'страхование': 'Insurance',
			'фитнес': 'Fitness'
		};

		if (typeof originals.updateCategorySelect === 'function') {
			window.updateCategorySelect = function(categories) {
				originals.updateCategorySelect(categories);
				try {
					var select = document.getElementById('categorySelect');
					if (!select) return;
					if (select.options.length > 0 && /Все категории/i.test(select.options[0].textContent)) {
						select.options[0].textContent = 'All categories';
					}
					for (var i = 0; i < select.options.length; i++) {
						var opt = select.options[i];
						var val = opt.value;
						if (enLabels[val]) opt.textContent = enLabels[val];
					}
				} catch (_) {}
			};
		}

		// Translate any pre-rendered static content (failsafe)
		document.addEventListener('DOMContentLoaded', function() {
			try {
				Array.prototype.forEach.call(document.querySelectorAll('.details-btn .details-text'), function(el) { el.textContent = EN.details; });
				Array.prototype.forEach.call(document.querySelectorAll('.register-link'), function(a) {
					if (/Перейти к партнёру/i.test(a.textContent)) a.textContent = EN.goToPartner;
				});
				Array.prototype.forEach.call(document.querySelectorAll('.code .submit-btn'), function(btn) {
					if (/Копировать/i.test(btn.textContent)) btn.textContent = EN.copy;
				});
				Array.prototype.forEach.call(document.querySelectorAll('.code'), function(p) {
					if (/Без промокода/i.test(p.textContent)) p.textContent = EN.noPromo;
				});
				Array.prototype.forEach.call(document.querySelectorAll('.ad'), function(p) {
					p.textContent = p.textContent.replace(/^Реклама\./, EN.adPrefix);
				});
			} catch (_) {}
		});
	} catch (e) {
		console.error('[EN overlay] Failed to initialize:', e);
	}
})();

