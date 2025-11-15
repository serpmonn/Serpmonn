document.getElementById('driverForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    try {
      // Нормализация телефона
      const phoneInput = this.elements['phone'];
      const phoneValue = phoneInput.value.replace(/\D/g, '');
      let normalizedPhone;
  
      // Обработка разных форматов номера
      if (phoneValue.length === 10) {
        normalizedPhone = '+7' + phoneValue; // 10 цифр → добавляем +7
      } 
      else if (phoneValue.startsWith('8') && phoneValue.length === 11) {
        normalizedPhone = '+7' + phoneValue.substring(1); // 8XXXXXXXXXX → +7XXXXXXXXX
      }
      else if (phoneValue.startsWith('7') && phoneValue.length === 11) {
        normalizedPhone = '+7' + phoneValue.substring(1); // 7XXXXXXXXXX → +7XXXXXXXXX
      }
      else if (phoneValue.startsWith('+7') && phoneValue.length === 12) {
        normalizedPhone = phoneValue; // +7XXXXXXXXXX оставляем как есть
      }
      else {
        throw new Error('Введите 10 цифр номера или 11 цифр, начиная с 8');
      }
  
      // Проверка итогового формата
      if (!/^\+7\d{10}$/.test(normalizedPhone)) {
        throw new Error('Неверный формат номера');
      }
  
      // Определение города
      const citySelect = document.getElementById('citySelect');
      const city = citySelect.value === 'other' 
        ? this.elements['custom_city'].value.trim()
        : citySelect.value;
  
      // Валидация года авто
      const currentYear = new Date().getFullYear();
      if (this.elements['car_year'].value < 2005 || this.elements['car_year'].value > currentYear + 1) {
        throw new Error(`Год выпуска должен быть между 2005 и ${currentYear + 1}`);
      }
  
      // Валидация города
      if (!city || city.length < 2) {
        throw new Error('Укажите корректный город');
      }
  
      // Собираем данные формы
      const formData = {
        name: this.elements['name'].value.trim(),
        phone: normalizedPhone,
        raw_phone: phoneInput.value,
        city: city,
        car_brand: this.elements['car_brand'].value.trim(),
        car_model: this.elements['car_model'].value.trim(),
        car_year: this.elements['car_year'].value,
        date: new Date().toISOString(),
        source: 'landing_page',
        ip: await fetch('https://api.ipify.org?format=json')
              .then(r => r.json())
              .then(data => data.ip)
              .catch(() => 'unknown')
      };
  
      // Отправка на сервер
      const serverResponse = await fetch('https://serpmonn.ru/xcar-drivers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(formData)
      });
  
      if (!serverResponse.ok) {
        const errorData = await serverResponse.json().catch(() => ({}));
        throw new Error(errorData.message || `Ошибка сервера: ${serverResponse.status}`);
      }
  
      // Успешная отправка
      document.getElementById('driverForm').style.display = 'none';
      document.getElementById('successMessage').style.display = 'block';
  
      // Сброс формы через 5 секунд
      setTimeout(() => {
        this.reset();
        document.getElementById('driverForm').style.display = 'block';
        document.getElementById('successMessage').style.display = 'none';
        document.getElementById('citySelect').dispatchEvent(new Event('change'));
      }, 5000);
  
    } catch (error) {
      console.error('Ошибка формы:', error);
      
      // Показываем ошибку
      const errorElement = document.getElementById('form-error') || createErrorElement();
      errorElement.textContent = error.message;
      errorElement.style.display = 'block';
      
      // Фокусируем проблемное поле
      if (error.message.includes('телефон')) {
        this.elements['phone'].focus();
      } else if (error.message.includes('год')) {
        this.elements['car_year'].focus();
      } else if (error.message.includes('город')) {
        if (document.getElementById('citySelect').value === 'other') {
          this.elements['custom_city'].focus();
        } else {
          document.getElementById('citySelect').focus();
        }
      }
    }
  });
  
  function createErrorElement() {
    const errorElement = document.createElement('div');
    errorElement.id = 'form-error';
    errorElement.style.color = '#ff0000';
    errorElement.style.marginTop = '10px';
    errorElement.style.display = 'none';
    document.getElementById('driverForm').appendChild(errorElement);
    return errorElement;
  }
  
  // Обработка выбора "Другой город"
  document.getElementById('citySelect').addEventListener('change', function() {
    const customCityInput = document.getElementById('customCityInput');
    const wasRequired = customCityInput.hasAttribute('required');
    
    customCityInput.style.display = this.value === 'other' ? 'block' : 'none';
    customCityInput.toggleAttribute('required', this.value === 'other');
    
    if (!wasRequired && this.value === 'other') {
      customCityInput.focus();
    }
  });
  
  // Маска для телефона
  document.getElementById('phone').addEventListener('input', function(e) {
    const input = e.target;
    let value = input.value.replace(/\D/g, '');
    
    if (value.length > 0) {
      if (value.startsWith('8') && value.length === 1) {
        value = '7';
      }
      
      let formattedValue = '+7';
      if (value.length > 1) formattedValue += ' (' + value.substring(1, 4);
      if (value.length > 4) formattedValue += ') ' + value.substring(4, 7);
      if (value.length > 7) formattedValue += '-' + value.substring(7, 9);
      if (value.length > 9) formattedValue += '-' + value.substring(9, 11);
      
      input.value = formattedValue;
    }
  });