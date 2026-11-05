/**
 * بصمة أمل | HOPE TOUCH - API Client & Session Manager
 */

const HopeApi = {
  baseUrl: window.location.origin.includes('http') ? '' : 'http://localhost:3000',

  getToken() {
    return localStorage.getItem('hope_session_token') || '';
  },

  setSession(session) {
    if (!session) {
      localStorage.removeItem('hope_session_token');
      localStorage.removeItem('hope_session_user');
      return;
    }
    localStorage.setItem('hope_session_token', session.token);
    localStorage.setItem('hope_session_user', JSON.stringify(session));
  },

  getCurrentSession() {
    const raw = localStorage.getItem('hope_session_user');
    try {
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },

  async request(endpoint, options = {}) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers
      });

      if (response.status === 401 && !endpoint.includes('/api/auth/login')) {
        console.warn('Session expired or unauthorized');
        // If on a protected page, redirect to login
        if (!window.location.pathname.endsWith('login.html') &&
            !window.location.pathname.endsWith('register.html') &&
            !window.location.pathname.endsWith('index.html')) {
          window.location.href = 'login.html?expired=1';
        }
      }

      const data = await response.json().catch(() => ({}));
      return { ok: response.ok, status: response.status, data };
    } catch (err) {
      console.error(`API Call failed: ${endpoint}`, err);
      return { ok: false, status: 0, data: { error: 'تعذر الاتصال بالخادم. يرجى التأكد من تشغيل خادم بصمة أمل.' } };
    }
  },

  // Auth
  async login(username, password) {
    const res = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    if (res.ok && res.data.session) {
      this.setSession(res.data.session);
    }
    return res;
  },

  async register(payload) {
    const res = await this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (res.ok && res.data.session) {
      this.setSession(res.data.session);
    }
    return res;
  },

  async logout() {
    await this.request('/api/auth/logout', { method: 'POST' });
    this.setSession(null);
    window.location.href = 'login.html';
  },

  async me() {
    return this.request('/api/auth/me');
  },

  // Children
  async getChildren() {
    return this.request('/api/children');
  },

  async getChild(id) {
    return this.request(`/api/children/${id}`);
  },

  async createChild(data) {
    return this.request('/api/children', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateChild(id, data) {
    return this.request(`/api/children/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  // Journey
  async getJourney(childId) {
    return this.request(`/api/children/${childId}/journey`);
  },

  async advanceJourney(childId, nextLevel) {
    return this.request('/api/journey/advance', {
      method: 'POST',
      body: JSON.stringify({ childId, nextLevel })
    });
  },

  // Activities
  async getActivities(filters = {}) {
    const params = new URLSearchParams(filters);
    return this.request(`/api/activities?${params.toString()}`);
  },

  async recordAttempt(attemptData) {
    return this.request('/api/activities/attempt', {
      method: 'POST',
      body: JSON.stringify(attemptData)
    });
  },

  // Clinical & Pedagogical
  async getAssessments(childId = null) {
    const url = childId ? `/api/assessments?child_id=${childId}` : '/api/assessments';
    return this.request(url);
  },

  async createAssessment(data) {
    return this.request('/api/assessments', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async getIeps(childId = null) {
    const url = childId ? `/api/ieps?child_id=${childId}` : '/api/ieps';
    return this.request(url);
  },

  async createIep(data) {
    return this.request('/api/ieps', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async getGoals(iepId = null) {
    const url = iepId ? `/api/goals?iep_id=${iepId}` : '/api/goals';
    return this.request(url);
  },

  async createGoal(data) {
    return this.request('/api/goals', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async getSessions(childId = null) {
    const url = childId ? `/api/sessions?child_id=${childId}` : '/api/sessions';
    return this.request(url);
  },

  async createSession(data) {
    return this.request('/api/sessions', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async getNotes(childId = null) {
    const url = childId ? `/api/notes?child_id=${childId}` : '/api/notes';
    return this.request(url);
  },

  async createNote(data) {
    return this.request('/api/notes', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async getHomeActivities(childId = null) {
    const url = childId ? `/api/home-activities?child_id=${childId}` : '/api/home-activities';
    return this.request(url);
  },

  async createHomeActivity(data) {
    return this.request('/api/home-activities', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateHomeActivity(id, data) {
    return this.request(`/api/home-activities/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async getReports(childId = null) {
    const url = childId ? `/api/reports?child_id=${childId}` : '/api/reports';
    return this.request(url);
  },

  async getDetailedReport(childId = 1) {
    return this.request(`/api/reports/detailed?child_id=${childId}`);
  },

  async getResources(filters = {}) {
    const params = new URLSearchParams(filters);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/api/resources${queryString}`);
  },

  async createResource(data) {
    return this.request('/api/resources', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateResource(id, data) {
    return this.request(`/api/resources/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async deleteResource(id) {
    return this.request(`/api/resources/${id}`, {
      method: 'DELETE'
    });
  },

  async getUsers() {
    return this.request('/api/users');
  },

  async createUser(data) {
    return this.request('/api/users', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async toggleUserStatus(userId, isActive) {
    return this.request(`/api/users/${userId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ is_active: isActive })
    });
  },

  async getBackup() {
    const token = this.getToken();
    const res = await fetch(`${this.baseUrl}/api/backup`, {
      headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
    });
    if (!res.ok) throw new Error('فشل تحميل النسخة الاحتياطية');
    return res.blob();
  },

  async restoreBackup(backupData) {
    return this.request('/api/restore', {
      method: 'POST',
      body: JSON.stringify(backupData)
    });
  },

  async getChildDossier(childId) {
    return this.request(`/api/children/${childId}/dossier`);
  },

  async updateChildProfile(childId, data) {
    return this.request(`/api/children/${childId}/profile`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async getAssessmentComparison(childId = 1) {
    return this.request(`/api/assessments/compare?child_id=${childId}`);
  },

  async getSkillsGrowth(childId = 1) {
    return this.request(`/api/children/${childId}/skills-growth`);
  },

  async approveSkillLevel(skillLevelId, newLevel, notes = '') {
    return this.request('/api/journey/approve-skill-level', {
      method: 'POST',
      body: JSON.stringify({ skillLevelId, newLevel, notes })
    });
  },

  async getCertificates(childId = null) {
    const url = childId ? `/api/certificates?child_id=${childId}` : '/api/certificates';
    return this.request(url);
  },

  async createCertificate(data) {
    return this.request('/api/certificates', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async getAacSymbols(childId = 1) {
    return this.request(`/api/aac/symbols?child_id=${childId}`);
  },

  async createAacSymbol(data) {
    return this.request('/api/aac/symbols', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async getRewards(childId = null) {
    const url = childId ? `/api/rewards?child_id=${childId}` : '/api/rewards';
    return this.request(url);
  },

  async getCustomizations(childId = null) {
    const url = childId ? `/api/customizations?child_id=${childId}` : '/api/customizations';
    return this.request(url);
  },

  async saveCustomizations(data) {
    return this.request('/api/customizations', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async getStats() {
    return this.request('/api/stats');
  },

  async getAuditLogs() {
    return this.request('/api/audit-logs');
  },

  /**
   * Helper to render unified top bar and navigation across all pages
   */
  renderHeader(activePage = '') {
    const session = this.getCurrentSession();
    const navContainer = document.querySelector('header');
    if (!navContainer) return;

    let userBadgeHtml = '';
    let navLinksHtml = `
      <a href="index.html" class="${activePage === 'home' ? 'active' : ''}"><i class="fa-solid fa-house"></i> الرئيسية</a>
      <a href="activities.html" class="${activePage === 'activities' ? 'active' : ''}"><i class="fa-solid fa-shapes"></i> الأنشطة</a>
      <a href="aac.html" class="${activePage === 'aac' ? 'active' : ''}"><i class="fa-solid fa-comment-dots"></i> التواصل AAC</a>
      <a href="learning-journey.html" class="${activePage === 'journey' ? 'active' : ''}"><i class="fa-solid fa-route"></i> الرحلة التعليمية</a>
      <a href="life-skills.html" class="${activePage === 'life-skills' ? 'active' : ''}"><i class="fa-solid fa-hands-bubbles"></i> المهارات الحياتية</a>
    `;

    if (session) {
      let roleUrl = 'child-zone.html';
      if (session.role === 'admin') roleUrl = 'admin-dashboard.html';
      else if (session.role === 'teacher') roleUrl = 'teacher-dashboard.html';
      else if (session.role === 'parent') roleUrl = 'parent-dashboard.html';

      navLinksHtml += `
        <a href="${roleUrl}" class="dashboard-badge-link ${activePage.includes('dashboard') || activePage === 'child-zone' ? 'active' : ''}">
          <i class="fa-solid fa-gauge-high"></i> لوحة التحكم (${session.roleLabel})
        </a>
      `;

      userBadgeHtml = `
        <div class="user-profile-badge">
          <span class="user-name"><i class="fa-solid fa-circle-user"></i> ${session.fullName || session.username}</span>
          <button class="btn btn-sm btn-outline-danger" onclick="HopeApi.logout()" title="تسجيل الخروج">
            <i class="fa-solid fa-arrow-right-from-bracket"></i>
          </button>
        </div>
      `;
    } else {
      userBadgeHtml = `
        <div class="auth-quick-actions">
          <a href="login.html" class="btn btn-sm btn-outline-primary"><i class="fa-solid fa-right-to-bracket"></i> دخول</a>
          <a href="register.html" class="btn btn-sm btn-primary"><i class="fa-solid fa-user-plus"></i> تسجيل جديد</a>
        </div>
      `;
    }

    navContainer.innerHTML = `
      <a href="index.html" class="logo-wrapper" aria-label="بصمة أمل - الصفحة الرئيسية">
        <div class="logo">
          بصمة أمل <span class="logo-en">HOPE TOUCH</span> <span class="balloon">🎈</span>
        </div>
        <span class="logo-badge">كل طفل لديه قدرة تستحق أن تُكتشف 🌱</span>
      </a>

      <nav aria-label="شريط التنقل الرئيسي">
        ${navLinksHtml}
      </nav>

      <div class="header-right-zone">
        ${userBadgeHtml}
        <!-- أدوات الوصول السريع -->
        <div class="a11y-quick-bar" role="toolbar" aria-label="أدوات الوصول السريع">
          <button class="a11y-btn" onclick="A11y.changeFont(2)" title="تكبير الخط" aria-label="تكبير حجم الخط">A+</button>
          <button class="a11y-btn" onclick="A11y.changeFont(-2)" title="تصغير الخط" aria-label="تصغير حجم الخط">A-</button>
          <button class="a11y-btn" data-a11y="contrast" onclick="A11y.toggleContrast()" title="التباين الفائق" aria-label="تبديل التباين"><i class="fa-solid fa-circle-half-stroke"></i></button>
          <button class="a11y-btn" data-a11y="dark" onclick="A11y.toggleDarkMode()" title="الوضع الليلي" aria-label="تبديل الوضع الليلي"><i class="fa-solid fa-moon"></i></button>
        </div>
      </div>
    `;
  }
};

window.HopeApi = HopeApi;

