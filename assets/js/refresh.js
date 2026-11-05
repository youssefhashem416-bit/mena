/**
 * معًا - عالم بلا حواجز | System Refresh & Diagnostic Controller
 */

const RefreshHub = {
  autoRefreshTimer: null,

  init() {
    this.runSystemDiagnostics();
    this.populateVoicesList();
  },

  /**
   * Reset all session data, preferences, and checklist states
   */
  fullReset() {
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        title: 'هل تريد إعادة ضبط كامل المنصة؟',
        text: 'سيتم مسح كافة الإعدادات والتقدم المسجل في قسمي التوحد ومتلازمة داون واستعادة الحالة الافتراضية.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'نعم، إعادة ضبط شاملة',
        cancelButtonText: 'إلغاء'
      }).then((result) => {
        if (result.isConfirmed) {
          this.executeReset();
        }
      });
    } else {
      if (confirm('هل تريد إعادة ضبط كامل المنصة؟')) {
        this.executeReset();
      }
    }
  },

  executeReset() {
    localStorage.clear();
    A11y.resetSettings();
    AppCore.celebrate();
    AppCore.notify('تمت إعادة الضبط بنجاح', 'تمت استعادة كافة الإعدادات والأنشطة إلى حالتها الابتدائية.', 'success');
  },

  /**
   * Apply predefined accessibility profiles for Autism & Down Syndrome
   */
  applyProfile(profile) {
    if (profile === 'autism') {
      // Profile for autism: calm environment, soothing dark mode, dyslexia font
      A11y.settings.fontSize = 18;
      A11y.settings.highContrast = false;
      A11y.settings.darkMode = true;
      A11y.settings.dyslexiaFont = true;
      A11y.settings.ruler = false;
      A11y.applySettings();
      A11y.saveSettings();
      SpeechEngine.setRate(0.75);
      SpeechEngine.speak('تم تفعيل بروفايل طيف التوحد: بيئة مهدئة وخط مريح ونطق هادئ.');
    } else if (profile === 'down') {
      // Profile for Down Syndrome: bright cheerful layout, large friendly font (20px), gentle speech rate (0.80)
      A11y.settings.fontSize = 20;
      A11y.settings.highContrast = false;
      A11y.settings.darkMode = false;
      A11y.settings.dyslexiaFont = false;
      A11y.settings.ruler = false;
      A11y.applySettings();
      A11y.saveSettings();
      SpeechEngine.setRate(0.80);
      SpeechEngine.speak('تم تفعيل بروفايل متلازمة داون: خط كبير واضح، وألوان مشجعة، ونطق هادئ.');
    } else if (profile === 'default') {
      A11y.resetSettings();
      SpeechEngine.setRate(0.85);
      SpeechEngine.speak('تمت العودة للبروفايل الافتراضي القياسي.');
    }
    AppCore.celebrate();
  },

  /**
   * Run System Health Check
   */
  runSystemDiagnostics() {
    const speechSupport = 'speechSynthesis' in window;
    const audioSupport = !!(window.AudioContext || window.webkitAudioContext);
    const storageSupport = typeof Storage !== 'undefined';

    const diagList = document.getElementById('diagList');
    if (diagList) {
      diagList.innerHTML = `
        <div class="schedule-item">
          <div class="schedule-title-area">
            <span class="emoji">🗣️</span>
            <span>محرك النطق الصوتي (SpeechSynthesis):</span>
          </div>
          <span class="schedule-time-tag" style="background:${speechSupport ? '#d1fae5' : '#fee2e2'}; color:${speechSupport ? '#065f46' : '#991b1b'};">
            ${speechSupport ? 'مدعوم وفعال ✓' : 'غير مدعوم ✗'}
          </span>
        </div>
        <div class="schedule-item">
          <div class="schedule-title-area">
            <span class="emoji">🎵</span>
            <span>محرك المؤثرات الصوتية (Web Audio API):</span>
          </div>
          <span class="schedule-time-tag" style="background:${audioSupport ? '#d1fae5' : '#fee2e2'}; color:${audioSupport ? '#065f46' : '#991b1b'};">
            ${audioSupport ? 'مدعوم وفعال ✓' : 'غير مدعوم ✗'}
          </span>
        </div>
        <div class="schedule-item">
          <div class="schedule-title-area">
            <span class="emoji">💾</span>
            <span>الذاكرة المحلية لحفظ الإعدادات (LocalStorage):</span>
          </div>
          <span class="schedule-time-tag" style="background:${storageSupport ? '#d1fae5' : '#fee2e2'}; color:${storageSupport ? '#065f46' : '#991b1b'};">
            ${storageSupport ? 'مدعوم وفعال ✓' : 'غير مدعوم ✗'}
          </span>
        </div>
        <div class="schedule-item">
          <div class="schedule-title-area">
            <span class="emoji">🖥️</span>
            <span>دقة الشاشة الحالية:</span>
          </div>
          <span class="schedule-time-tag">
            ${window.innerWidth} × ${window.innerHeight} بكسل
          </span>
        </div>
      `;
    }
  },

  populateVoicesList() {
    if (!('speechSynthesis' in window)) return;
    const listEl = document.getElementById('voicesList');
    if (!listEl) return;

    const voices = window.speechSynthesis.getVoices();
    const arabicVoices = voices.filter(v => v.lang.toLowerCase().startsWith('ar'));

    if (arabicVoices.length === 0) {
      listEl.innerHTML = `<p style="color:var(--text-muted);">لم يتم العثور على أصوات عربية مثبتة على نظام التشغيل حتى الآن. المتصفح سيحاول استخدام الصوت الافتراضي.</p>`;
    } else {
      listEl.innerHTML = arabicVoices.map(v => `
        <div class="schedule-item">
          <div class="schedule-title-area">
            <i class="fa-solid fa-microphone" style="color:var(--primary);"></i>
            <span>${v.name}</span>
          </div>
          <span class="schedule-time-tag">${v.lang}</span>
        </div>
      `).join('');
    }
  },

  toggleAutoRefresh(seconds) {
    if (this.autoRefreshTimer) {
      clearInterval(this.autoRefreshTimer);
      this.autoRefreshTimer = null;
    }

    if (seconds > 0) {
      const statusEl = document.getElementById('autoRefreshStatus');
      if (statusEl) statusEl.textContent = `التحديث التلقائي قيد التشغيل: كل ${seconds} ثانية.`;

      this.autoRefreshTimer = setInterval(() => {
        window.location.reload();
      }, seconds * 1000);

      AppCore.notify('تم التفعيل', `سيتم تحديث الصفحة تلقائيًا كل ${seconds} ثانية.`, 'info');
    } else {
      const statusEl = document.getElementById('autoRefreshStatus');
      if (statusEl) statusEl.textContent = `التحديث التلقائي معطل.`;
      AppCore.notify('تم الإلغاء', 'تم تعطيل التحديث التلقائي.', 'info');
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  RefreshHub.init();
  if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = () => RefreshHub.populateVoicesList();
  }
});
