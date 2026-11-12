import type { ApplicantNameParts } from '@/types/domain'

export type ApplicantNameRow = any

const readString = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

const firstAvailable = (row: any, keys: string[]) => {
  for (const key of keys) {
    const value = readString(row[key])
    if (value) return value
  }
  return ''
}

export function getApplicantNameParts(row: ApplicantNameRow): ApplicantNameParts {
  return {
    firstName: firstAvailable(row, ['firstName', 'first_name']),
    middleSurname: firstAvailable(row, ['middleSurname', 'middle_surname']),
    lastSurname: firstAvailable(row, ['lastSurname', 'last_surname']),
    suffix: firstAvailable(row, ['suffix', 'name_suffix']),
  }
}

export function hasStructuredApplicantName(parts: Partial<ApplicantNameParts>) {
  return Boolean(parts.firstName || parts.middleSurname || parts.lastSurname || parts.suffix)
}

export function formatApplicantName(row: ApplicantNameRow, fallback = 'Unnamed Applicant') {
  const parts = getApplicantNameParts(row)
  const structuredName = [parts.firstName, parts.middleSurname, parts.lastSurname, parts.suffix].filter(Boolean).join(' ')
  if (structuredName) return structuredName

  const legacyName = readString(row.full_name) || readString(row.name)
  return legacyName || fallback
}
