/**
 * معًا - عالم بلا حواجز | Global Accessibility Controller
 * Manages font scaling, high contrast, dark mode, dyslexia font, and persistent storage.
 */

const A11y = {
  settings: {
    fontSize: 16,
    highContrast: false,
    darkMode: false,
    dyslexiaFont: false,
    grayscale: false,
    ruler: false,
    sound: true
  },

  STORAGE_KEY: 'maa_a11y_prefs_v2',

  init() {
    this.loadSettings();
    this.applySettings();
    this.bindControls();
  },

  loadSettings() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        this.settings = Object.assign(this.settings, JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Could not read a11y preferences from localStorage', e);
    }
  },

  saveSettings() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.settings));
    } catch (e) {
      console.warn('Could not save a11y preferences to localStorage', e);
    }
  },

  applySettings() {
    // 1. Font Size
    document.documentElement.style.fontSize = `${this.settings.fontSize}px`;
    const fontDisplay = document.getElementById('fontSizeDisplay');
    if (fontDisplay) fontDisplay.textContent = `${this.settings.fontSize}px`;

    // 2. High Contrast
    if (this.settings.highContrast) {
      document.body.classList.add('high-contrast');
      document.body.classList.remove('dark-mode');
    } else {
      document.body.classList.remove('high-contrast');
    }

    // 3. Dark Mode
    if (this.settings.darkMode && !this.settings.highContrast) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }

    // 4. Dyslexia Font
    if (this.settings.dyslexiaFont) {
      document.body.classList.add('dyslexia-font');
    } else {
      document.body.classList.remove('dyslexia-font');
    }

    // 5. Grayscale
    if (this.settings.grayscale) {
      document.body.classList.add('grayscale-mode');
    } else {
      document.body.classList.remove('grayscale-mode');
    }

    // 6. Reading Ruler
    if (this.settings.ruler) {
      document.body.classList.add('ruler-active');
    } else {
      document.body.classList.remove('ruler-active');
    }

    // 7. Sound
    if (typeof AppCore !== 'undefined') {
      AppCore.soundEnabled = this.settings.sound;
    }

    // Update button states
    this.updateButtonStates();
  },

  changeFont(change) {
    this.settings.fontSize = Math.max(12, Math.min(26, this.settings.fontSize + change));
    this.applySettings();
    this.saveSettings();
    AppCore.playSound('click');
  },

  setFontSize(size) {
    this.settings.fontSize = Math.max(12, Math.min(26, parseInt(size, 10)));
    this.applySettings();
    this.saveSettings();
  },

  toggleContrast() {
    this.settings.highContrast = !this.settings.highContrast;
    if (this.settings.highContrast) {
      this.settings.darkMode = false;
    }
    this.applySettings();
    this.saveSettings();
    AppCore.playSound('click');
  },

  toggleDarkMode() {
    this.settings.darkMode = !this.settings.darkMode;
    if (this.settings.darkMode) {
      this.settings.highContrast = false;
    }
    this.applySettings();
    this.saveSettings();
    AppCore.playSound('click');
  },

  toggleDyslexiaFont() {
    this.settings.dyslexiaFont = !this.settings.dyslexiaFont;
    this.applySettings();
    this.saveSettings();
    AppCore.playSound('click');
  },

  toggleGrayscale() {
    this.settings.grayscale = !this.settings.grayscale;
    this.applySettings();
    this.saveSettings();
    AppCore.playSound('click');
  },

  toggleRuler() {
    this.settings.ruler = !this.settings.ruler;
    this.applySettings();
    this.saveSettings();
    AppCore.playSound('click');
  },

  toggleSound() {
    this.settings.sound = !this.settings.sound;
    this.applySettings();
    this.saveSettings();
  },

  resetSettings() {
    this.settings = {
      fontSize: 16,
      highContrast: false,
      darkMode: false,
      dyslexiaFont: false,
      grayscale: false,
      ruler: false,
      sound: true
    };
    this.applySettings();
    this.saveSettings();
    AppCore.playSound('pop');
    AppCore.notify('تمت استعادة الإعدادات', 'تمت استعادة إعدادات سهولة الاستخدام الافتراضية بنجاح.', 'success');
  },

  updateButtonStates() {
    document.querySelectorAll('[data-a11y="contrast"]').forEach(btn => {
      btn.classList.toggle('active', this.settings.highContrast);
    });
    document.querySelectorAll('[data-a11y="dark"]').forEach(btn => {
      btn.classList.toggle('active', this.settings.darkMode);
    });
    document.querySelectorAll('[data-a11y="dyslexia"]').forEach(btn => {
      btn.classList.toggle('active', this.settings.dyslexiaFont);
    });
    document.querySelectorAll('[data-a11y="ruler"]').forEach(btn => {
      btn.classList.toggle('active', this.settings.ruler);
    });
  },

  bindControls() {
    // Range input sync
    const fontSlider = document.getElementById('fontSize');
    if (fontSlider) {
      fontSlider.value = this.settings.fontSize;
      fontSlider.addEventListener('input', (e) => {
        this.setFontSize(e.target.value);
      });
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  A11y.init();
});

