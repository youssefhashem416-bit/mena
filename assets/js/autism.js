/**
 * معًا - عالم الأبطال الصغار | Autism Activities for Toddlers (Ages 3-6)
 */

const AutismActivities = {
  selectedMessage: '',
  selectedEmotion: '',

  init() {
    this.bindScheduleItems();
  },

  showTab(tabId, button) {
    document.querySelectorAll('.activity-box').forEach(box => {
      box.classList.remove('active');
    });

    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });

    const activeBox = document.getElementById(tabId);
    if (activeBox) {
      activeBox.classList.add('active');
    }

    if (button) {
      button.classList.add('active');
    }

    SpeechEngine.stop();
    AppCore.playSound('boing');
  },

  selectMessage(element, message, speechPrompt) {
    this.selectedMessage = message;

    document.querySelectorAll('#communication .interactive-card').forEach(card => {
      card.classList.remove('selected');
    });
    if (element) {
      element.classList.add('selected');
    }

    const resultBox = document.getElementById('messageResult');
    if (resultBox) {
      resultBox.innerHTML = `
        <span><i class="fa-solid fa-volume-high" style="color:var(--candy-pink); margin-left:8px;"></i> ${message}</span>
        <button class="btn btn-sm btn-primary" onclick="SpeechEngine.speak('${speechPrompt || message}')">اسمعني مرة ثانية 🔊</button>
      `;
    }

    AppCore.playSound('pop');
    SpeechEngine.speak(speechPrompt || message);
  },

  selectEmotion(element, emotion, speechPrompt) {
    this.selectedEmotion = emotion;

    document.querySelectorAll('#emotions .interactive-card').forEach(card => {
      card.classList.remove('selected');
    });
    if (element) {
      element.classList.add('selected');
    }

    const resultBox = document.getElementById('emotionResult');
    if (resultBox) {
      resultBox.innerHTML = `
        <span><i class="fa-solid fa-face-smile" style="color:var(--candy-pink); margin-left:8px;"></i> ${emotion}</span>
        <button class="btn btn-sm btn-primary" onclick="SpeechEngine.speak('${speechPrompt || emotion}')">اسمعني مرة ثانية 🔊</button>
      `;
    }

    AppCore.playSound('pop');
    SpeechEngine.speak(speechPrompt || emotion);
  },

  bindScheduleItems() {
    document.querySelectorAll('.schedule-item').forEach(item => {
      item.addEventListener('click', () => {
        const isDone = item.classList.toggle('completed');
        if (isDone) {
          AppCore.playSound('star');
          const title = item.querySelector('.schedule-text')?.textContent || '';
          SpeechEngine.speak(`شاطر يا بطل! أحسنت، خلصنا: ${title}`);
        } else {
          AppCore.playSound('pop');
        }
      });
    });
  },

  resetSchedule() {
    document.querySelectorAll('.schedule-item').forEach(item => {
      item.classList.remove('completed');
    });
    AppCore.playSound('pop');
    AppCore.notify('تم!', 'أعدنا جدول الأنشطة من جديد للبدء من أول اليوم.', 'success');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  AutismActivities.init();
});
