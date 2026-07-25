// ============================================================
// ROLES & RUHUSA
// Kila ruhusa inaandikwa hapa mara moja tu.
// ============================================================

export const ROLES = {
  SUPER_ADMIN:  'super_admin',
  SCHOOL_ADMIN: 'school_admin',
  TEACHER:      'teacher',
  PARENT:       'parent',
  STUDENT:      'student'
}

export const ROLE_LABELS = {
  super_admin:  'Msimamizi Mkuu',
  school_admin: 'Msimamizi wa Shule',
  teacher:      'Mwalimu',
  parent:       'Mzazi',
  student:      'Mwanafunzi'
}

// Ruhusa: <kitu>.<kitendo>
export const PERMISSIONS = {
  super_admin: ['*'],

  school_admin: [
    'school.view', 'school.edit',
    'students.view', 'students.create', 'students.edit', 'students.delete',
    'teachers.view', 'teachers.create', 'teachers.edit', 'teachers.delete',
    'classes.view', 'classes.manage',
    'subjects.view', 'subjects.manage',
    'attendance.view', 'attendance.record', 'attendance.edit',
    'exams.view', 'exams.manage', 'exams.publish',
    'results.view', 'results.enter', 'results.edit',
    'fees.view', 'fees.manage', 'fees.collect',
    'announcements.view', 'announcements.create',
    'reports.view',
    'settings.manage'
  ],

  teacher: [
    'school.view',
    'students.view',
    'classes.view',
    'subjects.view',
    'attendance.view', 'attendance.record',
    'exams.view', 'exams.manage',
    'results.view', 'results.enter',
    'announcements.view', 'announcements.create',
    'reports.view'
  ],

  parent: [
    'school.view',
    'students.view.own',
    'attendance.view.own',
    'results.view.own',
    'fees.view.own',
    'announcements.view'
  ],

  student: [
    'school.view',
    'attendance.view.own',
    'results.view.own',
    'fees.view.own',
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
export const isStaffRole = (role) => role === ROLES.SCHOOL_ADMIN || role === ROLES.TEACHER
export const isFamilyRole = (role) => role === ROLES.PARENT || role === ROLES.STUDENT
