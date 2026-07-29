import {
  LayoutDashboard, Users, UserCog, GraduationCap, BookOpen, School,
  ClipboardCheck, FileText, FileBarChart, Wallet, Receipt, Layers, Megaphone, BarChart3,  Settings, Building2, ShieldCheck, ShieldAlert, CalendarClock, CalendarDays, Briefcase, CalendarCheck, Package, FolderOpen
} from 'lucide-react'

// Menu ya platform (super admin)
export const PLATFORM_NAV = [
  { to: '/platform',           label: 'Dashibodi',   icon: LayoutDashboard, end: true },
  { to: '/platform/schools',   label: 'Shule',        icon: Building2 },
  { to: '/platform/users',     label: 'Watumiaji',    icon: Users },
  { to: '/platform/audit',     label: 'Kumbukumbu',   icon: ShieldCheck },
  { to: '/platform/settings',  label: 'Mipangilio',   icon: Settings }
]

// Menu ya shule — kila kipengele kina ruhusa inayohitajika
export const SCHOOL_NAV = [
  {
    section: 'Muhtasari',
    items: [
      { to: '/app', label: 'Dashibodi', icon: LayoutDashboard, permission: 'school.view', end: true }
    ]
  },
  {
    section: 'Wanafunzi',
    items: [
      { to: '/app/students',   label: 'Wanafunzi', icon: GraduationCap, permission: 'students.view' },
      { to: '/app/attendance', label: 'Mahudhurio', icon: ClipboardCheck, permission: 'attendance.view' },
      { to: '/app/discipline', label: 'Nidhamu', icon: ShieldAlert, permission: 'discipline.view' }
    ]
  },
  {
    section: 'Taaluma',
    items: [
      { to: '/app/classes',  label: 'Madarasa', icon: School,   permission: 'classes.view' },
      { to: '/app/subjects', label: 'Masomo',   icon: BookOpen, permission: 'subjects.view' },
      { to: '/app/timetable', label: 'Ratiba',  icon: CalendarClock, permission: 'timetable.view' },
      { to: '/app/exams',    label: 'Mitihani', icon: FileText, permission: 'exams.view' },
      { to: '/app/results',  label: 'Matokeo',  icon: BarChart3, permission: 'results.view' },
      { to: '/app/report-cards', label: 'Report Card', icon: FileText, permission: 'reports.view' }
    ]
  },
  {
    section: 'Wafanyakazi',
    items: [
      { to: '/app/teachers', label: 'Walimu', icon: Users, permission: 'teachers.view' },
      { to: '/app/staff', label: 'Wafanyakazi', icon: Briefcase, permission: 'hr.view' },
      { to: '/app/leave', label: 'Likizo', icon: CalendarCheck, permission: 'leave.request' },
      { to: '/app/users', label: 'Watumiaji', icon: UserCog, permission: 'users.create' }
    ]
  },
  {
    section: 'Fedha',
    items: [
      { to: '/app/fees', label: 'Ada', icon: Wallet, permission: 'fees.view' },
      { to: '/app/fee-structures', label: 'Muundo wa Ada', icon: Layers, permission: 'fees.manage' },
      { to: '/app/expenses', label: 'Matumizi', icon: Receipt, permission: 'expenses.view' }
    ]
  },
  {
    section: 'Ripoti',
    items: [
      { to: '/app/reports', label: 'Ripoti', icon: FileBarChart, permission: 'reports.view' }
    ]
  },
  {
    section: 'Uendeshaji',
    items: [
      { to: '/app/inventory', label: 'Vifaa', icon: Package, permission: 'inventory.view' },
      { to: '/app/documents', label: 'Nyaraka', icon: FolderOpen, permission: 'documents.view' }
    ]
  },
  {
    section: 'Mawasiliano',
    items: [
      { to: '/app/calendar', label: 'Kalenda', icon: CalendarDays, permission: 'calendar.view' },
      { to: '/app/announcements', label: 'Matangazo', icon: Megaphone, permission: 'announcements.view' }
    ]
  },
  {
    section: 'Mipangilio',
    items: [
      { to: '/app/settings', label: 'Mipangilio', icon: Settings, permission: 'settings.manage' }
    ]
  }
]

// Menu ya mzazi/mwanafunzi
export const FAMILY_NAV = [
  {
    section: 'Muhtasari',
    items: [
      { to: '/portal', label: 'Dashibodi', icon: LayoutDashboard, end: true }
    ]
  },
  {
    section: 'Taarifa',
    items: [
      { to: '/portal/attendance',    label: 'Mahudhurio', icon: ClipboardCheck },
      { to: '/portal/results',       label: 'Matokeo',    icon: BarChart3 },
      { to: '/portal/fees',          label: 'Ada',        icon: Wallet },
      { to: '/portal/announcements', label: 'Matangazo',  icon: Megaphone }
    ]
  }
]
