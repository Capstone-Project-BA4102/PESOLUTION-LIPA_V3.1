export interface OfficeService { id: string; title: string; description: string; imageUrl?: string }
export interface Announcement { id: string; title: string; body: string; publishedAt: string; url: string }
export interface TrainingCourse { id: string; skill: string; title: string; provider: string; url: string }
export interface Testimonial { id: string; name: string; role: string; quote: string; imageUrl?: string; consentConfirmed?: boolean }
export interface SiteContent {
  title: string; tagline: string; description: string; address: string; telephone: string; email: string;
  officeHours: string; facebookLabel: string; facebookUrl: string; sourceLabel: string; sourceUrl: string; heroImage: string;
  services: OfficeService[]; announcements: Announcement[]; trainingCatalog: TrainingCourse[]; testimonials?: Testimonial[];
}
export interface SiteRecord { id: string; content: SiteContent; published: boolean; updated_at: string }
export interface PublicSite { content: SiteContent | null; updatedAt: string | null; jobs: number; vacancies: number; approvedTestimonials?: Testimonial[] }
