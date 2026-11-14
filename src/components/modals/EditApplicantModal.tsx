import { BarangayField, CityMunicipalityField } from '@/components/shared/BarangayField';
import { cityFromAddress, addressWithCity, barangayError, addressCityError } from '@/lib/applicantAddress';
import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Form';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import type { Applicant } from '@/lib/api';
import { logActivity } from '@/lib/api';
import { usePT } from '@/lib/portalCopy';

export function EditApplicantModal({ applicant, onClose, onSaved }: { applicant: Applicant, onClose: () => void, onSaved: () => void }) {
  const pt = usePT();
  const [formData, setFormData] = useState({
    first_name: applicant.firstName || '',
    middle_surname: applicant.middleSurname || '',
    last_surname: applicant.lastSurname || '',
    suffix: applicant.suffix || '',
    full_name: applicant.name,
    gender: applicant.gender,
    civil_status: applicant.civilStatus,
    contact_number: applicant.contact,
    email_address: applicant.email,
    cityMunicipality: cityFromAddress(applicant.address) || 'Lipa City',
    barangay: applicant.barangay,
    address: applicant.address,
    education: applicant.education,
    course: applicant.course,
    school: applicant.school,
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const locationError = barangayError(formData.cityMunicipality, formData.barangay) || addressCityError(formData.address, formData.cityMunicipality);
    if (locationError) { toast.error(pt(locationError)); return; }
    setLoading(true);
    try {
      const { error } = await supabase
        .from('applicants')
        .update({
          first_name: formData.first_name,
          middle_surname: formData.middle_surname,
          last_surname: formData.last_surname,
          suffix: formData.suffix,
          gender: formData.gender,
          civil_status: formData.civil_status,
          contact_number: formData.contact_number,
          email_address: formData.email_address,
          barangay: formData.barangay,
          address: addressWithCity(formData.address, formData.cityMunicipality),
          education: formData.education,
          course: formData.course,
          school: formData.school,
        })
        .eq('id', applicant.id);

      if (error) throw error;
      await logActivity('applicant', 'Applicant profile updated', `${formData.first_name} ${formData.last_surname}`.trim() || applicant.name);
      toast.success(pt('Applicant profile updated!'));
      onSaved();
    } catch (err: any) {
      toast.error(err?.message || pt('Failed to update profile.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4">
      <Card className="w-full max-w-2xl p-6 flex flex-col max-h-[90vh]">
        <h2 className="text-xl font-bold text-slate-900 mb-4">{pt('Edit Profile Information')}</h2>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pr-2">
          <div className="grid grid-cols-2 gap-4">
            <Input label="First Name" value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} required />
            <Input label="Surname" value={formData.last_surname} onChange={e => setFormData({...formData, last_surname: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Middle Name" value={formData.middle_surname} onChange={e => setFormData({...formData, middle_surname: e.target.value})} />
            <Input label="Suffix" placeholder="Jr., Sr., III, etc." value={formData.suffix} onChange={e => setFormData({...formData, suffix: e.target.value})} />
          </div>
          <Input label="Full Name (auto-generated from name parts)" value={formData.full_name} readOnly disabled onChange={() => {}} />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Gender" options={["Male", "Female"]} value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value as 'Male' | 'Female'})} />
            <Select label="Civil Status" options={["Single", "Married", "Widowed", "Separated"]} value={formData.civil_status} onChange={e => setFormData({...formData, civil_status: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Contact Number" value={formData.contact_number} onChange={e => setFormData({...formData, contact_number: e.target.value})} />
            <Input label="Email Address" type="email" value={formData.email_address} onChange={e => setFormData({...formData, email_address: e.target.value})} />
          </div>
          <Input label="Address" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
          <CityMunicipalityField value={formData.cityMunicipality} onChange={value => setFormData({...formData, cityMunicipality: value})} />
          <BarangayField city={formData.cityMunicipality} savedValue={applicant.barangay} value={formData.barangay} onChange={value => setFormData({...formData, barangay: value})} />
          
          <h3 className="text-sm font-bold text-slate-700 pt-4 border-t border-slate-100">{pt('Educational Background')}</h3>
          <Select label="Highest Education" options={["High School", "College Level", "College Graduate", "Master's Degree"]} value={formData.education} onChange={e => setFormData({...formData, education: e.target.value})} />
          <Input label="Course" value={formData.course} onChange={e => setFormData({...formData, course: e.target.value})} />
          <Input label="School" value={formData.school} onChange={e => setFormData({...formData, school: e.target.value})} />
          
          <div className="flex justify-end gap-3 pt-6">
            <Button type="button" variant="neutral" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={loading}>{loading ? "Saving..." : "Save Changes"}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
