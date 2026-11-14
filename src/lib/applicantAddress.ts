import { BARANGAYS } from '../constants/options'

const key = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ')
export const isLipaCity = (city: string) => ['lipa', 'lipa city', 'city of lipa'].includes(key(city))
/** Do not infer a municipality from a barangay name shared by many cities. */
export function cityFromAddress(address: string) {
  const explicit = address.split(/[,;\n]/).map(part => part.trim()).findLast(part => /^(?:city of [\p{L} .'-]+|[\p{L} .'-]+ city)$/iu.test(part))
  if (explicit) return isLipaCity(explicit) || /\blipa\s+city$/i.test(explicit) ? 'Lipa City' : explicit
  return /\b(?:lipa\s+city|city\s+of\s+lipa)\b/i.test(address) ? 'Lipa City' : ''
}
const cityKey = (city: string) => key(city).replace(/^city of\s+|\s+city$/g, '')
export const officialBarangay = (value: string) => BARANGAYS.find(name => key(name) === key(value))
export function barangayError(city: string, value: string) {
  if (!isLipaCity(city) || !value.trim()) return ''
  return officialBarangay(value) ? '' : 'Choose an official Lipa City barangay from the list.'
}
/** A city selector is a form helper; persist it in the existing complete-address field. */
export function addressWithCity(address: string, city: string) {
  if (addressCityError(address, city)) return address
  if (!city.trim() || key(address).includes(key(city)) || (cityFromAddress(address) && cityKey(cityFromAddress(address)) === cityKey(city))) return address
  return [address.trim(), city.trim()].filter(Boolean).join(', ')
}
export function addressCityError(address: string, city: string) {
  const recorded = cityFromAddress(address)
  return city.trim() && recorded && cityKey(recorded) !== cityKey(city)
    ? 'The complete address and selected city differ. Review the city or municipality before saving.' : ''
}
/** Search labels only: choosing a suggestion is explicit; saved values are not converted. */
export const barangaySearchLabels: Record<string, string> = {
  'Santo Niño': 'Santo Nino', Marauoy: 'Marawoy', Inosloban: 'Inosluban', Sapac: 'San Isidro', 'Barangay 12': 'Fernando Air Base',
}
