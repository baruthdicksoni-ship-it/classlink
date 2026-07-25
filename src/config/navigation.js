import {
  LayoutDashboard, Users, GraduationCap, BookOpen, School,
  ClipboardCheck, FileText, Wallet, Megaphone, BarChart3,
  Settings, Building2, ShieldCheck
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
      { to: '/app/attendance', label: 'Mahudhurio', icon: ClipboardCheck, permission: 'attendance.view' }
    ]
  },
  {
    section: 'Taaluma',
    items: [
      { to: '/app/classes',  label: 'Madarasa', icon: School,   permission: 'classes.view' },
      { to: '/app/subjects', label: 'Masomo',   icon: BookOpen, permission: 'subjects.view' },
      { to: '/app/exams',    label: 'Mitihani', icon: FileText, permission: 'exams.view' },
      { to: '/app/results',  label: 'Matokeo',  icon: BarChart3, permission: 'results.view' }
    ]
  },
  {
    section: 'Wafanyakazi',
    items: [
      { to: '/app/teachers', label: 'Walimu', icon: Users, permission: 'teachers.view' }
    ]
  },
  {
    section: 'Fedha',
    items: [
      { to: '/app/fees', label: 'Ada', icon: Wallet, permission: 'fees.view' }
    ]
  },
  {
    section: 'Mawasiliano',
    items: [
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
