/**
 * voice.js — Motor de búsqueda por voz
 * Web Speech API · es-CO · múltiples alternativas · normalización inteligente
 */
class VoiceSearch {
  constructor({ onResult, onStateChange, onError }) {
    this.onResult = onResult;
    this.onStateChange = onStateChange;
    this.onError = onError;
    this.recognition = null;
    this.listening = false;
    this.supported = false;
    this._init();
  }

  _init() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      this.supported = false;
      return;
    }
    this.supported = true;
    const r = new SR();
    r.lang = 'es-CO';
    r.continuous = false;
    r.interimResults = true;
    r.maxAlternatives = 5;

    r.onstart  = () => { this.listening = true; this.onStateChange('listening', '🎙️ Escuchando...'); };
    r.onspeechstart = () => this.onStateChange('speech', '🗣️ Detecté tu voz...');

    r.onresult = (e) => {
      let interim = '', final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) {
          // Tomar el mejor alternativo con mayor confianza
          let best = res[0].transcript, bestConf = res[0].confidence;
          for (let j = 1; j < res.length; j++) {
            if (res[j].confidence > bestConf) { best = res[j].transcript; bestConf = res[j].confidence; }
          }
          final += best;
        } else {
          interim += res[0].transcript;
        }
      }
      const display = final || interim;
      if (display) this.onStateChange('interim', `"${display}"`);
      this._finalText = (this._finalText || '') + final;
      this._interimText = interim;
    };

    r.onend = () => {
      this.listening = false;
      const text = (this._finalText || this._interimText || '').trim();
      this._finalText = '';
      this._interimText = '';
      if (text) {
        const normalized = normalizeVoiceQuery(text);
        this.onStateChange('done', `✅ Buscando: "${normalized}"`);
        this.onResult(normalized, text);
        setTimeout(() => this.onStateChange('idle', ''), 3000);
      } else {
        this.onStateChange('idle', '');
      }
    };

    r.onerror = (e) => {
      this.listening = false;
      this._finalText = '';
      this._interimText = '';
      const msgs = {
        'no-speech':     '🔇 No escuché nada. Presiona el micrófono e intenta de nuevo.',
        'audio-capture': '🎤 No se encontró micrófono.',
        'not-allowed':   '🚫 Permiso de micrófono denegado. Actívalo en la barra del navegador.',
        'network':       '🌐 Error de red en el reconocimiento de voz.',
        'aborted':       '',
      };
      const msg = msgs[e.error] ?? `Error de voz: ${e.error}`;
      this.onStateChange(msg ? 'error' : 'idle', msg);
      if (msg) setTimeout(() => this.onStateChange('idle', ''), 4000);
    };

    this.recognition = r;
  }

  toggle() {
    if (!this.supported) { this.onError('Tu navegador no soporta búsqueda por voz. Usa Chrome o Edge.'); return; }
    if (this.listening) { try { this.recognition.stop(); } catch(_){} }
    else {
      this._finalText = '';
      this._interimText = '';
      try { this.recognition.start(); }
      catch (_) { setTimeout(() => { try { this.recognition.start(); } catch(_){} }, 400); }
    }
  }

  isSupported() { return this.supported; }
  isListening() { return this.listening; }
}
