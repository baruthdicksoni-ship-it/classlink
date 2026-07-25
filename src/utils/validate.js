// ------------------------------------------------------------
// Uthibitishaji rahisi wa fomu
// ------------------------------------------------------------

export function required(value, field = 'Sehemu hii') {
  if (value === null || value === undefined || String(value).trim() === '') {
    return `${field} inahitajika`
  }
  return null
}

export function validEmail(value) {
  if (!value) return null
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : 'Barua pepe si sahihi'
}

// Namba za Tanzania: 0712345678 au +255712345678
export function validPhone(value) {
  if (!value) return null
  const clean = String(value).replace(/[\s-]/g, '')
  return /^(\+?255|0)[67]\d{8}$/.test(clean) ? null : 'Namba ya simu si sahihi'
}

export function normalizePhone(value) {
  if (!value) return null
  const clean = String(value).replace(/[\s-]/g, '')
  if (clean.startsWith('0')) return '+255' + clean.slice(1)
  if (clean.startsWith('255')) return '+' + clean
  return clean
}

export function minLength(value, n, field = 'Sehemu hii') {
  if (!value || String(value).length < n) return `${field} lazima iwe na angalau herufi ${n}`
  return null
}

export function runValidation(rules) {
  const errors = {}
  for (const [field, checks] of Object.entries(rules)) {
    for (const check of checks) {
      const err = check()
      if (err) { errors[field] = err; break }
    }
  }
  return { errors, isValid: Object.keys(errors).length === 0 }
}
