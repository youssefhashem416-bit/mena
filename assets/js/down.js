/**
 * معًا - عالم الأبطال الصغار | Down Syndrome Activities for Toddlers (Ages 3-6)
 */

const DownActivities = {
  currentQuestionIndex: 0,
  score: 0,

  questions: [
    {
      text: "المس التفاحة الحمراء اللذيذة يا بطل! 🍎",
      options: [
        { label: "تفاحة 🍎", correct: true, cheer: "يم يم! تفاحة حمراء لذيذة ومفيدة!" },
        { label: "سيارة 🚗", correct: false },
        { label: "كرة ⚽", correct: false }
      ],
      hint: "ابحث عن الفاكهة الحمراء الشهية!"
    },
    {
      text: "أين هي البطة اللطيفة التي تقول: واك واك؟ 🦆",
      options: [
        { label: "كلب 🐶", correct: false },
        { label: "بطة 🦆", correct: true, cheer: "واك واك! شاطر، هذه البطة تسبح في الماء!" },
        { label: "قطة 🐱", correct: false }
      ],
      hint: "البطة صفراء وتسبح في البحيرة!"
    },
    {
      text: "أين هي النجمة الصفراء المضيئة في السماء؟ ⭐",
      options: [
        { label: "مربع 🟦", correct: false },
        { label: "نجمة ⭐", correct: true, cheer: "برافو! نجمة ذهبية تلمع كابتسامتك الجميلة!" },
        { label: "دائرة 🔴", correct: false }
      ],
      hint: "النجمة الصفراء تلمع في السماء ليلاً!"
    },
    {
      text: "ماذا نستخدم لنغسل أيدينا قبل الأكل؟ 🧼",
      options: [
        { label: "الماء والصابون 🧼", correct: true, cheer: "أحسنت يا نظيف! الصابون يجعل أيدينا نظيفة وتحمينا!" },
        { label: "أقلام التلوين 🖍️", correct: false },
        { label: "اللعبة 🧸", correct: false }
      ],
      hint: "الصابون والماء هما سر النظافة!"
    }
  ],

  init() {
    this.renderQuestion();
    this.bindSkillCards();
  },

  showTab(tabId, button) {
    document.querySelectorAll('.activity-box').forEach(box => {
      box.classList.remove('active');
    });

    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });

    const targetBox = document.getElementById(tabId);
    if (targetBox) {
      targetBox.classList.add('active');
    }

    if (button) {
      button.classList.add('active');
    }

    SpeechEngine.stop();
    AppCore.playSound('boing');
  },

  learnWord(element, word, sentence, soundEffect) {
    document.querySelectorAll('#wordsTab .interactive-card').forEach(c => c.classList.remove('selected'));
    if (element) element.classList.add('selected');

    const result = document.getElementById('wordResult');
    if (result) {
      result.innerHTML = `
        <span><i class="fa-solid fa-volume-high" style="color:var(--candy-pink); margin-left:8px;"></i> ${word} — ${sentence}</span>
        <button class="btn btn-sm btn-primary" onclick="SpeechEngine.speak('${word}.. ${sentence}')">اسمعني مرة ثانية 🔊</button>
      `;
    }

    AppCore.playSound('pop');
    SpeechEngine.speak(`${word}... ${sentence}`);
  },

  learnShape(element, shapeName, description) {
    document.querySelectorAll('#shapesTab .interactive-card').forEach(c => c.classList.remove('selected'));
    if (element) element.classList.add('selected');

    const result = document.getElementById('shapeResult');
    if (result) {
      result.innerHTML = `
        <span><i class="fa-solid fa-shapes" style="color:var(--candy-pink); margin-left:8px;"></i> ${shapeName} — ${description}</span>
        <button class="btn btn-sm btn-primary" onclick="SpeechEngine.speak('${shapeName}.. ${description}')">اسمعني مرة ثانية 🔊</button>
      `;
    }

    AppCore.playSound('pop');
    SpeechEngine.speak(`${shapeName}... ${description}`);
  },

  bindSkillCards() {
    document.querySelectorAll('.skill-item').forEach(item => {
      item.addEventListener('click', () => {
        const isDone = item.classList.toggle('completed');
        if (isDone) {
          AppCore.playSound('star');
          const title = item.querySelector('.skill-text')?.textContent || '';
          SpeechEngine.speak(`بطل رائع! أحسنت يا شاطر: ${title}`);
        } else {
          AppCore.playSound('pop');
        }
      });
    });
  },

  resetSkills() {
    document.querySelectorAll('.skill-item').forEach(item => {
      item.classList.remove('completed');
    });
    AppCore.playSound('pop');
    AppCore.notify('تم!', 'أعدنا قائمة مهارات البطل من جديد لنكسب نجومًا جديدة!', 'success');
  },

  renderQuestion() {
    const q = this.questions[this.currentQuestionIndex];
    const qText = document.getElementById('quizQuestionText');
    const qOptions = document.getElementById('downQuizOptions');
    const qResult = document.getElementById('downQuizResult');

    if (qText) qText.textContent = q.text;
    if (qResult) qResult.textContent = 'المس الصورة الصحيحة بأصبعك:';

    if (qOptions) {
      qOptions.innerHTML = '';
      q.options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'btn btn-secondary btn-lg';
        btn.style.fontSize = '1.35rem';
        btn.style.padding = '18px 32px';
        btn.textContent = opt.label;
        btn.onclick = () => this.handleAnswer(opt.correct, q.hint, opt.cheer);
        qOptions.appendChild(btn);
      });
    }

    SpeechEngine.speak(q.text);
  },

  handleAnswer(isCorrect, hint, cheer) {
    const qResult = document.getElementById('downQuizResult');

    if (isCorrect) {
      this.score += 10;
      AppCore.celebrate();
      if (qResult) {
        qResult.innerHTML = `🌟 <strong style="color:var(--mint-green); font-size:1.35rem;">شاطر جدًا! بطل أبطال العالم! أحسنت! 👏🎉</strong>`;
      }
      SpeechEngine.speak(cheer || 'ممتاز جدًا! إجابة صحيحة يا بطل، أنت شاطر ورائع ومميز!');
    } else {
      AppCore.playSound('boing');
      if (qResult) {
        qResult.innerHTML = `💡 <strong style="color:var(--accent-orange);">حاول مرة ثانية يا بطل، أنت تقدر! ${hint}</strong>`;
      }
      SpeechEngine.speak(`حاول مرة ثانية يا بطل، ${hint}`);
    }
  },

  nextQuestion() {
    this.currentQuestionIndex = (this.currentQuestionIndex + 1) % this.questions.length;
    this.renderQuestion();
  }
};

document.addEventListener('DOMContentLoaded', () => {
  DownActivities.init();
});
