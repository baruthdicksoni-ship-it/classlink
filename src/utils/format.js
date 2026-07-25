// ------------------------------------------------------------
// Kubadilisha data kuwa maandishi ya Kiswahili
// ------------------------------------------------------------

const MIEZI = [
  'Januari','Februari','Machi','Aprili','Mei','Juni',
  'Julai','Agosti','Septemba','Oktoba','Novemba','Desemba'
]

export function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (isNaN(d)) return '—'
  return `${d.getDate()} ${MIEZI[d.getMonth()]} ${d.getFullYear()}`
}

export function formatDateShort(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (isNaN(d)) return '—'
  return d.toISOString().slice(0, 10)
}

export function formatMoney(amount) {
  const n = Number(amount) || 0
  return 'TZS ' + n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

export function formatNumber(n) {
  return (Number(n) || 0).toLocaleString('en-US')
}

export function fullName(student) {
  if (!student) return '—'
  return [student.first_name, student.middle_name, student.last_name].filter(Boolean).join(' ')
}

export function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

export const GENDER_LABELS = { male: 'Mume', female: 'Mke' }

export const STUDENT_STATUS = {
  active:      { label: 'Anasoma',      tone: 'green' },
  graduated:   { label: 'Amehitimu',    tone: 'blue' },
  transferred: { label: 'Amehama',      tone: 'slate' },
  dropped:     { label: 'Ameacha',      tone: 'red' },
  suspended:   { label: 'Amesimamishwa', tone: 'amber' }
}

export const ATTENDANCE_STATUS = {
  present: { label: 'Yupo',      tone: 'green' },
  absent:  { label: 'Hayupo',    tone: 'red' },
  late:    { label: 'Amechelewa', tone: 'amber' },
  excused: { label: 'Ruhusa',    tone: 'blue' }
}

export const PAYMENT_METHODS = [
  { value: 'cash',      label: 'Taslimu' },
  { value: 'mpesa',     label: 'M-Pesa' },
  { value: 'tigopesa',  label: 'Tigo Pesa' },
  { value: 'airtel',    label: 'Airtel Money' },
  { value: 'halopesa',  label: 'HaloPesa' },
  { value: 'bank',      label: 'Benki' },
  { value: 'cheque',    label: 'Hundi' }
]

export const INVOICE_STATUS = {
  unpaid:  { label: 'Haijalipwa', tone: 'red' },
  partial: { label: 'Sehemu',     tone: 'amber' },
  paid:    { label: 'Imelipwa',   tone: 'green' },
  waived:  { label: 'Imesamehewa', tone: 'slate' }
}
