import { Input, Select } from '../ui/Form'
import { BARANGAYS } from '@/constants/options'
import { isLipaCity, officialBarangay } from '@/lib/applicantAddress'

export function BarangayField({ city, value, savedValue = '', required = false, onChange }: {
  city: string; value: string; savedValue?: string; required?: boolean; onChange: (value: string) => void
}) {
  const historical = !!savedValue && !officialBarangay(savedValue)
  if (!isLipaCity(city)) return <Input label="Barangay" value={value} required={required} onChange={event => onChange(event.target.value)}
    placeholder="Enter barangay for the selected city" hint="Other municipalities are not restricted to the Lipa City list." />
  return <Select key={city} label="Barangay" value={officialBarangay(value) || ''} required={required} options={BARANGAYS} onChange={event => onChange(event.target.value)}
    placeholder="Select barangay" hint={historical && value === savedValue ? 'Choose an official barangay before saving. The existing record is unchanged until you save.' : 'Choose from the official Lipa City list.'} />
}

export function CityMunicipalityField({ value, onChange, required = false }: { value: string; onChange: (city: string) => void; required?: boolean }) {
  // Retain an existing outside-city address without allowing arbitrary new options.
  const current = value.trim() && !isLipaCity(value) ? value : 'Lipa City'
  const options = current === 'Lipa City' ? ['Lipa City'] : ['Lipa City', current]
  return <Select label="City / Municipality" value={current} onChange={event => onChange(event.target.value)} required={required}
    options={options} />
}
