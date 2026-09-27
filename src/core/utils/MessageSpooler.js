// MessageSpooler.js - Asynchronous FIFO Narrative Combat Text Spooler
// Mimics classic 1985 C64 CRPG typewriter text pacing with audio mechanical clicks.

export class MessageSpooler {
  /**
   * @param {Object} [options]
   * @param {number} [options.charDelay=20] Delay per character in milliseconds (~20ms)
   * @param {number} [options.lineDelay=800] Delay at end of complete string in milliseconds (800ms)
   * @param {Object} [options.synth=null] Optional BardSynth instance for mechanical clicks
   * @param {Function} [options.onChar=null] Callback invoked on every character yield
   * @param {Function} [options.onAudioClick=null] Callback for audio click
   * @param {Function} [options.onLineStart=null] Callback when a string begins typing
   * @param {Function} [options.onLineComplete=null] Callback when a complete string finishes typing
   * @param {Function} [options.onComplete=null] Callback when entire queue is drained
   * @param {Function} [options.onStateChange=null] Callback when isProcessing flag changes
   */
  constructor(options = {}) {
    this.charDelay = options.charDelay ?? 20;
    this.lineDelay = options.lineDelay ?? 800;
    this.synth = options.synth || null;

    this.onChar = options.onChar || null;
    this.onAudioClick = options.onAudioClick || null;
    this.onLineStart = options.onLineStart || null;
    this.onLineComplete = options.onLineComplete || null;
    this.onComplete = options.onComplete || null;
    this.onStateChange = options.onStateChange || null;

    this.queue = [];
    this.isProcessing = false;
    this._cancelled = false;
    this._listeners = new Map();
  }

  /**
   * Accepts an array of string messages (or a single string) from CombatEngine.js.
   * @param {string[]|string} messages
   */
  enqueue(messages) {
    if (!messages) return;
    const items = Array.isArray(messages) ? messages : [messages];
    if (items.length === 0) return;

    for (const msg of items) {
      if (typeof msg === 'string') {
        this.queue.push(msg);
      } else if (msg != null) {
        this.queue.push(String(msg));
      }
    }

    if (!this.isProcessing) {
      this._processQueue();
    }
  }

  /**
   * Enqueues one or more messages and returns a Promise that resolves when
   * all queued messages have completely finished typing and completed the end-of-string pause.
   * @param {string[]|string} messages
   * @returns {Promise<void>}
   */
  enqueueAndWait(messages) {
    return new Promise((resolve) => {
      if (!messages || (Array.isArray(messages) && messages.length === 0)) {
        resolve();
        return;
      }
      const onDone = () => {
        if (this.queue.length === 0 && !this.isProcessing) {
          this.off('complete', onDone);
          resolve();
        }
      };
      this.on('complete', onDone);
      this.enqueue(messages);
    });
  }

  /**
   * Internal async processor for the FIFO queue.
   */
  async _processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;
    this._cancelled = false;
    this._emitStateChange();

    while (this.queue.length > 0 && !this._cancelled) {
      const currentString = this.queue.shift();
      if (typeof currentString !== 'string') continue;

      this.emit('lineStart', currentString);
      if (this.onLineStart) {
        try { this.onLineStart(currentString); } catch (e) { console.error(e); }
      }

      // Yield characters sequentially (typewriter effect) at ~20ms per character
      for (let i = 0; i < currentString.length; i++) {
        if (this._cancelled) break;
        const char = currentString[i];

        // Yield character callback & event
        this.emit('char', char, currentString, i);
        if (this.onChar) {
          try { this.onChar(char, currentString, i); } catch (e) { console.error(e); }
        }

        // Audio Hook: mechanical click via BardSynth or callback
        if (this.synth && typeof this.synth.playTypewriterClick === 'function') {
          try { this.synth.playTypewriterClick(); } catch {}
        }
        this.emit('audioClick', char);
        if (this.onAudioClick) {
          try { this.onAudioClick(char); } catch {}
        }

        // ~20ms delay per character
        if (this.charDelay > 0) {
          await this._delay(this.charDelay);
        }
      }

      if (this._cancelled) break;

      this.emit('lineComplete', currentString);
      if (this.onLineComplete) {
        try { this.onLineComplete(currentString); } catch (e) { console.error(e); }
      }

      // Pacing: 800ms delay at the end of each complete string
      if (this.lineDelay > 0 && !this._cancelled) {
        await this._delay(this.lineDelay);
      }
    }

    this.isProcessing = false;
    this._emitStateChange();
    this.emit('complete');
    if (this.onComplete) {
      try { this.onComplete(); } catch (e) { console.error(e); }
    }
  }

  /**
   * Cancel currently processing queue and flush all remaining messages.
   */
  clear() {
    this._cancelled = true;
    this.queue.length = 0;
    this.isProcessing = false;
    this._emitStateChange();
  }

  /**
   * Attach an event listener ('char', 'audioClick', 'lineStart', 'lineComplete', 'complete', 'stateChange').
   * @param {string} event
   * @param {Function} handler
   * @returns {Function} Unsubscribe function
   */
  on(event, handler) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(handler);
    return () => this.off(event, handler);
  }

  /**
   * Detach an event listener.
   * @param {string} event
   * @param {Function} handler
   */
  off(event, handler) {
    const handlers = this._listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Emit an event to all registered listeners.
   * @param {string} event
   * @param  {...any} args
   */
  emit(event, ...args) {
    const handlers = this._listeners.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(...args);
        } catch (e) {
          console.error(`[MessageSpooler] Error in '${event}' handler:`, e);
        }
      });
    }
  }

  _emitStateChange() {
    this.emit('stateChange', this.isProcessing);
    if (this.onStateChange) {
      try { this.onStateChange(this.isProcessing); } catch (e) { console.error(e); }
    }
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
