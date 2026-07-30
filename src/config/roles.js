// ============================================================
// ROLES & RUHUSA
// Kila ruhusa inaandikwa hapa mara moja tu.
// ============================================================

export const ROLES = {
  SUPER_ADMIN:  'super_admin',
  SCHOOL_OWNER: 'school_owner',
  SCHOOL_ADMIN: 'school_admin',
  ACADEMIC_MASTER: 'academic_master',
  TEACHER:      'teacher',
  ACCOUNTANT:   'accountant',
  STAFF:        'staff',
  PARENT:       'parent',
  STUDENT:      'student'
}

export const ROLE_LABELS = {
  super_admin:  'Msimamizi Mkuu',
  school_owner: 'Mmiliki wa Shule',
  school_admin: 'Mkuu wa Shule',
  academic_master: 'Mkuu wa Taaluma',
  teacher:      'Mwalimu',
  accountant:   'Mhasibu',
  staff:        'Mfanyakazi',
  parent:       'Mzazi',
  student:      'Mwanafunzi'
}

// Ruhusa: <kitu>.<kitendo>
export const PERMISSIONS = {
  super_admin: ['*'],

  // Mmiliki: kila kitu cha shule yake, pamoja na fedha na kutengeneza wakuu
  school_owner: [
    // === KUONA: taarifa zote za shule ===
    'school.view', 'school.edit',
    'students.view',
    'teachers.view',
    'classes.view',
    'subjects.view',
    'attendance.view',
    'exams.view',
    'results.view',
    'discipline.view',
    'timetable.view',
    'calendar.view',
    'inventory.view',
    'documents.view',
    'leave.view',

    // === FEDHA: kuona tu (mhasibu ndiye anashughulikia) ===
    'fees.view',
    'expenses.view',

    // === KUSIMAMIA: mambo ya mmiliki-mfanyabiashara ===
    'users.create', 'users.manage',            // kuajiri/kuondoa mkuu na wengine
    'settings.manage',                         // logo, taarifa, mwaka wa masomo
    'reports.view',                            // ripoti zote
    'subscription.manage',                     // usajili wa ClassLink
    'audit.view',                              // kufuatilia shughuli
    'documents.manage',                        // nyaraka rasmi za shule
    'announcements.view', 'announcements.create',

    // === DHARURA: kufuta/kubadilisha taarifa muhimu (si za kila siku) ===
    'students.delete',                         // kufuta mwanafunzi (dharura)
    'teachers.delete'                          // kuondoa mwalimu (dharura)
  ],

  // Mkuu: taaluma na utawala, LAKINI SI fedha, na hawezi kutengeneza wakuu wengine
  school_admin: [
    'school.view',
    'users.create',                             // anaweza kutengeneza mwalimu/mzazi/mwanafunzi
    'students.view', 'students.create', 'students.edit', 'students.delete',
    'teachers.view', 'teachers.create', 'teachers.edit',
    'classes.view', 'classes.manage',
    'subjects.view', 'subjects.manage',
    'attendance.view', 'attendance.record', 'attendance.edit',
    'exams.view', 'exams.manage', 'exams.publish',
    'results.view', 'results.enter', 'results.edit',
    'fees.view',                                // AONA ada, lakini SI kutengeneza/kupokea
    'discipline.view', 'discipline.report', 'discipline.manage',
    'timetable.view', 'timetable.manage',
    'calendar.view', 'calendar.manage',
    'hr.view', 'hr.manage',
    'inventory.view', 'inventory.manage',
    'documents.view', 'documents.manage',
    'leave.view', 'leave.request', 'leave.manage',
    'announcements.view', 'announcements.create',
    'reports.view',
    'settings.manage'
  ],

  academic_master: [
    'school.view',
    'students.view',
    'classes.view', 'classes.manage',
    'subjects.view', 'subjects.manage',
    'attendance.view', 'attendance.record',
    'exams.view', 'exams.manage', 'exams.approve',
    'results.view', 'results.enter', 'results.approve',
    'discipline.view', 'discipline.report', 'discipline.manage',
    'timetable.view', 'timetable.manage',
    'calendar.view', 'calendar.manage',
    'inventory.view',
    'documents.view',
    'leave.request',
    'announcements.view', 'announcements.create',
    'reports.view'
  ],

  teacher: [
    'school.view',
    'students.view',
    'classes.view',
    'subjects.view',
    'attendance.view', 'attendance.record',
    'exams.view', 'exams.manage',
    'results.view', 'results.enter',
    'discipline.view', 'discipline.report',
    'timetable.view',
    'calendar.view',
    'inventory.view',
    'documents.view',
    'leave.request',
    'announcements.view', 'announcements.create',
    'reports.view'
  ],

  parent: [
    'school.view',
    'students.view.own',
    'attendance.view.own',
    'results.view.own',
    'fees.view.own',
    'calendar.view',
    'documents.view',
    'announcements.view'
  ],

  student: [
    'school.view',
    'attendance.view.own',
    'results.view.own',
    'fees.view.own',
    'calendar.view',
    'documents.view',
    'announcements.view'
  ],

  // Mfanyakazi asiye mwalimu (mlinzi, mpishi, dereva, n.k.)
  staff: [
    'school.view',
    'calendar.view',
    'documents.view',
    'leave.request',
    'announcements.view'
  ],

  accountant: [
    'school.view',
    'students.view',                              // aone majina ya wanafunzi (kwa ankara)
    'fees.view', 'fees.manage', 'fees.collect',   // FEDHA — kamili
    'expenses.view', 'expenses.manage',           // MATUMIZI
    'reports.view',                               // ripoti za fedha
    'calendar.view',
    'documents.view',
    'leave.request',
    'announcements.view'
  ]
}

export function can(role, permission) {
  if (!role) return false
  const list = PERMISSIONS[role] || []
  if (list.includes('*')) return true
  return list.includes(permission)
}

export function canAny(role, permissions = []) {
  return permissions.some((p) => can(role, p))
}

export const isPlatformRole = (role) => role === ROLES.SUPER_ADMIN
export const isManagerRole = (role) => role === ROLES.SCHOOL_OWNER || role === ROLES.SCHOOL_ADMIN
export const isStaffRole = (role) =>
  role === ROLES.SCHOOL_OWNER || role === ROLES.SCHOOL_ADMIN || role === ROLES.TEACHER
export const isFamilyRole = (role) => role === ROLES.PARENT || role === ROLES.STUDENT

// Nani anaweza kutengeneza role gani (lazima ilingane na Edge Function)
export const CREATABLE_ROLES = {
  super_admin:  ['super_admin', 'school_owner', 'school_admin', 'academic_master', 'teacher', 'accountant', 'staff', 'parent', 'student'],
  school_owner: ['school_admin', 'academic_master', 'teacher', 'accountant', 'staff', 'parent', 'student'],
  school_admin: ['academic_master', 'teacher', 'accountant', 'staff', 'parent', 'student']
}

export function rolesCreatableBy(role) {
  return CREATABLE_ROLES[role] || []
}
