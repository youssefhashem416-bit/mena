const crypto = require('crypto');
const db = require('./db');

const sessions = new Map(); // token -> sessionObj

const Auth = {
  createSession(user) {
    const token = crypto.randomBytes(32).toString('hex');
    const roleObj = db.findOne('roles', r => r.id === user.role_id);
    const roleName = roleObj ? roleObj.name : 'child';

    // Find linked child or teacher record if applicable
    let childId = null;
    let teacherId = null;
    let parentId = null;

    if (roleName === 'child') {
      const child = db.findOne('children', c => c.user_id === user.id);
      if (child) childId = child.id;
    } else if (roleName === 'teacher') {
      const teacher = db.findOne('teachers', t => t.user_id === user.id);
      if (teacher) teacherId = teacher.id;
    } else if (roleName === 'parent') {
      const parent = db.findOne('parents', p => p.user_id === user.id);
      if (parent) parentId = parent.id;
    }

    const sessionData = {
      token,
      userId: user.id,
      username: user.username,
      fullName: user.full_name,
      email: user.email,
      role: roleName,
      roleLabel: roleObj ? roleObj.label_ar : 'مستخدم',
      childId,
      teacherId,
      parentId,
      createdAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
    };

    sessions.set(token, sessionData);
    return sessionData;
  },

  getSession(token) {
    if (!token) return null;
    const session = sessions.get(token);
    if (!session) return null;
    if (Date.now() > session.expiresAt) {
      sessions.delete(token);
      return null;
    }
    return session;
  },

  destroySession(token) {
    if (token) {
      sessions.delete(token);
    }
  },

  authenticateRequest(req) {
    // 1. Check Authorization header
    const authHeader = req.headers['authorization'];
    let token = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }
    // 2. Or check cookie
    if (!token && req.headers['cookie']) {
      const match = req.headers['cookie'].match(/hope_session=([a-f0-9]+)/);
      if (match) token = match[1];
    }
    // 3. Or check query param
    if (!token && req.url) {
      const urlObj = new URL(req.url, 'http://localhost');
      token = urlObj.searchParams.get('auth_token');
    }

    if (!token) return null;
    return this.getSession(token);
  },

  login(usernameOrEmail, password) {
    const user = db.findOne('users', u => 
      (u.username === usernameOrEmail || u.email === usernameOrEmail) && u.is_active
    );
    if (!user) {
      return { success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
    }
    const isValid = db.verifyPassword(password, user.password_hash, user.salt);
    if (!isValid) {
      return { success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
    }
    const session = this.createSession(user);
    db.logAudit(user.id, 'LOGIN', 'users', user.id, { username: user.username });
    return { success: true, session };
  },

  register({ username, email, password, fullName, phone, roleName, disabilityType, age }) {
    // Check if exists
    const existing = db.findOne('users', u => u.username === username || u.email === email);
    if (existing) {
      return { success: false, error: 'اسم المستخدم أو البريد الإلكتروني مسجل بالفعل' };
    }

    const roleObj = db.findOne('roles', r => r.name === roleName) || db.findOne('roles', r => r.name === 'child');
    const { hash, salt } = db.hashPassword(password);

    const newUser = db.insert('users', {
      username,
      email,
      password_hash: hash,
      salt,
      role_id: roleObj.id,
      full_name: fullName,
      phone: phone || '',
      is_active: true
    });

    let extraProfile = null;
    if (roleObj.name === 'child') {
      const disability = db.findOne('disabilities', d => d.code === disabilityType) || db.data.disabilities[0];
      extraProfile = db.insert('children', {
        user_id: newUser.id,
        full_name: fullName,
        age: parseInt(age) || 5,
        disability_id: disability.id,
        disability_code: disability.code,
        current_level: 0,
        sensory_profile: 'حساب جديد، قيد التقييم الأولي',
        avatar: 'child-default',
        emergency_contact: phone || ''
      }, newUser.id);

      // Create initial journey stages for this child
      [0, 1, 2, 3, 4].forEach(lvl => {
        db.insert('journey_stages', {
          child_id: extraProfile.id,
          stage_number: lvl,
          stage_name: `المرحلة ${lvl}`,
          description: `المستوى التعليمي ${lvl}`,
          is_unlocked: lvl === 0,
          is_completed: false
        }, newUser.id);
      });

      // Default customization settings
      db.insert('customizations', {
        child_id: extraProfile.id,
        sensory_calm_mode: true,
        high_contrast: false,
        dark_mode: false,
        font_size: 18,
        audio_rate: 0.78,
        audio_pitch: 1.1,
        sound_effects: true,
        dyslexia_font: false
      }, newUser.id);

    } else if (roleObj.name === 'teacher') {
      extraProfile = db.insert('teachers', {
        user_id: newUser.id,
        specialization: 'تربية خاصة وتأهيل نمائي',
        license_number: 'PENDING',
        bio: 'معلم جديد'
      }, newUser.id);
    } else if (roleObj.name === 'parent') {
      extraProfile = db.insert('parents', {
        user_id: newUser.id,
        relationship_type: 'ولي أمر',
        full_name: fullName,
        phone: phone || '',
        address: ''
      }, newUser.id);
    }

    const session = this.createSession(newUser);
    return { success: true, user: newUser, session, profile: extraProfile };
  }
};

module.exports = Auth;

