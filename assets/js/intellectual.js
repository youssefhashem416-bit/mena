/**
 * معًا - عالم بلا حواجز | Intellectual Disability Educational Activities
 */

const IntellectualActivities = {
  score: 0,
  currentQuestionIndex: 0,
  questions: [
    {
      text: "كم عدد التفاحات الموجودة في الصورة؟",
      display: "🍎 🍎 🍎",
      options: [2, 3, 4],
      correct: 3,
      hint: "عد معي: واحدة، اثنتان، ثلاثة"
    },
    {
      text: "كم عدد النجوم الصفراء؟",
      display: "⭐ ⭐",
      options: [1, 2, 3],
      correct: 2,
      hint: "نجمة، نجمتان"
    },
    {
      text: "كم عدد الكرات الرياضية؟",
      display: "⚽ ⚽ ⚽ ⚽",
      options: [3, 4, 5],
      correct: 4,
      hint: "أربع كرات ملونة"
    },
    {
      text: "ما هو الحرف الأول في كلمة 'أسد'؟",
      display: "🦁 أسد",
      options: ["أ", "ب", "ج"],
      correct: "أ",
      hint: "ألف - أسد"
    }
  ],

  init() {
    this.renderQuestion();
  },

  learnLetter(element, letter, word, emoji) {
    document.querySelectorAll('#lettersGrid .interactive-card').forEach(c => c.classList.remove('selected'));
    if (element) element.classList.add('selected');

    const result = document.getElementById('letterResult');
    if (result) {
      result.innerHTML = `
        <span><i class="fa-solid fa-graduation-cap" style="color:var(--primary); margin-left:8px;"></i> حرف: <strong>${letter}</strong> — مثال: <strong>${word} ${emoji}</strong></span>
        <button class="btn btn-sm btn-outline" onclick="SpeechEngine.speak('حرف ${letter}، ${word}')">إعادة النطق</button>
      `;
    }

    AppCore.playSound('pop');
    SpeechEngine.speak(`حرف ${letter}، ${word}`);
  },

  learnNumber(element, num, word, visual) {
    document.querySelectorAll('#numbersGrid .interactive-card').forEach(c => c.classList.remove('selected'));
    if (element) element.classList.add('selected');

    const result = document.getElementById('numberResult');
    if (result) {
      result.innerHTML = `
        <span><i class="fa-solid fa-calculator" style="color:var(--primary); margin-left:8px;"></i> الرقم: <strong>${num} (${word})</strong> — ${visual}</span>
        <button class="btn btn-sm btn-outline" onclick="SpeechEngine.speak('الرقم ${num}، ${word}')">إعادة النطق</button>
      `;
    }

    AppCore.playSound('pop');
    SpeechEngine.speak(`الرقم ${num}، ${word}`);
  },

  learnColor(element, colorName, colorEmoji) {
    document.querySelectorAll('#colorsGrid .interactive-card').forEach(c => c.classList.remove('selected'));
    if (element) element.classList.add('selected');

    const result = document.getElementById('colorResult');
    if (result) {
      result.innerHTML = `
        <span><i class="fa-solid fa-palette" style="color:var(--primary); margin-left:8px;"></i> هذا هو اللون: <strong>${colorName} ${colorEmoji}</strong></span>
        <button class="btn btn-sm btn-outline" onclick="SpeechEngine.speak('هذا هو اللون ${colorName}')">إعادة النطق</button>
      `;
    }

    AppCore.playSound('pop');
    SpeechEngine.speak(`هذا هو اللون ${colorName}`);
  },

  renderQuestion() {
    const q = this.questions[this.currentQuestionIndex];
    const qText = document.getElementById('questionText');
    const qDisplay = document.getElementById('questionDisplay');
    const qOptions = document.getElementById('quizOptions');
    const qResult = document.getElementById('quizResult');

    if (qText) qText.textContent = q.text;
    if (qDisplay) qDisplay.textContent = q.display;
    if (qResult) qResult.textContent = 'اختر الإجابة الصحيحة بالضغط على أحد الأزرار:';

    if (qOptions) {
      qOptions.innerHTML = '';
      q.options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'btn btn-secondary btn-lg';
        btn.textContent = opt;
        btn.onclick = () => this.checkAnswer(opt);
        qOptions.appendChild(btn);
      });
    }

    SpeechEngine.speak(q.text);
  },

  checkAnswer(selected) {
    const q = this.questions[this.currentQuestionIndex];
    const qResult = document.getElementById('quizResult');

    if (selected === q.correct) {
      this.score += 10;
      AppCore.celebrate();
      if (qResult) {
        qResult.innerHTML = `🎉 <strong style="color:var(--success);">إجابة صحيحة وممتازة! أحسنت صنعًا.</strong>`;
      }
      SpeechEngine.speak('ممتاز! إجابة صحيحة يا بطل، أحسنت صنعًا.');
    } else {
      AppCore.playSound('error');
      if (qResult) {
        qResult.innerHTML = `💡 <strong style="color:var(--accent);">حاول مرة ثانية! ${q.hint}</strong>`;
      }
      SpeechEngine.speak(`حاول مرة ثانية، ${q.hint}`);
    }
  },

  nextQuestion() {
    this.currentQuestionIndex = (this.currentQuestionIndex + 1) % this.questions.length;
    this.renderQuestion();
  }
};

document.addEventListener('DOMContentLoaded', () => {
  IntellectualActivities.init();
});

