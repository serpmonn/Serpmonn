import { getMessages } from '../i18n-loader.js';
import { showShareToast } from './quota-result.js';

function initVoiceInput() {
  const t = getMessages();
  // Проверяем поддержку MediaRecorder API
  if (!navigator.mediaDevices || !window.MediaRecorder) {
    console.warn('[VOICE] MediaRecorder API не поддерживается');
    return;
  }

  const voiceBtn = document.getElementById('voice-input-btn');
  const searchInput = document.querySelector('#ai-search-form input[name="q"]');
  
  if (!voiceBtn || !searchInput) {
    console.warn('[VOICE] Не найдены элементы кнопки или поля ввода');
    return;
  }

  // Показываем кнопку
  voiceBtn.style.display = 'inline-flex';
  searchInput.closest('.search-input-wrapper')?.classList.add('has-voice');

  let mediaRecorder = null;
  let audioChunks = [];
  let isRecording = false;

  // Индикатор записи
  let recordingIndicator = document.querySelector('.voice-recording-indicator');
  if (!recordingIndicator) {
    recordingIndicator = document.createElement('div');
    recordingIndicator.className = 'voice-recording-indicator';
    recordingIndicator.innerHTML = `
      <div class="voice-recording-dot"></div>
      <span>${t.recording}</span>
    `;
    document.body.appendChild(recordingIndicator);
  }

  voiceBtn.addEventListener('click', async () => {
    if (isRecording) {
      // Остановка записи
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
      }
      return;
    }

    try {
      // Запрашиваем доступ к микрофону
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        } 
      });

      // Определяем поддерживаемый MIME type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
        ? 'audio/ogg;codecs=opus'
        : 'audio/webm';

      mediaRecorder = new MediaRecorder(stream, { 
        mimeType,
        audioBitsPerSecond: 128000
      });
      
      audioChunks = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        isRecording = false;
        voiceBtn.classList.remove('listening');
        voiceBtn.disabled = false;
        recordingIndicator.classList.remove('active');

        // Останавливаем все треки микрофона
        stream.getTracks().forEach(track => track.stop());

        if (audioChunks.length === 0) {
          showShareToast(t.zeroBytes);
          searchInput.placeholder = getMessages().askAnything;
          return;
        }

        const audioBlob = new Blob(audioChunks, { type: mimeType });

        // Отправляем на сервер для распознавания
        await sendAudioForRecognition(audioBlob, mimeType);
      };

      mediaRecorder.onerror = (event) => {
        console.error('[VOICE] Ошибка MediaRecorder:', event.error);
        showShareToast(t.audioRecordError);
        resetVoiceUI();
      };

      // Начинаем запись
      mediaRecorder.start();
      isRecording = true;
      voiceBtn.classList.add('listening');
      voiceBtn.disabled = false;
      recordingIndicator.classList.add('active');
      searchInput.value = '';
      searchInput.placeholder = t.speakNow;

      // Автоостановка через 30 секунд
      const autoStopTimeout = setTimeout(() => {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
          showShareToast(t.autoStopped);
        }
      }, 30000);

      mediaRecorder.addEventListener('stop', () => {
        clearTimeout(autoStopTimeout);
      }, { once: true });

    } catch (error) {
      console.error('[VOICE] Ошибка доступа к микрофону:', error);
      
      let errorMsg = t.micAccessFailed;
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMsg = t.micDenied;
      } else if (error.name === 'NotFoundError') {
        errorMsg = t.micNotFound;
      } else if (error.name === 'NotReadableError') {
        errorMsg = t.micBusy;
      }
      
      showShareToast(errorMsg);
      resetVoiceUI();
    }
  });

  async function sendAudioForRecognition(audioBlob, mimeType) {
    try {
      searchInput.placeholder = t.recognizing;
      
      const response = await fetch('/voice/stt', {
        method: 'POST',
        headers: {
          'Content-Type': mimeType
        },
        body: audioBlob
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const text = data.text || '';

      if (!text) {
        showShareToast(t.speechNotRecognized);
        searchInput.placeholder = getMessages().askAnything;
        return;
      }

      searchInput.value = text;
      searchInput.placeholder = t.pressEnter;
      searchInput.focus();
      
      showShareToast(`${t.recognizedPrefix}${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`);
      
      // ✅ ФЛАГ: Помечаем, что это голосовой ввод
      searchInput.dataset.voiceInput = 'true';
      
      // ✅ АВТООТПРАВКА: Ждём 1 секунду, затем ОДИН РАЗ отправляем
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const form = document.getElementById('ai-search-form');
      if (form) {
        const submitEvent = new Event('submit', { 
          bubbles: true, 
          cancelable: true 
        });
        form.dispatchEvent(submitEvent);
      }

    } catch (error) {
      console.error('[VOICE] Ошибка распознавания:', error);
      showShareToast(t.speechRecognitionError);
      searchInput.placeholder = getMessages().askAnything;
    }
  }

  function resetVoiceUI() {
    isRecording = false;
    voiceBtn.classList.remove('listening');
    voiceBtn.disabled = false;
    recordingIndicator.classList.remove('active');
    searchInput.placeholder = getMessages().askAnything;
  }
}

export { initVoiceInput };
