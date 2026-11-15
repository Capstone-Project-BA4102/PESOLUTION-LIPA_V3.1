import { BarangayField, CityMunicipalityField } from '@/components/shared/BarangayField';
import { cityFromAddress, addressWithCity, barangayError, addressCityError } from '@/lib/applicantAddress';
import { saveApplicantAvatar } from '@/lib/applicantFiles';
import { SelectedFilePreview } from '@/components/shared/SelectedFilePreview';
import { Avatar } from '@/components/ui/Display';
import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Form';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import type { Applicant } from '@/lib/api';
import { logActivity } from '@/lib/api';
import { usePT } from '@/lib/portalCopy';

export function EditApplicantModal({ applicant, onClose, onSaved, onAvatarSaved }: { applicant: Applicant, onClose: () => void, onSaved: () => void, onAvatarSaved?: () => void }) {
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
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarUrl, setAvatarUrl] = useState(applicant.avatarUrl || '');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const changeAvatar = async () => {
    if (!avatarFile || uploadingAvatar) return;
    setUploadingAvatar(true);
    try { setAvatarUrl(await saveApplicantAvatar(applicant.profileId, avatarFile)); setAvatarFile(null); onAvatarSaved?.(); toast.success(pt('Avatar updated.')); }
    catch (failure) { toast.error(failure instanceof Error ? failure.message : pt('Could not upload avatar.')); }
    finally { setUploadingAvatar(false); }
  };

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
    <Modal open onClose={onClose} title="Edit Profile Information" size="lg" dismissible={!loading && !uploadingAvatar}>
        <section className="mb-5 flex flex-wrap items-center gap-3 rounded-card border border-slate-200 p-3">
          <Avatar name={applicant.name} src={avatarUrl || undefined} />
          <div className="min-w-0 flex-1"><label className="block text-[14px] font-medium" htmlFor="edit-applicant-avatar">{pt('Change Avatar')}</label>
            <input id="edit-applicant-avatar" className="mt-1 block w-full text-[13px] text-slate-500" type="file" accept="image/jpeg,image/png,image/webp" disabled={loading || uploadingAvatar || !applicant.profileId} onChange={event => setAvatarFile(event.target.files?.[0] || null)} />
            <p className="mt-1 text-[12px] text-slate-500">{pt('JPG, PNG or WebP. Maximum 2 MB. Avatar changes are saved separately.')}</p>
            <SelectedFilePreview file={avatarFile} avatar /></div>
          <Button size="sm" variant="neutral" disabled={!avatarFile || loading || uploadingAvatar} onClick={() => void changeAvatar()}>{uploadingAvatar ? pt('Uploading…') : pt('Save Avatar')}</Button>
        </section>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pr-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="First Name" value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} required />
            <Input label="Surname" value={formData.last_surname} onChange={e => setFormData({...formData, last_surname: e.target.value})} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Middle Name" value={formData.middle_surname} onChange={e => setFormData({...formData, middle_surname: e.target.value})} />
            <Input label="Suffix" placeholder="Jr., Sr., III, etc." value={formData.suffix} onChange={e => setFormData({...formData, suffix: e.target.value})} />
          </div>
          <Input label="Full Name (auto-generated from name parts)" value={formData.full_name} readOnly disabled onChange={() => {}} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Gender" options={["Male", "Female"]} value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value as 'Male' | 'Female'})} />
            <Select label="Civil Status" options={["Single", "Married", "Widowed", "Separated"]} value={formData.civil_status} onChange={e => setFormData({...formData, civil_status: e.target.value})} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
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
            <Button type="button" variant="neutral" onClick={onClose} disabled={loading || uploadingAvatar}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={loading || uploadingAvatar}>{loading ? "Saving..." : "Save Changes"}</Button>
          </div>
        </form>
    </Modal>
  );
}
