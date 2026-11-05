const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_FILE = path.join(__dirname, '..', 'database', 'hope_touch.db.json');

class Database {
  constructor() {
    this.data = {
      roles: [],
      users: [],
      teachers: [],
      parents: [],
      children: [],
      relationships: [],
      disabilities: [],
      skills: [],
      assessments: [],
      ieps: [],
      goals: [],
      journey_stages: [],
      activities: [],
      activity_levels: [],
      attempts: [],
      help_prompts: [],
      progress_logs: [],
      sessions: [],
      teacher_notes: [],
      home_activities: [],
      reports: [],
      customizations: [],
      resources: [],
      rewards: [],
      audit_logs: []
    };
    this.load();
  }

  hashPassword(password, salt = null) {
    if (!salt) {
      salt = crypto.randomBytes(16).toString('hex');
    }
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return { hash, salt };
  }

  verifyPassword(password, hash, salt) {
    const checkHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return checkHash === hash;
  }

  load() {
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        console.log('Database loaded successfully from file.');
        this.migrate();
        return;
      } catch (err) {
        console.error('Error reading database file, recreating initial state:', err);
      }
    }
    this.seed();
    this.migrate();
    this.save();
  }

  migrate() {
    let needsSave = false;
    if (!this.data.child_skill_levels) { this.data.child_skill_levels = []; needsSave = true; }
    if (!this.data.certificates) { this.data.certificates = []; needsSave = true; }
    if (!this.data.custom_aac_symbols) { this.data.custom_aac_symbols = []; needsSave = true; }
    if (!this.data.life_skills_progress) { this.data.life_skills_progress = []; needsSave = true; }

    // Enrich Child 1 (عمر خالد)
    const omar = this.data.children.find(c => c.id === 1);
    if (omar) {
      if (!omar.birth_date) omar.birth_date = '2021-04-10';
      if (omar.parent_consent_photo === undefined) omar.parent_consent_photo = true;
      if (!omar.start_date) omar.start_date = '2026-09-01';
      if (!omar.assigned_teacher_id) omar.assigned_teacher_id = 1;
      if (!omar.parent_id) omar.parent_id = 1;
      if (!omar.strengths) {
        omar.strengths = 'ذاكرة بصرية استثنائية، دقة عالية في فرز الألوان ومطابقة الصور، استجابة سريعة للأنشطة الرقمية الهادئة والروتين البصري المنظم.';
      }
      if (!omar.difficulties) {
        omar.difficulties = 'صعوبة في التواصل اللفظي التلقائي، حساسية تجاه الأصوات المفاجئة العالية، توتر عند تغيير الروتين بدون تنبيه مسبق.';
      }
      if (!omar.mastered_skills) {
        omar.mastered_skills = ['مطابقة الصور المتطابقة', 'التمييز بين الألوان الأساسية', 'استخدام بطاقة الماء عند العطش', 'التركيز على شاشة الجهاز لمدة 10 دقائق'];
      }
      if (!omar.skills_to_develop) {
        omar.skills_to_develop = ['تركيب جملة "أنا أريد"', 'التواصل البصري عند نداء الاسم', 'تسمية المشاعر الأساسية (فرح/حزن)', 'المشاركة في لعبة تبادل الأدوار'];
      }
      needsSave = true;
    }

    // Enrich Child 2 (نور سالم)
    const nour = this.data.children.find(c => c.id === 2);
    if (nour) {
      if (!nour.birth_date) nour.birth_date = '2019-08-20';
      if (nour.parent_consent_photo === undefined) nour.parent_consent_photo = true;
      if (!nour.start_date) nour.start_date = '2026-09-15';
      if (!nour.assigned_teacher_id) nour.assigned_teacher_id = 1;
      if (!nour.parent_id) nour.parent_id = 1;
      if (!nour.strengths) {
        nour.strengths = 'تفاعل اجتماعي ممتاز وحب للمشاركة والمرح، استجابة قوية للأناشيد والإيقاعات، رغبة مستمرة في التقليد والمساعدة.';
      }
      if (!nour.difficulties) {
        nour.difficulties = 'تأخر في وضوح مخارج الحروف، بطء خفيف في معالجة التعليمات المركبة، صعوبة في مسك القلم الدقيق.';
      }
      if (!nour.mastered_skills) {
        nour.mastered_skills = ['نطق الكلمات المفردة (ماما، بابا، ماء، قطة)', 'التعرف على الأرقام من 1 إلى 5', 'الاستجابة للتحية باليد والابتسامة', 'غسيل اليدين بالصابون'];
      }
      if (!nour.skills_to_develop) {
        nour.skills_to_develop = ['ربط كلمتين في جملة مفيدة', 'العد المطابق حتى 10', 'مسك القلم وتتبع الخطوط المنقطة', 'اتباع تعليمات من خطوتين'];
      }
      needsSave = true;
    }

    // Initialize child_skill_levels if empty
    if (this.data.child_skill_levels.length === 0) {
      this.data.child_skill_levels = [
        // عمر: متقدم في البصريات والمطابقة، مبتدئ في التواصل اللفظي
        { id: 1, child_id: 1, skill_name: 'المطابقة البصرية وتصنيف الصور', domain: 'التمييز البصري والسمعي', current_level: 'advanced', level_label: 'متقدم ⭐⭐⭐', system_recommended_level: 'advanced', teacher_approved: true, approved_by: 1, approved_at: '2026-10-20', notes: 'يتقن المطابقة بنسبة 95% بشكل مستقل تماماً.' },
        { id: 2, child_id: 1, skill_name: 'التواصل بتبادل الصور PECS', domain: 'التواصل', current_level: 'intermediate', level_label: 'متوسط ⭐⭐', system_recommended_level: 'advanced', teacher_approved: false, approved_by: null, approved_at: null, notes: 'يقترح النظام ترقيته إلى متقدم بعد إتقان بطاقات الاحتياج اليومي، بانتظار مراجعة المعلم.' },
        { id: 3, child_id: 1, skill_name: 'النطق والتعبير اللفظي', domain: 'اللغة والاستيعاب', current_level: 'beginner', level_label: 'مبتدئ ⭐', system_recommended_level: 'beginner', teacher_approved: true, approved_by: 1, approved_at: '2026-10-01', notes: 'يحتاج تعزيزاً مستمراً بمساعدة صوتية تدريجية.' },
        { id: 4, child_id: 1, skill_name: 'الانتباه والتركيز المشترك', domain: 'الانتباه والتركيز', current_level: 'intermediate', level_label: 'متوسط ⭐⭐', system_recommended_level: 'intermediate', teacher_approved: true, approved_by: 1, approved_at: '2026-10-15', notes: 'تحسن من 3 ثوانٍ إلى 10 ثوانٍ تركيز متواصل.' },
        { id: 5, child_id: 1, skill_name: 'المهارات الحياتية والاستقلالية', domain: 'المهارات الحياتية والاستقلالية', current_level: 'beginner', level_label: 'مبتدئ ⭐', system_recommended_level: 'intermediate', teacher_approved: false, approved_by: null, approved_at: null, notes: 'أتقن غسيل اليدين، اقترح النظام ترقية المستوى بانتظار اعتماد المعلم.' },
        
        // نور: متقدمة في المهارات الاجتماعية، متوسطة في الأكاديمي
        { id: 6, child_id: 2, skill_name: 'التفاعل والتواصل الاجتماعي', domain: 'المهارات الاجتماعية', current_level: 'advanced', level_label: 'متقدم ⭐⭐⭐', system_recommended_level: 'advanced', teacher_approved: true, approved_by: 1, approved_at: '2026-10-15', notes: 'تشارك بابتسامة وتحية وتبادل أدوار ممتاز.' },
        { id: 7, child_id: 2, skill_name: 'التمييز السمعي والتقليد الصوتي', domain: 'التمييز البصري والسمعي', current_level: 'intermediate', level_label: 'متوسط ⭐⭐', system_recommended_level: 'intermediate', teacher_approved: true, approved_by: 1, approved_at: '2026-10-10', notes: 'تقلد أصوات الحيوانات والحروف الأولى بنجاح.' },
        { id: 8, child_id: 2, skill_name: 'التعرف على الأرقام والأشكال', domain: 'المهارات الأكاديمية', current_level: 'beginner', level_label: 'مبتدئ ⭐', system_recommended_level: 'intermediate', teacher_approved: false, approved_by: null, approved_at: null, notes: 'أتمت مطابقة 1-5، يقترح النظام الانتقال للمتوسط بعد مراجعة المعلمة.' }
      ];
      needsSave = true;
    }

    // Ensure 10-domain assessments exist for comparison
    const omarAssessments = this.data.assessments.filter(a => a.child_id === 1);
    if (omarAssessments.length < 2) {
      // Reassessment (التقييم المستمر الثاني لمقارنة التقدم)
      this.data.assessments.push({
        id: this.getNextId('assessments'),
        child_id: 1,
        teacher_id: 1,
        assessment_date: '2026-11-04',
        assessment_type: 'reassessment', // تقييم مستمر لمقارنته بخط الأساس
        title: 'التقييم التربوي الشامل الثاني (مقارنة خط الأساس)',
        domain_scores: {
          'الانتباه والتركيز': { score: 70, baseline: 40, diff: '+30' },
          'التواصل': { score: 65, baseline: 35, diff: '+30' },
          'اللغة والاستيعاب': { score: 50, baseline: 30, diff: '+20' },
          'الإدراك': { score: 85, baseline: 60, diff: '+25' },
          'الذاكرة': { score: 80, baseline: 55, diff: '+25' },
          'المهارات الاجتماعية': { score: 45, baseline: 25, diff: '+20' },
          'التمييز البصري والسمعي': { score: 90, baseline: 70, diff: '+20' },
          'المهارات الحركية الدقيقة': { score: 60, baseline: 45, diff: '+15' },
          'المهارات الأكاديمية': { score: 55, baseline: 35, diff: '+20' },
          'المهارات الحياتية والاستقلالية': { score: 65, baseline: 40, diff: '+25' }
        },
        baseline_score: 66,
        max_score: 100,
        status: 'completed',
        summary: 'أظهر عمر تطوراً ملحوظاً في مجالات الانتباه والإدراك البصري والتواصل عبر PECS مقارنة بالتقييم المبدئي.',
        strengths_identified: 'المطابقة البصرية والذاكرة والتنظيم الحسي.',
        needs_identified: 'التواصل اللفظي التلقائي وتوسيع التفاعل الاجتماعي مع الأقران.',
        pedagogical_disclaimer: 'هذا تقييم تربوي تعليمي لمساعدة المعلم في التخطيط، وليس تشخيصًا طبيًا أو اختبار ذكاء.'
      });
      needsSave = true;
    }

    // Ensure Certificates exist
    if (this.data.certificates.length === 0) {
      this.data.certificates = [
        {
          id: 1,
          child_id: 1,
          title: 'شهادة إنجاز واعتزاز: بطل التواصل الذكي 🌟',
          skill_name: 'إتقان استخدام بطاقات التواصل بتبادل الصور PECS',
          issued_date: '2026-11-04',
          teacher_name: 'أ. سارة الأحمد',
          score: '100%',
          message: 'نبارك للبطل الرائع عمر خالد المنصور تميزه وإتقانه لمهارة التواصل بالصور بكل فخر واعتزاز!'
        },
        {
          id: 2,
          child_id: 2,
          title: 'شهادة إنجاز واعتزاز: أميرة الأشكال والألوان 🎨',
          skill_name: 'مطابقة الأشكال والألوان الأساسية باستقلالية تامة',
          issued_date: '2026-11-04',
          teacher_name: 'أ. سارة الأحمد',
          score: '100%',
          message: 'نبارك للبطلة الذكية نور سالم الراشد إتقانها المتميز للمطابقة البصرية والأشكال!'
        }
      ];
      needsSave = true;
    }

    // Ensure Custom AAC Symbols table has initial entries
    if (this.data.custom_aac_symbols.length === 0) {
      this.data.custom_aac_symbols = [
        { id: 1, child_id: 1, text: 'أريد أن آكل', emoji: '🍽️', category: 'needs', speech: 'أنا جائع، أريد أن آكل وجبتي اللذيذة', created_by: 'أ. سارة الأحمد' },
        { id: 2, child_id: 1, text: 'أريد أن أشرب', emoji: '🥛', category: 'needs', speech: 'أنا عطشان، أريد أن أشرب ماء نظيف', created_by: 'أ. سارة الأحمد' },
        { id: 3, child_id: 1, text: 'أريد المساعدة', emoji: '🆘', category: 'needs', speech: 'من فضلك يا معلمتي، أحتاج مساعدتك', created_by: 'أ. سارة الأحمد' },
        { id: 4, child_id: 1, text: 'أريد الراحة', emoji: '🛋️', category: 'needs', speech: 'أشعر بالتعب، أريد أن أرتاح قليلاً في ركن الهدوء', created_by: 'أ. سارة الأحمد' },
        { id: 5, child_id: 1, text: 'أريد اللعب', emoji: '🧸', category: 'needs', speech: 'أريد أن ألعب بلعبتي المفضلة', created_by: 'أ. سارة الأحمد' },
        { id: 6, child_id: 1, text: 'أريد الذهاب إلى الحمام', emoji: '🚽', category: 'needs', speech: 'أحتاج الذهاب إلى الحمام الآن من فضلك', created_by: 'أ. سارة الأحمد' },
        { id: 7, child_id: 1, text: 'أنا سعيد', emoji: '😊', category: 'emotions', speech: 'أنا سعيد وفرحان اليوم!', created_by: 'أ. سارة الأحمد' },
        { id: 8, child_id: 1, text: 'أنا حزين', emoji: '😢', category: 'emotions', speech: 'أنا أشعر بالحزن، أحتاج إلى من يواسيني', created_by: 'أ. سارة الأحمد' },
        { id: 9, child_id: 1, text: 'أنا غاضب', emoji: '😠', category: 'emotions', speech: 'أنا أشعر بالغضب، أحتاج تنفساً عميقاً وبيئة هادئة', created_by: 'أ. سارة الأحمد' }
      ];
      needsSave = true;
    }

    // Ensure Sessions have all comprehensive educational fields
    this.data.sessions.forEach(sess => {
      if (!sess.targeted_skills) sess.targeted_skills = 'التواصل البصري وسحب بطاقة الطلب PECS';
      if (!sess.activities_performed) sess.activities_performed = 'نشاط مطابقة الصور ولعبة فقاعات الهدوء الحسي';
      if (!sess.child_response) sess.child_response = 'استجابة ممتازة وهادئة بعد التهدئة الحسية';
      if (!sess.attempts_count) sess.attempts_count = 6;
      if (!sess.help_type) sess.help_type = 'إيمائية خفيفة (gestural)';
      if (!sess.performance_level) sess.performance_level = 'متوسط مرتفع (80%)';
      if (!sess.difficulties_observed) sess.difficulties_observed = 'تشتت طفيف عند وجود أصوات مفاجئة بالخارج';
      if (!sess.teacher_notes) sess.teacher_notes = 'أظهر الطفل تحسنًا في سرعة الاستجابة لبطاقة الماء';
      if (!sess.next_session_recommendations) sess.next_session_recommendations = 'الانتقال لتركيب جملة "أنا أريد" وتثبيت روتين الشرب المستقل';
      if (!sess.start_time) sess.start_time = '10:00 ص';
      if (!sess.end_time) sess.end_time = '10:45 ص';
    });

    // Ensure Home Activities are linked to IEP
    this.data.home_activities.forEach(h => {
      if (!h.target_skill) h.target_skill = 'التواصل اليومي بالصور (PECS)';
      if (!h.suggested_duration) h.suggested_duration = '15 دقيقة يوميًا عند الغداء';
      if (!h.send_date) h.send_date = '2026-11-01';
      if (!h.iep_goal_id) h.iep_goal_id = 1;
    });

    if (needsSave) {
      this.save();
      console.log('Database schema migrated successfully with all required child profile, assessment, and journey features.');
    }
  }

  save() {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
  }

  logAudit(userId, action, table, recordId, details = {}) {
    const auditRecord = {
      id: this.getNextId('audit_logs'),
      user_id: userId || null,
      action,
      target_table: table,
      record_id: recordId,
      details,
      timestamp: new Date().toISOString()
    };
    this.data.audit_logs.push(auditRecord);
    this.save();
    return auditRecord;
  }

  getNextId(table) {
    const items = this.data[table] || [];
    if (items.length === 0) return 1;
    return Math.max(...items.map(item => item.id || 0)) + 1;
  }

  find(table, predicate) {
    return (this.data[table] || []).filter(predicate);
  }

  findOne(table, predicate) {
    return (this.data[table] || []).find(predicate);
  }

  insert(table, record, actorUserId = null) {
    if (!this.data[table]) {
      this.data[table] = [];
    }
    const newRecord = {
      id: record.id || this.getNextId(table),
      ...record,
      created_at: record.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.data[table].push(newRecord);
    this.save();
    this.logAudit(actorUserId, 'INSERT', table, newRecord.id, { created: true });
    return newRecord;
  }

  update(table, id, updates, actorUserId = null) {
    const list = this.data[table] || [];
    const index = list.findIndex(item => item.id === Number(id));
    if (index === -1) return null;

    const oldRecord = { ...list[index] };
    const updatedRecord = {
      ...oldRecord,
      ...updates,
      id: oldRecord.id, // prevent changing primary key
      updated_at: new Date().toISOString()
    };
    list[index] = updatedRecord;
    this.save();
    this.logAudit(actorUserId, 'UPDATE', table, id, { updates });
    return updatedRecord;
  }

  delete(table, id, actorUserId = null) {
    const list = this.data[table] || [];
    const index = list.findIndex(item => item.id === Number(id));
    if (index === -1) return false;

    const removed = list.splice(index, 1)[0];
    this.save();
    this.logAudit(actorUserId, 'DELETE', table, id, { deletedRecord: removed });
    return true;
  }

  seed() {
    console.log('Seeding database with clinical, educational, and initial account data...');

    // 1. الأدوار والصلاحيات
    this.data.roles = [
      { id: 1, name: 'admin', label_ar: 'المدير', permissions: ['all'] },
      { id: 2, name: 'teacher', label_ar: 'المعلم / الأخصائي', permissions: ['children.manage', 'assessments.all', 'ieps.all', 'activities.manage', 'sessions.all', 'notes.all', 'reports.view'] },
      { id: 3, name: 'parent', label_ar: 'ولي الأمر', permissions: ['child.view_own', 'home_activities.view_update', 'notes.view_own', 'reports.view_own'] },
      { id: 4, name: 'child', label_ar: 'الطفل البطل', permissions: ['activities.play', 'journey.view_own', 'rewards.view_own'] }
    ];

    // 2. الفئات المستهدفة
    this.data.disabilities = [
      {
        id: 1,
        code: 'autism',
        name_ar: 'اضطراب طيف التوحد (Autism Spectrum Disorder)',
        description: 'اضطراب نمائي عصبي يؤثر في التواصل الاجتماعي والتفاعل اللفظي وغير اللفظي مع سلوكيات نمطية.',
        min_age: 3,
        max_age: 12,
        icon: 'fa-puzzle-piece',
        color: '#2563eb'
      },
      {
        id: 2,
        code: 'down',
        name_ar: 'متلازمة داون (Down Syndrome)',
        description: 'حالة وراثية تنتج عن وجود نسخة إضافية من الكروموسوم 21 تسبب تأخرًا ذهنيًا ونمائيًا خفيفًا إلى متوسط.',
        min_age: 3,
        max_age: 12,
        icon: 'fa-star',
        color: '#d97706'
      }
    ];

    // 3. المستخدمين
    const adminPass = this.hashPassword('admin123');
    const teacherPass = this.hashPassword('teacher123');
    const parentPass = this.hashPassword('parent123');
    const childPass1 = this.hashPassword('child123');
    const childPass2 = this.hashPassword('child123');

    this.data.users = [
      {
        id: 1,
        username: 'admin',
        email: 'admin@hopetouch.edu',
        password_hash: adminPass.hash,
        salt: adminPass.salt,
        role_id: 1,
        full_name: 'د. عبد الله الشمري (المدير الإداري)',
        phone: '0501112233',
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: 2,
        username: 'teacher_sarah',
        email: 'sarah@hopetouch.edu',
        password_hash: teacherPass.hash,
        salt: teacherPass.salt,
        role_id: 2,
        full_name: 'أ. سارة الأحمد (أخصائية نطق وتخاطب وتربية خاصة)',
        phone: '0502223344',
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: 3,
        username: 'parent_khalid',
        email: 'khalid@gmail.com',
        password_hash: parentPass.hash,
        salt: parentPass.salt,
        role_id: 3,
        full_name: 'خالد المنصور (ولي أمر)',
        phone: '0503334455',
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: 4,
        username: 'child_omar',
        email: 'omar@hopetouch.edu',
        password_hash: childPass1.hash,
        salt: childPass1.salt,
        role_id: 4,
        full_name: 'عمر خالد المنصور',
        phone: '',
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: 5,
        username: 'child_nour',
        email: 'nour@hopetouch.edu',
        password_hash: childPass2.hash,
        salt: childPass2.salt,
        role_id: 4,
        full_name: 'نور سالم الراشد',
        phone: '',
        is_active: true,
        created_at: new Date().toISOString()
      }
    ];

    // 4. ملف المعلم
    this.data.teachers = [
      {
        id: 1,
        user_id: 2,
        specialization: 'تربية خاصة وتعديل سلوك ونطق وتخاطب',
        license_number: 'SP-EDU-8921',
        bio: 'خبرة 8 سنوات في التدخل المبكر للأطفال ذوي طيف التوحد ومتلازمة داون وتطبيق نظام PECS.'
      }
    ];

    // 5. ملف أولياء الأمور
    this.data.parents = [
      {
        id: 1,
        user_id: 3,
        relationship_type: 'أب',
        full_name: 'خالد المنصور',
        phone: '0503334455',
        address: 'الرياض - حي النخيل'
      }
    ];

    // 6. ملفات الأطفال
    this.data.children = [
      {
        id: 1,
        user_id: 4,
        full_name: 'عمر خالد المنصور',
        gender: 'ذكر',
        birth_date: '2021-04-10',
        age: 5,
        disability_id: 1,
        disability_code: 'autism',
        current_level: 1, // المستوى 1: بداية مطابقة الأصوات وبطاقات التواصل
        sensory_profile: 'حساسية صوتية متوسطة للأصوات المفاجئة، استجابة بصرية ممتازة للألوان الهادئة.',
        avatar: 'boy-1',
        emergency_contact: '0503334455 (الأب)',
        created_at: new Date().toISOString()
      },
      {
        id: 2,
        user_id: 5,
        full_name: 'نور سالم الراشد',
        gender: 'أنثى',
        birth_date: '2019-08-20',
        age: 7,
        disability_id: 2,
        disability_code: 'down',
        current_level: 2, // المستوى 2: تكوين جمل قصيرة والتعرف على الأرقام
        sensory_profile: 'تفاعل حركي وبصري رائع، تحب الأناشيد الإيقاعية والتكرار البصري.',
        avatar: 'girl-1',
        emergency_contact: '0504445566 (الأم)',
        created_at: new Date().toISOString()
      }
    ];

    // 7. ربط الأطفال بالمعلمين وأولياء الأمور
    this.data.relationships = [
      {
        id: 1,
        child_id: 1,
        teacher_id: 1,
        parent_id: 1,
        assigned_date: '2026-09-01',
        status: 'active'
      },
      {
        id: 2,
        child_id: 2,
        teacher_id: 1,
        parent_id: 1,
        assigned_date: '2026-09-10',
        status: 'active'
      }
    ];

    // 8. المهارات التعليمية
    this.data.skills = [
      { id: 1, disability_id: 1, category: 'تواصل وبصريات', skill_name: 'التواصل البصري والتنبيه الحسي', target_age_min: 3, target_age_max: 5, level: 0 },
      { id: 2, disability_id: 1, category: 'تواصل بديل AAC', skill_name: 'التعبير بالصور عبر بطاقات PECS', target_age_min: 3, target_age_max: 6, level: 1 },
      { id: 3, disability_id: 1, category: 'لغة وتخاطب', skill_name: 'نطق الكلمات الأولى وتسمية الأشياء', target_age_min: 4, target_age_max: 8, level: 2 },
      { id: 4, disability_id: 1, category: 'تفاعل اجتماعي', skill_name: 'تبادل الأدوار وفهم المشاعر والانفعالات', target_age_min: 6, target_age_max: 10, level: 3 },
      { id: 5, disability_id: 1, category: 'استقلالية وحوار', skill_name: 'بدء المحادثة وطلب المساعدة المباشرة', target_age_min: 8, target_age_max: 12, level: 4 },
      
      { id: 6, disability_id: 2, category: 'نطق ولغة', skill_name: 'المحاكاة الصوتية ونطق الكلمات اليومية', target_age_min: 3, target_age_max: 6, level: 1 },
      { id: 7, disability_id: 2, category: 'إدراك معرفي', skill_name: 'التمييز بين الأشكال والألوان الأساسية', target_age_min: 3, target_age_max: 7, level: 1 },
      { id: 8, disability_id: 2, category: 'حساب وأرقام', skill_name: 'العد المطابق من 1 إلى 10 بالصور', target_age_min: 6, target_age_max: 9, level: 2 },
      { id: 9, disability_id: 2, category: 'مهارات حياتية', skill_name: 'تسلسل خطوات النظافة الشخصية والعناية الذاتية', target_age_min: 7, target_age_max: 12, level: 3 }
    ];

    // 9. مراحل الرحلة التعليمية للطفل عمر (طيف التوحد)
    this.data.journey_stages = [
      {
        id: 1,
        child_id: 1,
        stage_number: 0,
        stage_name: 'المستوى 0: التهدئة والتحفيز الحسي (Sensory Foundations)',
        description: 'ألعاب لمسية هادئة وفقاعات لتنظيم الإحساس دون متطلبات لغوية مجهدة.',
        is_unlocked: true,
        is_completed: true
      },
      {
        id: 2,
        child_id: 1,
        stage_number: 1,
        stage_name: 'المستوى 1: الربط بين الصوت والرمز البصري (PECS Starter)',
        description: 'لمس الصورة وسماع نطقها الواضح والربط بين الرمز والطلب الحقيقي.',
        is_unlocked: true,
        is_completed: false
      },
      {
        id: 3,
        child_id: 1,
        stage_number: 2,
        stage_name: 'المستوى 2: تكوين جملة الطلب (أنا أريد...)',
        description: 'تركيب شريط الجملة المصورة لطلب الاحتياجات اليومية.',
        is_unlocked: false,
        is_completed: false
      },
      {
        id: 4,
        child_id: 1,
        stage_number: 3,
        stage_name: 'المستوى 3: التعبير عن المشاعر والتفاعل الوجداني',
        description: 'التعرف على وجوه الفرح والحزن والغضب والتعبير عن الشعور الداخلي.',
        is_unlocked: false,
        is_completed: false
      },
      {
        id: 5,
        child_id: 1,
        stage_number: 4,
        stage_name: 'المستوى 4: المحادثة والتفاعل الاجتماعي والاستقلالية',
        description: 'سيناريوهات الحياة الواقعية وتبادل التحية والحديث مع الآخرين.',
        is_unlocked: false,
        is_completed: false
      }
    ];

    // 10. التقييمات التربوية التشخيصية
    this.data.assessments = [
      {
        id: 1,
        child_id: 1,
        teacher_id: 1,
        assessment_date: '2026-10-15',
        domain: 'التواصل والتفاعل الاجتماعي',
        baseline_score: 45,
        max_score: 100,
        status: 'completed',
        summary: 'يستجيب عمر للمثيرات البصرية بسهولة، ولديه رغبة في التواصل عند استخدام بطاقات PECS، لكنه يحتاج تدرجاً في خفض المساعدة الجسدية.',
        recommendations: 'التركيز على بطاقات التواصل اليومية (ماء، أكل، حمام)، وتثبيت روتين جدول الأنشطة البصري.'
      },
      {
        id: 2,
        child_id: 2,
        teacher_id: 1,
        assessment_date: '2026-10-18',
        domain: 'اللغة التعبيرية والمهارات الإدراكية',
        baseline_score: 60,
        max_score: 100,
        status: 'completed',
        summary: 'تستطيع نور نطق الكلمات المفردة بوضوح عند تقليد النموذج، وتحتاج لدعم في ربط كلمتين معاً.',
        recommendations: 'تدريب على أنشطة التسمية المزدوجة ولعبة الأشكال والألوان المتطابقة.'
      }
    ];

    // 11. الخطط التعليمية الفردية (IEP)
    this.data.ieps = [
      {
        id: 1,
        child_id: 1,
        teacher_id: 1,
        title: 'الخطة الفردية للفصل الدراسي الأول - عمر',
        start_date: '2026-10-01',
        end_date: '2027-01-30',
        summary: 'بناء مهارات التواصل الوظيفي عبر بطاقات PECS وتطوير مهارة التعبير عن الرغبات والاستجابة لجدول النشاط اليومي.',
        status: 'active'
      },
      {
        id: 2,
        child_id: 2,
        teacher_id: 1,
        title: 'الخطة الفردية للفصل الدراسي الأول - نور',
        start_date: '2026-10-01',
        end_date: '2027-01-30',
        summary: 'توسيع الحصيلة اللغوية إلى 50 كلمة ومطابقة الأرقام 1-10 وتسلسل خطوات العناية الشخصية.',
        status: 'active'
      }
    ];

    // 12. الأهداف التعليمية التفصيلية
    this.data.goals = [
      {
        id: 1,
        iep_id: 1,
        skill_id: 2,
        goal_text: 'أن يسحب الطفل بطاقة "أريد ماء" ويسلمها للمعلم عند الشعور بالعطش بنسبة نجاح 80% بمساعدة إيمائية خفيفة.',
        target_date: '2026-12-01',
        criteria: '8 من 10 محاولات صحيحة خلال 3 جلسات متتالية',
        status: 'in_progress',
        progress_percentage: 65
      },
      {
        id: 2,
        iep_id: 1,
        skill_id: 1,
        goal_text: 'أن يركز الطفل انتباهه البصري على بطاقة النشاط لمدة 5 ثوانٍ متصلة عند سماع اسمه.',
        target_date: '2026-11-20',
        criteria: '100% نجاح في 5 جلسات',
        status: 'achieved',
        progress_percentage: 100
      },
      {
        id: 3,
        iep_id: 2,
        skill_id: 7,
        goal_text: 'أن تطابق الطفلة 4 أشكال هندسية (دائرة، مربع، مثلث، نجمة) مع نظائرها بنجاح تام وبشكل مستقل.',
        target_date: '2026-12-15',
        criteria: '90% دقة مستقلة',
        status: 'in_progress',
        progress_percentage: 75
      }
    ];

    // 13. بنك الأنشطة التعليمية التفاعلية
    this.data.activities = [
      {
        id: 1,
        disability_type: 'autism',
        age_group: '3-5',
        stage_id: 1,
        title: 'فرقعة فقاعات الهدوء الحسي 🫧',
        description: 'نشاط مهدئ للأصابع والتركيز: انقر على الفقاعات لسماع صوت ناعم ومريح مع رؤية ألوان مهدئة.',
        category: 'sensory',
        icon: 'fa-soap',
        color: '#38bdf8'
      },
      {
        id: 2,
        disability_type: 'autism',
        age_group: '3-5',
        stage_id: 2,
        title: 'لوحة بطاقات التواصل السريعة (PECS) 🗂️',
        description: 'اختر ما تريده الآن: ماء، عصير، حمام، راحة، لعبة. استمع للكلمة بصوت واضح ونطق لطيف.',
        category: 'aac',
        icon: 'fa-shapes',
        color: '#6366f1'
      },
      {
        id: 3,
        disability_type: 'autism',
        age_group: '6-8',
        stage_id: 3,
        title: 'تكوين جملة الطلب: أنا أريد... 🧩',
        description: 'ضع رمز "أنا أريد" ثم اختر الشيء المحبب لك وشاهد الجملة تنطق كاملة مع تشجيع واحتفال.',
        category: 'language',
        icon: 'fa-puzzle-piece',
        color: '#ec4899'
      },
      {
        id: 4,
        disability_type: 'autism',
        age_group: '9-12',
        stage_id: 4,
        title: 'مختبر المشاعر والمواقف الاجتماعية 🎭',
        description: 'كيف يشعر صديقنا في هذا الموقف؟ اختر الشعور المناسب واكتشف الحل الأفضل للتعامل معه.',
        category: 'social',
        icon: 'fa-face-smile',
        color: '#10b981'
      },
      {
        id: 5,
        disability_type: 'down',
        age_group: '3-5',
        stage_id: 6,
        title: 'أصدقاء الأصوات والكلمات الأولى 🗣️',
        description: 'استمع إلى أصوات الحيوانات والكلمات المحببة (ماما، بابا، ماء، قطة) وردد معنا ببهجة.',
        category: 'speech',
        icon: 'fa-microphone',
        color: '#f59e0b'
      },
      {
        id: 6,
        disability_type: 'down',
        age_group: '6-8',
        stage_id: 7,
        title: 'ألوان وأشكال الأبطال 🎨',
        description: 'طابق الدائرة الحمراء والمربع الأزرق والمثلث الأخضر مع أشكالها المطابقة واسمع التعزيز الفوري.',
        category: 'cognitive',
        icon: 'fa-palette',
        color: '#8b5cf6'
      },
      {
        id: 7,
        disability_type: 'down',
        age_group: '9-12',
        stage_id: 8,
        title: 'عد النجوم والأرقام الذكية 🔢',
        description: 'عد النجوم اللامعة من 1 إلى 10 وضع الرقم المناسب في صندوق الكنز لتفوز بنجمة ذهبية.',
        category: 'math',
        icon: 'fa-star',
        color: '#14b8a6'
      },
      {
        id: 8,
        disability_type: 'both',
        age_group: '3-12',
        stage_id: 9,
        title: 'بطل المهارات الحياتية: غسيل اليدين والروتين 🧼',
        description: 'خطوات مصورة خطوة بخطوة بالترتيب: فتح الصنبور، وضع الصابون، فرك اليدين، التجفيف بالمنشفة.',
        category: 'life-skills',
        icon: 'fa-hands-bubbles',
        color: '#06b6d4'
      }
    ];

    // 14. الجلسات التدريبية
    this.data.sessions = [
      {
        id: 1,
        child_id: 1,
        teacher_id: 1,
        session_date: '2026-11-03',
        duration_minutes: 45,
        objectives: 'تدريب على سحب بطاقة الطلب (ماء / عصير) مع تقليل المساعدة اللفظية.',
        outcome: 'أظهر عمر استجابة ممتازة واستطاع طلب الماء مرتين متتاليتين بمساعدة إيمائية فقط.',
        status: 'completed'
      },
      {
        id: 2,
        child_id: 1,
        teacher_id: 1,
        session_date: '2026-11-06',
        duration_minutes: 45,
        objectives: 'الربط بين الشعور بالسعادة والوجه المبتسم في نشاط المشاعر.',
        outcome: '',
        status: 'scheduled'
      }
    ];

    // 15. ملاحظات المعلم اليومية
    this.data.teacher_notes = [
      {
        id: 1,
        child_id: 1,
        teacher_id: 1,
        session_id: 1,
        note_type: 'behavioral',
        note_text: 'كان تركيز عمر ممتازاً اليوم وهادئاً جداً بعد استخدام وضع الهدوء الحسي قبل بداية الجلسة.',
        created_at: '2026-11-03T11:00:00Z'
      },
      {
        id: 2,
        child_id: 1,
        teacher_id: 1,
        session_id: 1,
        note_type: 'sensory',
        note_text: 'يفضل دائماً نبرة الصوت الهادئة بسرعة 0.75، تجنب الأصوات العالية أو النغمات المفاجئة.',
        created_at: '2026-11-03T11:15:00Z'
      }
    ];

    // 16. الأنشطة المنزلية مع ولي الأمر
    this.data.home_activities = [
      {
        id: 1,
        child_id: 1,
        teacher_id: 1,
        parent_id: 1,
        title: 'تطبيق بطاقة الماء عند وجبة الغداء',
        instructions: 'ضع بطاقة الماء على الطاولة أمام عمر أثناء وجبة الغداء، وشجعه على لمسها أو تسليمها قبل تقديم الكوب.',
        due_date: '2026-11-08',
        status: 'completed',
        parent_feedback: 'نجحنا في ذلك اليوم! أشار للبطاقة قبل أن يأخذ الكوب وكان سعيداً بصوت التطبيق.',
        completed_at: '2026-11-04T14:30:00Z'
      },
      {
        id: 2,
        child_id: 1,
        teacher_id: 1,
        parent_id: 1,
        title: 'الروتين البصري قبل النوم',
        instructions: 'عرض خطوات النوم البسيطة (تفريش الأسنان، ارتداء البيجاما، قراءة قصة قصيرة).',
        due_date: '2026-11-10',
        status: 'assigned',
        parent_feedback: '',
        completed_at: null
      }
    ];

    // 17. سجل المكافآت والنجوم
    this.data.rewards = [
      {
        id: 1,
        child_id: 1,
        badge_name: 'بطل التركيز البصري 🌟',
        badge_icon: 'fa-star',
        points: 50,
        reason: 'إكمال نشاط فرقعة الفقاعات ومطابقة بطاقتين بنجاح',
        awarded_at: '2026-11-03T10:30:00Z'
      },
      {
        id: 2,
        child_id: 1,
        badge_name: 'صديق الكلمات الطيبة 🗣️',
        badge_icon: 'fa-medal',
        points: 40,
        reason: 'استخدام بطاقة أريد ماء مرتين متتاليتين',
        awarded_at: '2026-11-04T12:00:00Z'
      },
      {
        id: 3,
        child_id: 2,
        badge_name: 'أميرة الألوان الذكية 🎨',
        badge_icon: 'fa-crown',
        points: 60,
        reason: 'مطابقة الأشكال الهندسية دون أي خطأ',
        awarded_at: '2026-11-04T11:00:00Z'
      }
    ];

    // 18. إعدادات تخصيص تجربة الطفل (الحساسية الحسية والواجهة)
    this.data.customizations = [
      {
        id: 1,
        child_id: 1,
        sensory_calm_mode: true,
        high_contrast: false,
        dark_mode: false,
        font_size: 18,
        audio_rate: 0.75,
        audio_pitch: 1.05,
        sound_effects: true,
        dyslexia_font: true,
        show_reading_ruler: false
      },
      {
        id: 2,
        child_id: 2,
        sensory_calm_mode: false,
        high_contrast: false,
        dark_mode: false,
        font_size: 20,
        audio_rate: 0.8,
        audio_pitch: 1.1,
        sound_effects: true,
        dyslexia_font: false,
        show_reading_ruler: false
      }
    ];

    // 19. مكتبة المعلم والموارد التعليمية
    this.data.resources = [
      {
        id: 1,
        title: 'دليل تطبيق نظام التواصل بتبادل الصور (PECS) خطوة بخطوة',
        category: 'aac',
        file_type: 'pdf',
        description: 'شرح المراحل الست لنظام PECS وتطبيقه العملي في الغرفة الصفية والمنزل.',
        added_by: 'أ. سارة الأحمد',
        tags: ['PECS', 'توحد', 'تواصل بديل']
      },
      {
        id: 2,
        title: 'جدول الروتين اليومي المصور القابل للطباعة',
        category: 'schedules',
        file_type: 'printable',
        description: 'بطاقات بصرية عالية الجودة لأنشطة الصباح، المدرسة، الوجبات، ووقت النوم.',
        added_by: 'أ. سارة الأحمد',
        tags: ['جدول بصري', 'روتين', 'استقلالية']
      },
      {
        id: 3,
        title: 'دليل التهيئة الحسية وتخفيف التوتر للأطفال ذوي الحساسية اللمسية والصوتية',
        category: 'sensory',
        file_type: 'guide',
        description: 'استراتيجيات تعديل البيئة الصفية والإضاءة والتحكم بالمثيرات.',
        added_by: 'د. عبد الله الشمري',
        tags: ['حواس', 'بيئة هادئة', 'تعديل بيئي']
      }
    ];

    // 20. تقارير ومتابعة التقدم
    this.data.reports = [
      {
        id: 1,
        child_id: 1,
        teacher_id: 1,
        report_type: 'progress_monthly',
        title: 'تقرير التقدم الشهري - أكتوبر 2026',
        period_start: '2026-10-01',
        period_end: '2026-10-31',
        content_json: {
          attendance_rate: '95%',
          achieved_goals: 1,
          in_progress_goals: 1,
          total_attempts: 42,
          success_rate: '78%',
          clinical_notes: 'تحسن ملحوظ في المبادأة بالتواصل البصري والتعبير عن الاحتياج الأساسي.'
        },
        generated_at: '2026-11-01T09:00:00Z'
      }
    ];

    console.log('Database seeded with all 20 required educational and clinical tables.');
  }
}

module.exports = new Database();
