/**
 * معًا - عالم بلا حواجز | Visual Impairment Screen & Text Reader Module
 */

const VisualReader = {
  init() {
    this.bindKeyboardShortcuts();
  },

  readInput() {
    const textarea = document.getElementById('readerText');
    const text = textarea?.value;

    if (!text || !text.trim()) {
      SpeechEngine.speak('الصندوق فارغ. يرجى كتابة نص أو اختيار أحد النماذج الجاهزة للاستماع إليها.');
      return;
    }

    SpeechEngine.speak(text);
  },

  stopReading() {
    SpeechEngine.stop();
  },

  clearText() {
    const textarea = document.getElementById('readerText');
    if (textarea) {
      textarea.value = '';
      textarea.focus();
    }
    SpeechEngine.speak('تم مسح النص بنجاح.');
    AppCore.playSound('pop');
  },

  usePreset(element, text) {
    document.querySelectorAll('.presets-grid .interactive-card').forEach(c => c.classList.remove('selected'));
    if (element) element.classList.add('selected');

    const textarea = document.getElementById('readerText');
    if (textarea) {
      textarea.value = text;
    }
    AppCore.playSound('pop');
    SpeechEngine.speak(text);
  },

  bindKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Escape stops speech immediately
      if (e.key === 'Escape') {
        SpeechEngine.stop();
      }
      // Ctrl + Enter plays speech
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        this.readInput();
      }
    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  VisualReader.init();
});

