/**
 * معًا - عالم الأبطال الصغار | Kid-Friendly Core & Audio Synthesizer (Ages 3-6)
 */

const AppCore = {
  audioCtx: null,
  soundEnabled: true,

  initAudio() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  },

  /**
   * Play fun, joyful synthesized sounds for toddlers & preschoolers
   * @param {'pop' | 'success' | 'celebrate' | 'boing' | 'click' | 'star'} type 
   */
  playSound(type = 'pop') {
    if (!this.soundEnabled) return;
    try {
      this.initAudio();
      if (!this.audioCtx) return;

      const ctx = this.audioCtx;
      const now = ctx.currentTime;

      if (type === 'pop' || type === 'click') {
        // Cheerful bubble pop
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'boing') {
        // Fun cartoon boing
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);
        osc.frequency.exponentialRampToValueAtTime(350, now + 0.3);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'success' || type === 'star') {
        // Joyful 3-note kid chime (Do-Mi-Sol)
        const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sine';
          const t = now + idx * 0.1;
          osc.frequency.setValueAtTime(freq, t);
          gain.gain.setValueAtTime(0.25, t);
          gain.gain.linearRampToValueAtTime(0.01, t + 0.3);
          osc.start(t);
          osc.stop(t + 0.3);
        });
      } else if (type === 'celebrate') {
        // Happy triumphant fanfare + applause simulation
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'triangle';
          const t = now + idx * 0.12;
          osc.frequency.setValueAtTime(freq, t);
          gain.gain.setValueAtTime(0.25, t);
          gain.gain.linearRampToValueAtTime(0.01, t + 0.35);
          osc.start(t);
          osc.stop(t + 0.35);
        });
      }
    } catch (err) {
      console.warn("Kid audio issue:", err);
    }
  },

  /**
   * Trigger celebration confetti & stars
   */
  celebrate() {
    this.playSound('celebrate');
    if (typeof confetti === 'function') {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#facc15', '#38bdf8', '#f43f5e', '#10b981', '#a855f7']
      });
    }
  },

  /**
   * Cheerful toddler greeting
   */
  playToddlerGreeting() {
    this.playSound('success');
    SpeechEngine.speak('أهلاً يا بطل! أنا سعيد بوجودك معي في عالم معًا! اضغط على أي لعبة وصورة لنلعب معًا ونسمع صوتها الجميل!');
  },

  /**
   * Accessible SweetAlert2 Notification
   */
  notify(title, text = '', icon = 'info') {
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        title: title,
        text: text,
        icon: icon,
        confirmButtonText: 'رائع! 🎉',
        confirmButtonColor: '#2563eb',
        customClass: {
          popup: 'kid-swal'
        }
      });
    } else {
      alert(`${title}\n${text}`);
    }
  },

  initReadingRuler() {
    let ruler = document.getElementById('readingRuler');
    if (!ruler) {
      ruler = document.createElement('div');
      ruler.id = 'readingRuler';
      document.body.appendChild(ruler);
    }
    window.addEventListener('mousemove', (e) => {
      if (document.body.classList.contains('ruler-active')) {
        ruler.style.top = `${e.clientY - 19}px`;
      }
    });
  },

  highlightActiveNav() {
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('nav a').forEach(link => {
      const href = link.getAttribute('href');
      if (href === currentPath || (currentPath === '' && href === 'index.html')) {
        link.classList.add('active');
      }
    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  AppCore.initReadingRuler();
  AppCore.highlightActiveNav();

  // Attach toy pop sound to all buttons
  document.querySelectorAll('button:not([data-no-sound]), .btn:not([data-no-sound])').forEach(btn => {
    btn.addEventListener('click', () => {
      AppCore.playSound('pop');
    });
  });
});
