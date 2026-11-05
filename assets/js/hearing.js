/**
 * معًا - عالم بلا حواجز | Hearing Impairment Educational & Visual Communication
 */

const HearingActivities = {
  init() {},

  flashVisualCue() {
    const flash = document.createElement('div');
    flash.style.position = 'fixed';
    flash.style.inset = '0';
    flash.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
    flash.style.zIndex = '9999';
    flash.style.pointerEvents = 'none';
    flash.style.transition = 'opacity 0.4s ease';
    document.body.appendChild(flash);
    setTimeout(() => {
      flash.style.opacity = '0';
      setTimeout(() => flash.remove(), 400);
    }, 200);
  },

  selectItem(element, title, description) {
    document.querySelectorAll('.interactive-card').forEach(c => c.classList.remove('selected'));
    if (element) element.classList.add('selected');
    this.flashVisualCue();
    AppCore.playSound('pop');

    if (description) {
      SpeechEngine.speak(description);
    }
  },

  checkAnswer(answer) {
    const quizResult = document.getElementById('quizResult');
    if (answer === 'تفاحة') {
      AppCore.celebrate();
      this.flashVisualCue();
      if (quizResult) {
        quizResult.innerHTML = `🌟 <strong style="color:var(--success); font-size:1.2rem;">إجابة صحيحة وممتازة! (تفاحة 🍎)</strong>`;
      }
      SpeechEngine.speak('إجابة صحيحة، هذه تفاحة.');
    } else {
      AppCore.playSound('error');
      if (quizResult) {
        quizResult.innerHTML = `⚠️ <strong style="color:var(--danger); font-size:1.1rem;">ليست هذه الإجابة الصحيحة. انظر للصورة بدقة وحاول مجددًا!</strong>`;
      }
      SpeechEngine.speak('حاول مرة أخرى.');
    }
  },

  readCustomText() {
    const text = document.getElementById('speechText')?.value;
    if (!text || !text.trim()) {
      AppCore.notify('حقل فارغ', 'يرجى كتابة جملة في الصندوق لتشغيل الصوت.', 'warning');
      return;
    }
    this.flashVisualCue();
    SpeechEngine.speak(text);
  }
};

