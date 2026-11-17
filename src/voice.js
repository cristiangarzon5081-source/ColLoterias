/**
 * voice.js
 * Smart voice search with the Web Speech API.
 * Features:
 *  - Continuous listening with phrase detection
 *  - Multi-language support (es-CO primary, es-ES fallback)
 *  - Synonym / alias normalization via data.js VOICE_ALIASES
 *  - Visual feedback states (idle → listening → processing → result)
 *  - Graceful degradation when mic is unavailable
 */

class VoiceSearch {
  constructor({ onResult, onStateChange, onError }) {
    this.onResult = onResult;
    this.onStateChange = onStateChange;
    this.onError = onError;

    this.recognition = null;
    this.listening = false;
    this.supported = false;
    this.interimText = '';
    this.finalText = '';
    this.restartTimeout = null;

    this._init();
  }

  _init() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      this.supported = false;
      this.onError('Tu navegador no soporta búsqueda por voz. Usa Chrome o Edge.');
      return;
    }
    this.supported = true;

    const r = new SpeechRecognition();
    r.lang = 'es-CO';
    r.continuous = false;
    r.interimResults = true;
    r.maxAlternatives = 5;

    r.onstart = () => {
      this.listening = true;
      this.interimText = '';
      this.finalText = '';
      this.onStateChange('listening', '🎙️ Te escucho... habla ahora');
    };

    r.onresult = (event) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          // Pick the best alternative based on confidence or first
          let best = result[0].transcript;
          let bestConf = result[0].confidence;
          for (let j = 1; j < result.length; j++) {
            if (result[j].confidence > bestConf) {
              best = result[j].transcript;
              bestConf = result[j].confidence;
            }
          }
          final += best;
        } else {
          interim += result[0].transcript;
        }
      }

      this.interimText = interim;
      if (final) this.finalText += final;

      // Show live interim
      const displayText = this.finalText + interim;
      if (displayText) {
        this.onStateChange('interim', `"${displayText}"`);
      }
    };

    r.onend = () => {
      this.listening = false;
      if (this.finalText.trim()) {
        const normalized = normalizeVoiceQuery(this.finalText.trim());
        this.onStateChange('done', `✅ Buscando: "${normalized}"`);
        this.onResult(normalized, this.finalText.trim());
      } else if (this.interimText.trim()) {
        // Partial — try with interim
        const normalized = normalizeVoiceQuery(this.interimText.trim());
        this.onStateChange('done', `✅ Buscando: "${normalized}"`);
        this.onResult(normalized, this.interimText.trim());
      } else {
        this.onStateChange('idle', '');
      }
    };

    r.onerror = (event) => {
      this.listening = false;
      const messages = {
        'no-speech':          '🔇 No escuché nada. Intenta de nuevo.',
        'audio-capture':      '🎙️ No se encontró micrófono.',
        'not-allowed':        '🚫 Permiso de micrófono denegado. Actívalo en la configuración del navegador.',
        'network':            '🌐 Error de red en el reconocimiento.',
        'aborted':            '',
        'service-not-allowed':'🚫 Servicio de voz no disponible.',
      };
      const msg = messages[event.error] || `Error: ${event.error}`;
      if (msg) this.onStateChange('error', msg);
      else this.onStateChange('idle', '');
    };

    r.onnomatch = () => {
      this.listening = false;
      this.onStateChange('error', '🤔 No entendí. Intenta hablar más claro.');
    };

    r.onsoundstart = () => {
      this.onStateChange('sound', '🎤 Detectando audio...');
    };

    r.onspeechstart = () => {
      this.onStateChange('speech', '🗣️ Escuchando...');
    };

    this.recognition = r;
  }

  toggle() {
    if (!this.supported) {
      this.onError('Búsqueda por voz no disponible en este navegador.');
      return false;
    }
    if (this.listening) {
      this.stop();
    } else {
      this.start();
    }
    return true;
  }

  start() {
    if (!this.supported || this.listening) return;
    try {
      this.recognition.start();
    } catch (e) {
      // Already started — stop and restart
      try { this.recognition.stop(); } catch (_) {}
      clearTimeout(this.restartTimeout);
      this.restartTimeout = setTimeout(() => {
        try { this.recognition.start(); } catch (_) {}
      }, 300);
    }
  }

  stop() {
    if (!this.supported) return;
    try { this.recognition.stop(); } catch (_) {}
    this.listening = false;
  }

  isListening() { return this.listening; }
  isSupported() { return this.supported; }
}
