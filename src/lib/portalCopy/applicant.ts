import { registerFil } from './core'

/** applicant screen copy. */
registerFil({
  // Loading states
  'Loading dashboard...': 'Ikinakarga ang Dashboard...',
  'Loading profile...': 'Ikinakarga ang profile...',
  'Loading application status...': 'Ikinakarga ang katayuan ng aplikasyon...',
  'Loading matched jobs...': 'Ikinakarga ang mga tugmang trabaho...',
  'Loading jobs...': 'Ikinakarga ang mga trabaho...',

  // Statuses shown to applicants (badges, timeline, raw labels)
  Active: 'Aktibo',
  Inactive: 'Hindi Aktibo',
  New: 'Bago',
  Pending: 'Nakabinhaw',
  Matched: 'Tugma',
  'For Referral': 'Para sa Referal',
  Shortlisted: 'Nasa Shortlist',
  Hired: 'Na-hire',
  Referred: 'Na-refer',
  'Referral Requested': 'Hinihiling ang Referal',
  'Referral Confirmed': 'Nakumpirma ang Referal',
  Declined: 'Tinanggihan',

  // Dashboard
  "Welcome, {name}. Here's a quick overview of your application.":
    'Kumusta, {name}. Narito ang mabilisang pangkalahatan ng iyong aplikasyon.',
  'Complete Your Profile': 'Kumpletuhin ang Iyong Profile',
  "You haven't set up your applicant profile yet. Complete your profile and upload a resume to start matching with jobs.":
    'Hindi pa kumpleto ang iyong profile bilang aplikante. Kumpletuhin ang profile at mag-upload ng resume upang masimulan kang itugma sa mga trabaho.',
  'Set Up Profile': 'I-setup ang Profile',
  'Current Application': 'Kasalukuyang Aplikasyon',
  'Last updated': 'Huling update',
  'Recommended Jobs': 'Mga Inirerekumendang Trabaho',
  '{count} Opportunities': '{count} na oportunidad',
  'Based on your skills': 'Batay sa iyong mga kasanayan',
  'Latest Resume': 'Pinakabagong Resume',
  'Version {version}': 'Bersyon {version}',
  'Submitted on': 'Isinumite noong',
  'Recent Updates': 'Mga Kamakailang Update',
  'No recent updates.': 'Walang kamakailang update.',
  'Quick Actions': 'Mabilisang mga Aksyon',
  'Check Application Status': 'Tingnan ang Katayuan ng Aplikasyon',
  'View My Profile': 'Tingnan ang Aking Profile',
  'View Matched Opportunities': 'Tingnan ang Mga Tugmang Oportunidad',

  // Profile
  'Your registered information with PESO Lipa.': 'Ang iyong nakarehistrong impormasyon sa PESO Lipa.',
  'Profile Not Set Up': 'Hindi pa Nai-setup ang Profile',
  'No applicant record is linked to your account. Please contact PESO Lipa City.':
    'Walang rekord ng aplikante ang nakatali sa iyong account. Mangyaring makipag-ugnayan sa PESO Lipa City.',
  'To update your information, please visit': 'Upang i-update ang iyong impormasyon, pakibisita sa',
  'in person.': 'nang personal.',
  'Personal Information': 'Personal na Impormasyon',
  'Full Name': 'Buong Pangalan',
  'Applicant ID': 'ID ng Aplikante',
  'First Name': 'Unang Pangalan',
  'Middle Name': 'Gitnang Pangalan',
  Surname: 'Apelyido',
  'Date of Birth': 'Petsa ng Kapanganakan',
  'years old': 'taong gulang',
  Gender: 'Kasarian',
  'Civil Status': 'Katayuang Sibil',
  Nationality: 'Nasyonalidad',
  'Contact Number': 'Numero ng Contact',
  'Date Registered': 'Petsa ng Pagpaparehistro',
  Education: 'Edukasyon',
  'Highest Attainment': 'Pinakamataas na Naabot',
  Course: 'Kurso',
  School: 'Eskwelahan',
  Skills: 'Mga Kasanayan',
  'No hard skills extracted yet.': 'Wala pang nakuhang hard skills.',
  'No soft skills extracted yet.': 'Wala pang nakuhang soft skills.',
  'Work Experience': 'Karanasan sa Trabaho',
  'No work experience recorded.': 'Walang naitalang karanasan sa trabaho.',

  // Application status
  'Track the status of your applications and view your records.':
    'Subaybayan ang katayuan ng iyong mga aplikasyon at tingnan ang iyong mga rekord.',
  'Status Tabs': 'Mga Tab ng Katayuan',
  'Previous Applications': 'Mga Nakaraang Aplikasyon',
  'Application History': 'Kasaysayan ng Aplikasyon',
  'No status updates recorded yet.': 'Walang naitalang update sa katayuan.',
  'Target Role': 'Target na Posisyon',
  Applied: 'Nag-apply',
  'PESO is currently looking for the best matched jobs for you.':
    'Hinahanap pa ng PESO ang mga pinaka-tugmang trabaho para sa iyo.',
  'Referral Ready': 'Handa na ang Referal',
  'Referral No.': 'Bilang ng Referal',
  Issued: 'Inilabas noong',
  'Please download or print your referral slip and present it to the employer during your interview.':
    'Paki-download o i-print ang iyong referral slip at ipakita ito sa kumpanya habang nasa interview ka.',
  'View / Download Slip': 'Tingnan / I-download ang Slip',
  'No previous applications found': 'Walang nahanap na nakaraang aplikasyon',
  'Your application history will appear here.': 'Lalabas dito ang kasaysayan ng iyong mga aplikasyon.',
  Application: 'Aplikasyon',

  // Matched jobs + referral requests
  'Jobs PESO matched with your profile. Request a referral slip to pursue one.':
    'Mga trabahong itugma ng PESO sa iyong profile. Humiling ng referral slip para makapag-apply.',
  'Referral requested for {title}. PESO will review your request.':
    'Hiniling ang referal para sa {title}. Susuriin ito ng PESO.',
  'Could not request referral. Please try again.': 'Hindi mahiling ang referal. Pakisubukang muli.',
  'The referral request could not be saved.': 'Hindi matipon ang kahilingan sa referal.',
  'This job already has a confirmed referral.': 'May nakumpirmang referal na para sa trabahong ito.',
  // 20261026_first_login_password_gate.sql rejects the write until the printed password is replaced
  'Please set your own password first. Open Profile, choose a private password, then request this referral again.':
    'Itakda muna ang sarili ninyong password. Buksan ang Profile, pumili ng pribadong password, pagkatapos muling hilingin ang referal na ito.',
  'Requesting...': 'Naghihiling...',
  'Request Again': 'Humiling Muli',
  'Request Referral': 'Humiling ng Referal',
  'Yes, Request Referral': 'Oo, Humiling ng Referal',
  'Confirm Referral Request': 'Kumpirmahin ang Kahilingan sa Referal',
  'Awaiting PESO review': 'Naghihintay ng pagsusuri ng PESO',
  'Once a PESO admin reviews your profile, your matched jobs will be sent here so you can request a referral slip.':
    'Kapag nasuri na ng PESO admin ang iyong profile, papadalhin dito ang mga tugmang trabaho para makahingi ka ng referral slip.',
  'PESO matched you with {count} job opportunity.': 'Itugma ka ng PESO sa {count} okasyon sa trabaho.',
  'PESO matched you with {count} job opportunities.': 'Itugma ka ng PESO sa {count} na okasyon sa trabaho.',
  'Use “Request Referral” on a job card. You can have up to {max} pending requests at a time.':
    'Gamitin ang “Humiling ng Referal” sa kard ng trabaho. Maaari kang magkaroon ng hanggang {max} na nakabinhaw na kahilingan sa isang pagkakataon.',
  'You have {count} pending referral requests (limit {limit}). Wait for PESO to act on them before requesting more.':
    'May {count} kang nakabinhaw na kahilingan sa referal (limitasyon {limit}). Hintayin na kumilos ang PESO sa mga ito bago humingi pa.',
  Match: 'Tugma',
  'Job Match Details': 'Detalye ng Tugmang Trabaho',
  'Request a referral slip for': 'Humiling ng referral slip para sa',
  at: 'sa',
  'PESO will review your request. Once approved, your official referral slip will be issued here.':
    'Susuriin ng PESO ang iyong kahilingan. Kapag aprubado na, may labas na opisyal na referral slip dito.',

  // Job browser (shared with the public site)
  ' / day': ' / araw',
  Vacancies: 'Bakante',
  'View Details': 'Tingnan ang Detalye',
  'Search job title, company, or skill…': 'Hanapin ang titulo ng trabaho, kumpanya, o kasanayan…',
  'Search jobs': 'Maghanap ng mga trabaho',
  'All Types': 'Lahat ng Uri',
  'All Setups': 'Lahat ng Setup',
  'All Industries': 'Lahat ng Industriya',
  'job found': 'trabahong nahanap',
  'jobs found': 'na trabahong nahanap',
  'Skill requirement legend': 'Paliwanag sa mga kinakailangang kasanayan',
  'No jobs found': 'Walang nahanap na trabaho',
  'Try a different keyword or clear the filters.': 'Subukan ang ibang keyword o alisin ang mga salaan.',
  'How to apply': 'Paano mag-apply',
  'Visit the PESO Lipa office at City Hall with your resume and a valid ID. Our staff will assist you with the referral.':
    'Bumisita sa opisina ng PESO Lipa sa City Hall na may dala ng resume at valid ID. Tutulungan ka ng aming staff sa proseso ng referal.',

  // Announcement pop-up on login
  'PESO Announcements': 'Mga Anunsyo ng PESO',
  'Next Announcement': 'Susunod na Anunsyo',
  'Dismiss All': 'Isara lahat',
  'Got it': 'Salamat, nakuha ko',
  'Official announcement': 'Opisyal na anunsyo',
  'Announcement {current} of {total}': 'Anunsyo {current} sa {total}',

  // Change password (replacing the password printed on the walk-in account receipt)
  'Change Password': 'Palitan ang Password',
  'Current Password': 'Kasalukuyang Password',
  'Confirm New Password': 'Kumpirmahin ang Bagong Password',
  'The password you sign in with now.': 'Ang password na ginagamit ninyo sa pag-sign in ngayon.',
  'At least 8 characters.': 'Hindi bababa sa 8 character.',
  'Use at least 8 characters.': 'Gumamit ng hindi bababa sa 8 character.',
  'The two new passwords do not match.': 'Hindi magkatugma ang dalawang bagong password.',
  'You are still using the initial password printed on your account receipt. Replace it with a private password only you know.':
    'Ginagamit pa ninyo ang initial password na naka-print sa inyong account receipt. Palitan ito ng pribadong password na kayo lamang ang nakakaalam.',
  'Last changed {date}.': 'Huling pagbabago: {date}.',
  'You can change your password up to {limit} times per week. Used this week: {used} of {limit}.':
    'Maaari ninyong palitan ang password hanggang {limit} beses kada linggo. Naggamit ngayong linggo: {used} sa {limit}.',
  'You can change your password up to 3 times per week.':
    'Maaari ninyong palitan ang password hanggang 3 beses kada linggo.',
  'You have used all 3 password changes for this week. Please try again in a few days.':
    'Nagamit na ninyo ang lahat ng 3 pagpapalit ng password ngayong linggo. Pakisubukang muli sa mga susunod na araw.',
  'PESO staff cannot see your new password. Your login email stays the same.':
    'Hindi nakikita ng PESO staff ang bagong password ninyo. Ang login email ninyo ay nananatili.',
  'Updating your password...': 'Iina-update ang password ninyo...',
  'Updating...': 'Ina-update...',
  'Password changed. Use it the next time you sign in.': 'Napalitan ang password. Gamitin ito sa susunod na pag-sign in.',
  'Your password could not be changed.': 'Hindi mapalitan ang password ninyo.',
  'Your current password is incorrect.': 'Mali ang kasalukuyang password ninyo.',
  'Your new password already works, but the portal could not record the change. Please change it once more from Profile to finish; this attempt was not counted against your weekly limit.':
    'Gagana na ang bagong password ninyo, ngunit hindi ma-record ng portal ang pagbabago. Mangyaring palitan muli ito sa Profile upang makumpleto; hindi ito ibibilang sa 3 pagpapalit ninyo ngayong linggo.',
  'Your session expired. Please sign in again.': 'Nag-expire ang inyong session. Mangyaring mag-sign in muli.',
  'Choose a new password that differs from the one you use now.':
    'Pumili ng bagong password na iba sa ginagamit ninyo ngayon.',
  'Your password could not be updated. Please try again.': 'Hindi ma-update ang password ninyo. Pakisubukang muli.',
  'Please sign in to continue.': 'Mangyaring mag-sign in upang magpatuloy.',
  'Change your password?': 'Palitan ang inyong password?',
  'Yes, change it': 'Oo, palitan ito',
  'Your initial password will stop working right away. Sign in next time with the new password you just chose.':
    'Agad-tuloy na hindi na gagana ang initial password ninyo. Mag-sign in sa susunod gamit ang bagong password na kinalaan ninyo.',
  // First-sign-in gate: the printed receipt password must be replaced before the dashboard opens
  'Set your own password first': 'Magtakda muna ng sarili ninyong password',
  'You are still using the initial password printed on your account receipt. Anyone holding that paper can open your application, so choose a private password now. This page stays locked until you save it.':
    'Ginagamit pa ninyo ang initial password na naka-print sa inyong account receipt. Maaaring buksan ng sinumang may hawak ng papel na iyon ang inyong aplikasyon, kaya pumili na lang kayo ng pribadong password ngayon. Naka-lock ang pahinang ito hanggang sa ninyo ito ma-save.',
  'Save my new password': 'I-save ang bagong password ko',
  'Sign out instead': 'Mag-sign out na lang',
  'Signing out...': 'Nag-sign out...',
})
