const db = require('./db');
const Auth = require('./auth');

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

/**
 * Parent RBAC isolation helper: Ensures a parent can only access their linked child.
 */
function isParentAllowedForChild(session, childId) {
  if (!session) return false;
  if (session.role === 'admin' || session.role === 'teacher') return true;
  if (session.role === 'child') return Number(session.childId) === Number(childId);
  if (session.role === 'parent') {
    if (session.childId && Number(session.childId) === Number(childId)) return true;
    const parentId = session.parentId;
    const rels = db.find('relationships', r => r.parent_id === parentId && Number(r.child_id) === Number(childId));
    if (rels.length > 0) return true;
    const child = db.findOne('children', c => c.id === Number(childId) && c.parent_id === parentId);
    if (child) return true;
    return false;
  }
  return false;
}

function getParentAllowedChildIds(session) {
  if (!session) return [];
  if (session.role === 'admin' || session.role === 'teacher') {
    return db.data.children.map(c => c.id);
  }
  if (session.role === 'child') return session.childId ? [Number(session.childId)] : [];
  if (session.role === 'parent') {
    const ids = new Set();
    if (session.childId) ids.add(Number(session.childId));
    const rels = db.find('relationships', r => r.parent_id === session.parentId);
    rels.forEach(r => ids.add(Number(r.child_id)));
    const children = db.find('children', c => c.parent_id === session.parentId);
    children.forEach(c => ids.add(Number(c.id)));
    return Array.from(ids);
  }
  return [];
}

async function handleApi(req, res, pathname, query) {
  const method = req.method;
  const session = Auth.authenticateRequest(req);

  // 1. Authentication Endpoints (Public)
  if (pathname === '/api/auth/login' && method === 'POST') {
    const { username, password } = await parseJsonBody(req);
    const result = Auth.login(username, password);
    if (!result.success) {
      return sendJson(res, 401, result);
    }
    return sendJson(res, 200, result);
  }

  if (pathname === '/api/auth/register' && method === 'POST') {
    const payload = await parseJsonBody(req);
    const result = Auth.register(payload);
    if (!result.success) {
      return sendJson(res, 400, result);
    }
    return sendJson(res, 201, result);
  }

  if (pathname === '/api/auth/me' && method === 'GET') {
    if (!session) {
      return sendJson(res, 401, { error: 'غير مسجل الدخول' });
    }
    const user = db.findOne('users', u => u.id === session.userId);
    let childProfile = null;
    if (session.childId) {
      childProfile = db.findOne('children', c => c.id === session.childId);
    }
    return sendJson(res, 200, {
      session,
      user: user ? { id: user.id, username: user.username, full_name: user.full_name, email: user.email } : null,
      childProfile
    });
  }

  if (pathname === '/api/auth/logout' && method === 'POST') {
    if (session) {
      Auth.destroySession(session.token);
    }
    return sendJson(res, 200, { success: true, message: 'تم تسجيل الخروج بنجاح' });
  }

  // 2. Disabilities & Initial Metadata (Public)
  if (pathname === '/api/disabilities' && method === 'GET') {
    return sendJson(res, 200, db.data.disabilities);
  }

  if (pathname === '/api/stats' && method === 'GET') {
    if (!session || session.role !== 'admin') {
      return sendJson(res, 403, { error: 'صلاحية المدير مطلوبة' });
    }
    return sendJson(res, 200, {
      totalUsers: db.data.users.length,
      totalChildren: db.data.children.length,
      totalTeachers: db.data.teachers.length,
      totalParents: db.data.parents.length,
      totalAssessments: db.data.assessments.length,
      totalIeps: db.data.ieps.length,
      totalSessions: db.data.sessions.length,
      totalAttempts: db.data.attempts.length,
      recentAuditLogs: db.data.audit_logs.slice(-15).reverse()
    });
  }

  // Database Backup (Admin only)
  if (pathname === '/api/backup' && method === 'GET') {
    if (!session || session.role !== 'admin') {
      return sendJson(res, 403, { error: 'صلاحية المدير مطلوبة لتنزيل النسخة الاحتياطية' });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `hope_touch_backup_${timestamp}.json`;
    const backupPayload = {
      version: '2.0',
      exported_at: new Date().toISOString(),
      exported_by: session.username,
      tables_count: Object.keys(db.data).length,
      database: db.data
    };

    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Access-Control-Allow-Origin': '*'
    });
    return res.end(JSON.stringify(backupPayload, null, 2));
  }

  // Database Restore (Admin only)
  if (pathname === '/api/restore' && method === 'POST') {
    if (!session || session.role !== 'admin') {
      return sendJson(res, 403, { error: 'صلاحية المدير مطلوبة لاستعادة النسخة الاحتياطية' });
    }
    const payload = await parseJsonBody(req);
    const targetDb = payload.database || payload;

    if (!targetDb.users || !targetDb.children || !targetDb.activities) {
      return sendJson(res, 400, { error: 'ملف النسخة الاحتياطية غير صالح أو ناقص للجداول الأساسية' });
    }

    db.data = targetDb;
    db.save();
    db.logAudit(session.userId, 'RESTORE_DATABASE', 'system', 0, {
      restored_at: new Date().toISOString(),
      tables_restored: Object.keys(targetDb)
    });

    return sendJson(res, 200, {
      success: true,
      message: 'تمت استعادة قاعدة البيانات بنجاح واستقرار كافة الجداول',
      tablesCount: Object.keys(db.data).length
    });
  }

  // Users Management (Admin only)
  if (pathname === '/api/users' && method === 'GET') {
    if (!session || session.role !== 'admin') {
      return sendJson(res, 403, { error: 'صلاحية المدير مطلوبة لعرض المستخدمين' });
    }
    const users = db.data.users.map(u => {
      const role = db.findOne('roles', r => r.id === u.role_id);
      return {
        id: u.id,
        username: u.username,
        full_name: u.full_name,
        email: u.email,
        role_id: u.role_id,
        role_name: role ? role.name : 'unknown',
        role_label: role ? role.label_ar : 'غير محدد',
        is_active: u.is_active !== false,
        created_at: u.created_at
      };
    });
    return sendJson(res, 200, users);
  }

  if (pathname === '/api/users' && method === 'POST') {
    if (!session || session.role !== 'admin') {
      return sendJson(res, 403, { error: 'صلاحية المدير مطلوبة لإنشاء مستخدمين' });
    }
    const { username, password, full_name, email, role_id } = await parseJsonBody(req);
    if (!username || !password || !full_name || !role_id) {
      return sendJson(res, 400, { error: 'يرجى استكمال جميع البيانات المطلوبة' });
    }
    const existing = db.findOne('users', u => u.username.toLowerCase() === username.toLowerCase());
    if (existing) {
      return sendJson(res, 400, { error: 'اسم المستخدم مسجل مسبقاً' });
    }
    const { hash, salt } = db.hashPassword(password);
    const newUser = db.insert('users', {
      username,
      password_hash: hash,
      salt,
      full_name,
      email: email || `${username}@hopetouch.edu`,
      role_id: Number(role_id),
      is_active: true
    }, session.userId);

    if (Number(role_id) === 2) {
      db.insert('teachers', {
        user_id: newUser.id,
        full_name,
        email: newUser.email,
        specialization: 'التربية الخاصة وتأهيل ذوي الإعاقة',
        license_number: `TCH-${Date.now().toString().slice(-4)}`
      }, session.userId);
    } else if (Number(role_id) === 3) {
      db.insert('parents', {
        user_id: newUser.id,
        full_name,
        phone: '0500000000',
        email: newUser.email
      }, session.userId);
    }

    return sendJson(res, 201, {
      success: true,
      user: { id: newUser.id, username: newUser.username, full_name: newUser.full_name, role_id: newUser.role_id }
    });
  }

  const userStatusMatch = pathname.match(/^\/api\/users\/(\d+)\/status$/);
  if (userStatusMatch && method === 'PUT') {
    if (!session || session.role !== 'admin') {
      return sendJson(res, 403, { error: 'صلاحية المدير مطلوبة لتعديل حالة المستخدم' });
    }
    const targetUserId = Number(userStatusMatch[1]);
    const user = db.findOne('users', u => u.id === targetUserId);
    if (!user) return sendJson(res, 404, { error: 'المستخدم غير موجود' });
    if (user.id === session.userId) {
      return sendJson(res, 400, { error: 'لا يمكنك تعطيل حسابك الحالي' });
    }
    const body = await parseJsonBody(req);
    const newStatus = body.is_active !== undefined ? body.is_active : !user.is_active;
    const updated = db.update('users', targetUserId, { is_active: newStatus }, session.userId);
    return sendJson(res, 200, { success: true, is_active: updated.is_active });
  }

  // 3. Children Management
  if (pathname === '/api/children' && method === 'GET') {
    if (!session) return sendJson(res, 401, { error: 'يجب تسجيل الدخول' });

    let children = [];
    if (session.role === 'admin') {
      children = db.data.children;
    } else if (session.role === 'teacher') {
      const rels = db.find('relationships', r => r.teacher_id === session.teacherId);
      const childIds = rels.map(r => r.child_id);
      children = db.find('children', c => childIds.includes(c.id));
      if (children.length === 0) children = db.data.children;
    } else if (session.role === 'parent') {
      const allowedIds = getParentAllowedChildIds(session);
      children = db.find('children', c => allowedIds.includes(c.id));
    } else if (session.role === 'child') {
      children = db.find('children', c => c.id === session.childId);
    }
    return sendJson(res, 200, children);
  }

  if (pathname === '/api/children' && method === 'POST') {
    if (!session || (session.role !== 'admin' && session.role !== 'teacher')) {
      return sendJson(res, 403, { error: 'صلاحية إضافة طفل مقتصرة على المعلم أو المدير' });
    }
    const payload = await parseJsonBody(req);
    const newChild = db.insert('children', payload, session.userId);

    [0, 1, 2, 3, 4].forEach(lvl => {
      db.insert('journey_stages', {
        child_id: newChild.id,
        stage_number: lvl,
        stage_name: `المرحلة ${lvl}`,
        description: `المستوى التعليمي ${lvl}`,
        is_unlocked: lvl === 0,
        is_completed: false
      }, session.userId);
    });

    db.insert('customizations', {
      child_id: newChild.id,
      sensory_calm_mode: true,
      high_contrast: false,
      dark_mode: false,
      font_size: 18,
      audio_rate: 0.78,
      sound_effects: true
    }, session.userId);

    return sendJson(res, 201, newChild);
  }

  // Single child details
  const childMatch = pathname.match(/^\/api\/children\/(\d+)$/);
  if (childMatch && method === 'GET') {
    const childId = Number(childMatch[1]);
    if (session && session.role === 'parent' && !isParentAllowedForChild(session, childId)) {
      return sendJson(res, 403, { error: 'غير مصرح لولي الأمر بالوصول لبيانات هذا الطفل' });
    }
    const child = db.findOne('children', c => c.id === childId);
    if (!child) return sendJson(res, 404, { error: 'الطفل غير موجود' });
    const journey = db.find('journey_stages', j => j.child_id === childId);
    const customization = db.findOne('customizations', c => c.child_id === childId);
    const rewards = db.find('rewards', r => r.child_id === childId);
    return sendJson(res, 200, { child, journey, customization, rewards });
  }

  // Complete Child Dossier (360 Degree View)
  const dossierMatch = pathname.match(/^\/api\/children\/(\d+)\/dossier$/);
  if (dossierMatch && method === 'GET') {
    const childId = Number(dossierMatch[1]);
    if (session && session.role === 'parent' && !isParentAllowedForChild(session, childId)) {
      return sendJson(res, 403, { error: 'غير مصرح لولي الأمر بالوصول لملف هذا الطفل' });
    }
    const child = db.findOne('children', c => c.id === childId);
    if (!child) return sendJson(res, 404, { error: 'الطفل غير موجود' });

    const parent = db.findOne('parents', p => p.id === (child.parent_id || 1)) || null;
    const teacher = db.findOne('teachers', t => t.id === (child.assigned_teacher_id || 1)) || null;
    const assessments = db.find('assessments', a => a.child_id === childId);
    const ieps = db.find('ieps', i => i.child_id === childId);
    const iepIds = ieps.map(i => i.id);
    const goals = db.find('goals', g => iepIds.includes(g.iep_id));
    const skillLevels = db.find('child_skill_levels', s => s.child_id === childId);
    const attempts = db.find('attempts', a => a.child_id === childId).slice(-20).reverse();
    const rewards = db.find('rewards', r => r.child_id === childId);
    const certificates = db.find('certificates', c => c.child_id === childId);
    const customizations = db.findOne('customizations', c => c.child_id === childId);

    return sendJson(res, 200, {
      child,
      parent,
      teacher,
      assessments,
      ieps,
      goals,
      skillLevels,
      attempts,
      rewards,
      certificates,
      customizations
    });
  }

  const profileUpdateMatch = pathname.match(/^\/api\/children\/(\d+)\/profile$/);
  if (profileUpdateMatch && method === 'PUT') {
    const childId = Number(profileUpdateMatch[1]);
    const updates = await parseJsonBody(req);
    const updated = db.update('children', childId, updates, session ? session.userId : null);
    return sendJson(res, 200, updated);
  }

  // Assessment 10-Domain Comparison
  if (pathname === '/api/assessments/compare' && method === 'GET') {
    const childId = Number(query.child_id || 1);
    if (session && session.role === 'parent' && !isParentAllowedForChild(session, childId)) {
      return sendJson(res, 403, { error: 'غير مصرح لولي الأمر بالاطلاع على تقييم هذا الطفل' });
    }
    const list = db.find('assessments', a => a.child_id === childId);
    if (list.length === 0) return sendJson(res, 404, { error: 'لا توجد تقييمات لهذا الطفل' });

    const baseline = list[0];
    const latest = list[list.length - 1];

    const standardDomains = [
      'الانتباه والتركيز',
      'التواصل',
      'اللغة والاستيعاب',
      'الإدراك',
      'الذاكرة',
      'المهارات الاجتماعية',
      'التمييز البصري والسمعي',
      'المهارات الحركية الدقيقة',
      'المهارات الأكاديمية',
      'المهارات الحياتية والاستقلالية'
    ];

    const comparison = standardDomains.map(dom => {
      const bScore = (baseline.domain_scores && baseline.domain_scores[dom]) ? baseline.domain_scores[dom].baseline || baseline.domain_scores[dom].score : (baseline.baseline_score || 40);
      const lScore = (latest.domain_scores && latest.domain_scores[dom]) ? latest.domain_scores[dom].score : (latest.baseline_score || 65);
      const diff = lScore - bScore;
      return {
        domain: dom,
        baselineScore: bScore,
        latestScore: lScore,
        difference: (diff >= 0 ? `+${diff}` : `${diff}`),
        status: diff >= 20 ? 'تحسن كبير 🚀' : (diff > 0 ? 'تقدم ملحوظ 📈' : 'مستقر ⚖️')
      };
    });

    return sendJson(res, 200, { childId, baseline, latest, comparison });
  }

  // Skill-Specific Growth Journey
  const skillsGrowthMatch = pathname.match(/^\/api\/children\/(\d+)\/skills-growth$/);
  if (skillsGrowthMatch && method === 'GET') {
    const childId = Number(skillsGrowthMatch[1]);
    if (session && session.role === 'parent' && !isParentAllowedForChild(session, childId)) {
      return sendJson(res, 403, { error: 'غير مصرح لولي الأمر بالاطلاع على مهارات هذا الطفل' });
    }
    const skills = db.find('child_skill_levels', s => s.child_id === childId);
    return sendJson(res, 200, skills);
  }

  if (pathname === '/api/journey/approve-skill-level' && method === 'POST') {
    if (!session || (session.role !== 'admin' && session.role !== 'teacher')) {
      return sendJson(res, 403, { error: 'اعتماد ترقية المهارات مقتصر على المعلم المشرف' });
    }
    const { skillLevelId, newLevel, notes } = await parseJsonBody(req);
    const existing = db.findOne('child_skill_levels', s => s.id === Number(skillLevelId));
    if (!existing) return sendJson(res, 404, { error: 'سجل المهارة غير موجود' });

    let label = 'مبتدئ ⭐';
    if (newLevel === 'intermediate') label = 'متوسط ⭐⭐';
    if (newLevel === 'advanced') label = 'متقدم ⭐⭐⭐';

    const updated = db.update('child_skill_levels', existing.id, {
      current_level: newLevel,
      level_label: label,
      teacher_approved: true,
      approved_by: session.userId,
      approved_at: new Date().toISOString().split('T')[0],
      notes: notes || 'تم اعتماد الترقية بنجاح من المعلم'
    }, session.userId);

    return sendJson(res, 200, { success: true, updated });
  }

  // Custom AAC Symbols
  if (pathname === '/api/aac/symbols' && method === 'GET') {
    const childId = Number(query.child_id || 1);
    const symbols = db.find('custom_aac_symbols', s => s.child_id === childId);
    return sendJson(res, 200, symbols);
  }

  if (pathname === '/api/aac/symbols' && method === 'POST') {
    const payload = await parseJsonBody(req);
    const symbol = db.insert('custom_aac_symbols', {
      ...payload,
      created_by: session ? session.fullName : 'المعلم المشرف'
    }, session ? session.userId : null);
    return sendJson(res, 201, symbol);
  }

  // Certificates of Achievement
  if (pathname === '/api/certificates' && method === 'GET') {
    const childId = query.child_id ? Number(query.child_id) : null;
    let list = db.data.certificates;
    if (session && session.role === 'parent') {
      const allowed = getParentAllowedChildIds(session);
      if (childId) {
        if (!allowed.includes(childId)) return sendJson(res, 403, { error: 'غير مصرح بالاطلاع على شهادات هذا الطفل' });
        list = list.filter(c => c.child_id === childId);
      } else {
        list = list.filter(c => allowed.includes(c.child_id));
      }
    } else if (childId) {
      list = list.filter(c => c.child_id === childId);
    }
    return sendJson(res, 200, list);
  }

  if (pathname === '/api/certificates' && method === 'POST') {
    const payload = await parseJsonBody(req);
    const cert = db.insert('certificates', {
      ...payload,
      issued_date: payload.issued_date || new Date().toISOString().split('T')[0],
      teacher_name: session ? session.fullName : 'أ. سارة الأحمد'
    }, session ? session.userId : null);
    return sendJson(res, 201, cert);
  }

  if (childMatch && method === 'PUT') {
    const childId = Number(childMatch[1]);
    const updates = await parseJsonBody(req);
    const updated = db.update('children', childId, updates, session ? session.userId : null);
    return sendJson(res, 200, updated);
  }

  // 4. Learning Journey & Stage Unlock
  const journeyMatch = pathname.match(/^\/api\/children\/(\d+)\/journey$/);
  if (journeyMatch && method === 'GET') {
    const childId = Number(journeyMatch[1]);
    const stages = db.find('journey_stages', j => j.child_id === childId);
    return sendJson(res, 200, stages);
  }

  if (pathname === '/api/journey/advance' && method === 'POST') {
    const { childId, nextLevel } = await parseJsonBody(req);
    db.update('children', childId, { current_level: nextLevel }, session ? session.userId : null);

    const stage = db.findOne('journey_stages', s => s.child_id === Number(childId) && s.stage_number === nextLevel);
    if (stage) {
      db.update('journey_stages', stage.id, { is_unlocked: true }, session ? session.userId : null);
    }
    const prevStage = db.findOne('journey_stages', s => s.child_id === Number(childId) && s.stage_number === nextLevel - 1);
    if (prevStage) {
      db.update('journey_stages', prevStage.id, { is_completed: true }, session ? session.userId : null);
    }
    return sendJson(res, 200, { success: true, currentLevel: nextLevel });
  }

  // 5. Activities Hub
  if (pathname === '/api/activities' && method === 'GET') {
    const { disability, age_group } = query;
    let list = db.data.activities;
    if (disability && disability !== 'all') {
      list = list.filter(a => a.disability_type === disability || a.disability_type === 'both');
    }
    if (age_group && age_group !== 'all') {
      list = list.filter(a => a.age_group === age_group || a.age_group === '3-12');
    }
    return sendJson(res, 200, list);
  }

  // Record child attempt with graduated assistance logging
  if (pathname === '/api/activities/attempt' && method === 'POST') {
    const payload = await parseJsonBody(req);
    const helpLevel = payload.helpType || 'none';
    const attempt = db.insert('attempts', {
      child_id: payload.childId || (session ? session.childId : 1),
      activity_id: payload.activityId,
      score: payload.score || 100,
      duration_seconds: payload.duration || 30,
      help_type: helpLevel,
      prompt_level: helpLevel,
      success: payload.success !== false,
      attempt_date: new Date().toISOString()
    }, session ? session.userId : null);

    if (helpLevel !== 'none') {
      db.insert('help_prompts', {
        attempt_id: attempt.id,
        child_id: attempt.child_id,
        prompt_level: helpLevel,
        prompt_notes: payload.promptNotes || `تقديم مساعدة من نوع: ${helpLevel}`,
        recorded_at: new Date().toISOString()
      }, session ? session.userId : null);
    }

    if (payload.success !== false) {
      db.insert('rewards', {
        child_id: attempt.child_id,
        badge_name: 'نجمة التفوق والتألق ⭐',
        badge_icon: 'fa-star',
        points: 20,
        reason: `إكمال نشاط رقم ${payload.activityId} بنجاح مع مساعدة: ${helpLevel}`,
        awarded_at: new Date().toISOString()
      }, session ? session.userId : null);

      const allSuccess = db.find('attempts', a => a.child_id === attempt.child_id && a.success);
      if (allSuccess.length % 5 === 0) {
        db.insert('certificates', {
          child_id: attempt.child_id,
          title: `وسام المثابرة والإتقان (${allSuccess.length} إنجازات)`,
          skill_name: `إكمال سلسلة ${allSuccess.length} أنشطة تعليمية بنجاح باهر`,
          issued_date: new Date().toISOString().split('T')[0],
          teacher_name: 'أ. سارة الأحمد',
          score: '100%',
          message: 'نعتز بالبطل الرائع لالتزامه ومثابرته في التعلم والتطور المستمر!'
        }, session ? session.userId : null);
      }
    }

    return sendJson(res, 201, { success: true, attempt });
  }

  // 6. Assessments
  if (pathname === '/api/assessments' && method === 'GET') {
    const childId = query.child_id ? Number(query.child_id) : null;
    let list = db.data.assessments;
    if (session && session.role === 'parent') {
      const allowed = getParentAllowedChildIds(session);
      if (childId) {
        if (!allowed.includes(childId)) return sendJson(res, 403, { error: 'غير مصرح بالاطلاع على تقييمات هذا الطفل' });
        list = list.filter(a => a.child_id === childId);
      } else {
        list = list.filter(a => allowed.includes(a.child_id));
      }
    } else if (childId) {
      list = list.filter(a => a.child_id === childId);
    }
    return sendJson(res, 200, list);
  }

  if (pathname === '/api/assessments' && method === 'POST') {
    if (!session || (session.role !== 'admin' && session.role !== 'teacher')) {
      return sendJson(res, 403, { error: 'إجراء التقييم مخصص للمعلم والأخصائي فقط' });
    }
    const payload = await parseJsonBody(req);
    const assessment = db.insert('assessments', {
      ...payload,
      teacher_id: session.teacherId || 1,
      assessment_date: payload.assessment_date || new Date().toISOString().split('T')[0]
    }, session.userId);
    return sendJson(res, 201, assessment);
  }

  // 7. Individualized Education Programs (IEP) & Goals
  if (pathname === '/api/ieps' && method === 'GET') {
    const childId = query.child_id ? Number(query.child_id) : null;
    let list = db.data.ieps;
    if (session && session.role === 'parent') {
      const allowed = getParentAllowedChildIds(session);
      if (childId) {
        if (!allowed.includes(childId)) return sendJson(res, 403, { error: 'غير مصرح بالاطلاع على الخطة لهذا الطفل' });
        list = list.filter(i => i.child_id === childId);
      } else {
        list = list.filter(i => allowed.includes(i.child_id));
      }
    } else if (childId) {
      list = list.filter(i => i.child_id === childId);
    }
    return sendJson(res, 200, list);
  }

  if (pathname === '/api/ieps' && method === 'POST') {
    if (!session || (session.role !== 'admin' && session.role !== 'teacher')) {
      return sendJson(res, 403, { error: 'صلاحية غير كافية لإنشاء خطة تعليمية' });
    }
    const payload = await parseJsonBody(req);
    const iep = db.insert('ieps', {
      ...payload,
      teacher_id: session.teacherId || 1
    }, session.userId);
    return sendJson(res, 201, iep);
  }

  if (pathname === '/api/goals' && method === 'GET') {
    const iepId = query.iep_id ? Number(query.iep_id) : null;
    let list = db.data.goals;
    if (iepId) list = list.filter(g => g.iep_id === iepId);
    return sendJson(res, 200, list);
  }

  if (pathname === '/api/goals' && method === 'POST') {
    const payload = await parseJsonBody(req);
    const goal = db.insert('goals', payload, session ? session.userId : null);
    return sendJson(res, 201, goal);
  }

  // 8. Sessions & Teacher Notes
  if (pathname === '/api/sessions' && method === 'GET') {
    const childId = query.child_id ? Number(query.child_id) : null;
    let list = db.data.sessions;
    if (session && session.role === 'parent') {
      const allowed = getParentAllowedChildIds(session);
      if (childId) {
        if (!allowed.includes(childId)) return sendJson(res, 403, { error: 'غير مصرح بالاطلاع على جلسات هذا الطفل' });
        list = list.filter(s => s.child_id === childId);
      } else {
        list = list.filter(s => allowed.includes(s.child_id));
      }
    } else if (childId) {
      list = list.filter(s => s.child_id === childId);
    }
    return sendJson(res, 200, list);
  }

  if (pathname === '/api/sessions' && method === 'POST') {
    const payload = await parseJsonBody(req);
    const newSession = db.insert('sessions', {
      ...payload,
      teacher_id: session ? session.teacherId : 1
    }, session ? session.userId : null);
    return sendJson(res, 201, newSession);
  }

  if (pathname === '/api/notes' && method === 'GET') {
    const childId = query.child_id ? Number(query.child_id) : null;
    let list = db.data.teacher_notes;
    if (session && session.role === 'parent') {
      const allowed = getParentAllowedChildIds(session);
      if (childId) {
        if (!allowed.includes(childId)) return sendJson(res, 403, { error: 'غير مصرح بالاطلاع على ملاحظات هذا الطفل' });
        list = list.filter(n => n.child_id === childId);
      } else {
        list = list.filter(n => allowed.includes(n.child_id));
      }
    } else if (childId) {
      list = list.filter(n => n.child_id === childId);
    }
    return sendJson(res, 200, list);
  }

  if (pathname === '/api/notes' && method === 'POST') {
    const payload = await parseJsonBody(req);
    const note = db.insert('teacher_notes', {
      ...payload,
      teacher_id: session ? session.teacherId : 1,
      created_at: new Date().toISOString()
    }, session ? session.userId : null);
    return sendJson(res, 201, note);
  }

  // 9. Home Activities
  if (pathname === '/api/home-activities' && method === 'GET') {
    const childId = query.child_id ? Number(query.child_id) : null;
    let list = db.data.home_activities;
    if (session && session.role === 'parent') {
      const allowed = getParentAllowedChildIds(session);
      if (childId) {
        if (!allowed.includes(childId)) return sendJson(res, 403, { error: 'غير مصرح بالاطلاع على أنشطة هذا الطفل' });
        list = list.filter(h => h.child_id === childId);
      } else {
        list = list.filter(h => allowed.includes(h.child_id));
      }
    } else if (childId) {
      list = list.filter(h => h.child_id === childId);
    }
    return sendJson(res, 200, list);
  }

  if (pathname === '/api/home-activities' && method === 'POST') {
    const payload = await parseJsonBody(req);
    const act = db.insert('home_activities', {
      ...payload,
      teacher_id: session ? session.teacherId : 1,
      status: 'assigned'
    }, session ? session.userId : null);
    return sendJson(res, 201, act);
  }

  const homeActMatch = pathname.match(/^\/api\/home-activities\/(\d+)$/);
  if (homeActMatch && method === 'PUT') {
    const actId = Number(homeActMatch[1]);
    const updates = await parseJsonBody(req);
    const updated = db.update('home_activities', actId, updates, session ? session.userId : null);
    return sendJson(res, 200, updated);
  }

  // 10. Reports
  if (pathname === '/api/reports' && method === 'GET') {
    const childId = query.child_id ? Number(query.child_id) : null;
    let list = db.data.reports;
    if (session && session.role === 'parent') {
      const allowed = getParentAllowedChildIds(session);
      if (childId) {
        if (!allowed.includes(childId)) return sendJson(res, 403, { error: 'غير مصرح بالاطلاع على تقارير هذا الطفل' });
        list = list.filter(r => r.child_id === childId);
      } else {
        list = list.filter(r => allowed.includes(r.child_id));
      }
    } else if (childId) {
      list = list.filter(r => r.child_id === childId);
    }
    return sendJson(res, 200, list);
  }

  // 10-B. Detailed 12-Point Comprehensive Pedagogical Report
  if (pathname === '/api/reports/detailed' && method === 'GET') {
    if (!session) return sendJson(res, 401, { error: 'يجب تسجيل الدخول' });
    const childId = Number(query.child_id || (session.role === 'child' ? session.childId : 1));
    if (session.role === 'parent' && !isParentAllowedForChild(session, childId)) {
      return sendJson(res, 403, { error: 'غير مصرح لولي الأمر بالاطلاع على تقرير هذا الطفل' });
    }

    const child = db.findOne('children', c => c.id === childId);
    if (!child) return sendJson(res, 404, { error: 'الطفل غير موجود' });

    const parent = db.findOne('parents', p => p.id === (child.parent_id || 1)) || null;
    const teacher = db.findOne('teachers', t => t.id === (child.assigned_teacher_id || 1)) || null;
    const disability = db.findOne('disabilities', d => d.code === child.disability_code) || null;

    // 1. Basic Info
    const basicInfo = {
      id: child.id,
      name: child.full_name,
      age: child.age,
      birthDate: child.birth_date || '2021-04-10',
      photoUrl: child.photo_url,
      photoConsent: child.parent_consent_photo !== false,
      disabilityTitle: disability ? disability.name_ar : (child.disability_code === 'autism' ? 'اضطراب طيف التوحد' : 'متلازمة داون'),
      disabilityCode: child.disability_code,
      currentLevel: child.current_level,
      startDate: child.start_date || '2026-09-01',
      parentName: parent ? parent.full_name : 'خالد المنصور',
      parentPhone: parent ? parent.phone : '0501234567',
      teacherName: teacher ? teacher.full_name : 'أ. سارة الأحمد',
      strengths: child.strengths || 'قوة في المطابقة البصرية والاستجابة للبيئة الهادئة والروتين البصري',
      difficulties: child.difficulties || 'صعوبة في التواصل اللفظي التلقائي والحساسية للأصوات المفاجئة'
    };

    // 2. Assessments & Comparison
    const assessments = db.find('assessments', a => a.child_id === childId);
    const baselineAssessment = assessments.find(a => a.assessment_type === 'initial') || assessments[0] || null;
    const latestAssessment = assessments[assessments.length - 1] || null;

    // 3. Current Skill Levels
    const skillLevels = db.find('child_skill_levels', s => s.child_id === childId);

    // 4. Educational Goals (IEP)
    const ieps = db.find('ieps', i => i.child_id === childId);
    const iepIds = ieps.map(i => i.id);
    const goals = db.find('goals', g => iepIds.includes(g.iep_id));
    const completedGoals = goals.filter(g => g.status === 'completed');
    const inProgressGoals = goals.filter(g => g.status === 'in_progress');

    // 5. Executed Activities
    const attempts = db.find('attempts', a => a.child_id === childId);
    const distinctActivityIds = Array.from(new Set(attempts.map(a => a.activity_id)));
    const executedActivities = db.find('activities', a => distinctActivityIds.includes(a.id)).map(act => {
      const actAttempts = attempts.filter(a => a.activity_id === act.id);
      const lastAttempt = actAttempts[actAttempts.length - 1];
      return {
        id: act.id,
        title: act.title,
        category: act.category,
        domain: act.domain,
        attemptsCount: actAttempts.length,
        lastScore: lastAttempt ? lastAttempt.score : 0,
        lastHelpType: lastAttempt ? lastAttempt.help_type : 'none',
        lastDate: lastAttempt ? lastAttempt.attempt_date : null
      };
    });

    // 6. Attempt Results & Success Stats
    const totalAttempts = attempts.length;
    const successfulAttempts = attempts.filter(a => a.success !== false).length;
    const successRate = totalAttempts > 0 ? Math.round((successfulAttempts / totalAttempts) * 100) : 0;
    const avgScore = totalAttempts > 0 ? Math.round(attempts.reduce((acc, cur) => acc + (cur.score || 0), 0) / totalAttempts) : 0;

    // 7. Assistance Statistics (Graduated Prompting Breakdown)
    const assistanceStats = {
      none: attempts.filter(a => !a.help_type || a.help_type === 'none').length,
      re_explain: attempts.filter(a => a.help_type === 're_explain').length,
      visual_hint: attempts.filter(a => a.help_type === 'visual_hint').length,
      audio_hint: attempts.filter(a => a.help_type === 'audio_hint').length,
      reduce_options: attempts.filter(a => a.help_type === 'reduce_options').length,
      modeling: attempts.filter(a => a.help_type === 'modeling').length
    };
    const independenceRate = totalAttempts > 0 ? Math.round((assistanceStats.none / totalAttempts) * 100) : 0;

    // 8. Achievements & Certificates
    const rewards = db.find('rewards', r => r.child_id === childId);
    const certificates = db.find('certificates', c => c.child_id === childId);

    // 9. Progress Timeline
    const timeline = [];
    if (child.start_date) {
      timeline.push({ date: child.start_date, title: 'بدء البرنامج التأهيلي', description: 'تسجيل الطفل وبدء مرحلة التقييم المبدئي ووضع خطة التدخل', type: 'start' });
    }
    assessments.forEach(a => {
      timeline.push({ date: a.assessment_date, title: a.title, description: `إجمالي التقييم: ${a.baseline_score || 0}%`, type: 'assessment' });
    });
    certificates.forEach(c => {
      timeline.push({ date: c.issued_date, title: `وسام إنجاز: ${c.title}`, description: c.skill_name, type: 'certificate' });
    });
    const recentSessions = db.find('sessions', s => s.child_id === childId).slice(-3);
    recentSessions.forEach(s => {
      timeline.push({ date: s.session_date, title: `جلسة تأهيلية: ${s.targeted_skills || 'تنمية مهارات'}`, description: s.performance_level || 'أداء ممتاز', type: 'session' });
    });
    timeline.sort((a, b) => new Date(a.date) - new Date(b.date));

    // 10. Improved Skills
    const improvedSkills = skillLevels.filter(s => s.current_level === 'advanced' || s.current_level === 'intermediate' || s.teacher_approved).map(s => ({
      name: s.skill_name,
      domain: s.domain,
      level: s.level_label || s.current_level,
      notes: s.notes
    }));

    // 11. Skills Needing Practice
    const skillsNeedingPractice = skillLevels.filter(s => s.current_level === 'beginner' || !s.teacher_approved).map(s => ({
      name: s.skill_name,
      domain: s.domain,
      level: s.level_label || s.current_level,
      notes: s.notes
    }));

    // 12. Teacher Recommendations
    const teacherNotes = db.find('teacher_notes', n => n.child_id === childId);
    const latestSessions = db.find('sessions', s => s.child_id === childId);
    const recommendations = [];
    if (latestSessions.length > 0 && latestSessions[latestSessions.length - 1].next_session_recommendations) {
      recommendations.push(latestSessions[latestSessions.length - 1].next_session_recommendations);
    }
    teacherNotes.forEach(tn => {
      if (tn.recommendations) recommendations.push(tn.recommendations);
      else if (tn.content) recommendations.push(tn.content);
    });
    if (recommendations.length === 0) {
      recommendations.push('الاستمرار في التدريب اليومي مع تقليل المساعدات تدريجياً لتعزيز الاستقلالية الذاتية.');
      recommendations.push('تطبيق الجداول البصرية في المنزل قبل الوجبات وعند وقت النوم لترسيخ الروتين اليومي.');
    }

    return sendJson(res, 200, {
      reportId: `REP-${childId}-${Date.now().toString().slice(-6)}`,
      generatedAt: new Date().toISOString(),
      pedagogicalDisclaimer: 'ملاحظة تربوية هامة: هذا التقرير هو تقييم ومتابعة تربوية تعليمية لمساندة مسيرة الطفل وتطوير استقلاليته، ولا يُعد تشخيصًا طبيًا أو مقياس ذكاء رسمي.',
      basicInfo,
      assessments: {
        list: assessments,
        baseline: baselineAssessment,
        latest: latestAssessment
      },
      skillLevels,
      educationalGoals: {
        total: goals.length,
        completed: completedGoals.length,
        inProgress: inProgressGoals.length,
        goals
      },
      executedActivities,
      attemptStats: {
        totalAttempts,
        successfulAttempts,
        successRate: `${successRate}%`,
        averageScore: `${avgScore}%`,
        independenceRate: `${independenceRate}%`
      },
      assistanceStats,
      achievements: {
        rewardsCount: rewards.length,
        rewards,
        certificatesCount: certificates.length,
        certificates
      },
      progressTimeline: timeline,
      improvedSkills,
      skillsNeedingPractice,
      teacherRecommendations: recommendations
    });
  }

  // 11. Educational Resources (Teacher Library)
  if (pathname === '/api/resources' && method === 'GET') {
    const { category, level, search } = query;
    let list = db.data.resources;
    if (category && category !== 'all') {
      list = list.filter(r => r.category === category);
    }
    if (level && level !== 'all') {
      list = list.filter(r => r.level === level || !r.level);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r => (r.title && r.title.toLowerCase().includes(q)) || (r.description && r.description.toLowerCase().includes(q)));
    }
    return sendJson(res, 200, list);
  }

  if (pathname === '/api/resources' && method === 'POST') {
    if (!session || (session.role !== 'admin' && session.role !== 'teacher')) {
      return sendJson(res, 403, { error: 'صلاحية غير كافية لإضافة مورد للمكتبة' });
    }
    const payload = await parseJsonBody(req);
    const resource = db.insert('resources', payload, session.userId);
    return sendJson(res, 201, resource);
  }

  const resourceMatch = pathname.match(/^\/api\/resources\/(\d+)$/);
  if (resourceMatch && method === 'PUT') {
    if (!session || (session.role !== 'admin' && session.role !== 'teacher')) {
      return sendJson(res, 403, { error: 'صلاحية غير كافية لتعديل المورد' });
    }
    const resId = Number(resourceMatch[1]);
    const updates = await parseJsonBody(req);
    const updated = db.update('resources', resId, updates, session.userId);
    if (!updated) return sendJson(res, 404, { error: 'المورد غير موجود' });
    return sendJson(res, 200, updated);
  }

  if (resourceMatch && method === 'DELETE') {
    if (!session || (session.role !== 'admin' && session.role !== 'teacher')) {
      return sendJson(res, 403, { error: 'صلاحية غير كافية لحذف المورد' });
    }
    const resId = Number(resourceMatch[1]);
    const ok = db.delete('resources', resId, session.userId);
    if (!ok) return sendJson(res, 404, { error: 'المورد غير موجود' });
    return sendJson(res, 200, { success: true, message: 'تم حذف المورد بنجاح' });
  }

  // 12. Rewards & Badges
  if (pathname === '/api/rewards' && method === 'GET') {
    const childId = query.child_id ? Number(query.child_id) : (session ? session.childId : null);
    let list = db.data.rewards;
    if (session && session.role === 'parent') {
      const allowed = getParentAllowedChildIds(session);
      if (childId) {
        if (!allowed.includes(childId)) return sendJson(res, 403, { error: 'غير مصرح بالاطلاع على مكافآت هذا الطفل' });
        list = list.filter(r => r.child_id === childId);
      } else {
        list = list.filter(r => allowed.includes(r.child_id));
      }
    } else if (childId) {
      list = list.filter(r => r.child_id === Number(childId));
    }
    return sendJson(res, 200, list);
  }

  // 13. Customization & Sensory Preferences
  if (pathname === '/api/customizations' && method === 'GET') {
    const childId = query.child_id ? Number(query.child_id) : (session ? session.childId : 1);
    if (session && session.role === 'parent' && !isParentAllowedForChild(session, childId)) {
      return sendJson(res, 403, { error: 'غير مصرح بالوصول لتخصيصات هذا الطفل' });
    }
    const pref = db.findOne('customizations', c => c.child_id === Number(childId)) || {
      sensory_calm_mode: true,
      high_contrast: false,
      dark_mode: false,
      font_size: 18,
      audio_rate: 0.78
    };
    return sendJson(res, 200, pref);
  }

  if (pathname === '/api/customizations' && method === 'PUT') {
    const payload = await parseJsonBody(req);
    const childId = payload.child_id || (session ? session.childId : 1);
    if (session && session.role === 'parent' && !isParentAllowedForChild(session, childId)) {
      return sendJson(res, 403, { error: 'غير مصرح بتعديل تخصيصات هذا الطفل' });
    }
    const existing = db.findOne('customizations', c => c.child_id === Number(childId));
    if (existing) {
      const updated = db.update('customizations', existing.id, payload, session ? session.userId : null);
      return sendJson(res, 200, updated);
    } else {
      const created = db.insert('customizations', { ...payload, child_id: Number(childId) }, session ? session.userId : null);
      return sendJson(res, 201, created);
    }
  }

  // 14. Audit Logs (Admin only)
  if (pathname === '/api/audit-logs' && method === 'GET') {
    if (!session || session.role !== 'admin') {
      return sendJson(res, 403, { error: 'عرض سجل التعديلات يتطلب صلاحيات المدير' });
    }
    return sendJson(res, 200, db.data.audit_logs.slice(-100).reverse());
  }

  // 404 for unknown API
  return sendJson(res, 404, { error: 'المسار البرمجي غير موجود' });
}

module.exports = { handleApi };
