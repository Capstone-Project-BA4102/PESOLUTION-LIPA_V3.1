import { useMemo, useState } from 'react'
import { CheckCircle2, FileText, GraduationCap, Lock, RotateCcw, Shuffle, Sparkles, XCircle } from 'lucide-react'
import { Select } from '@/components/ui/Form'
import { Button } from '@/components/ui/Button'
import { MatchRing, MatchSkillList, MatchWeightsLegend } from '@/components/matching/MatchVisuals'
import { EDUCATION_LEVELS } from '@/constants/options'
import { usePublicPreferences } from '@/lib/publicPreferences'
import { DEMO_HARD_SKILLS, DEMO_MATCHING_THRESHOLD, DEMO_SOFT_SKILLS, demoSeed, scoreDemoJob, shuffleDemoJobs, type DemoJob } from '@/lib/matchingDemo'

const chipClass = (active: boolean) => `rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors ${active
  ? 'border-brand-600 bg-brand-600 text-white shadow-sm'
  : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-700'}`

export function MatchingSimulator() {
  const { t } = usePublicPreferences()
  const [education, setEducation] = useState(demoSeed.education)
  const [hardSkills, setHardSkills] = useState<string[]>(demoSeed.hardSkills)
  const [softSkills, setSoftSkills] = useState<string[]>(demoSeed.softSkills)
  const [jobs, setJobs] = useState<DemoJob[]>(() => shuffleDemoJobs())

  const toggle = (list: string[], setList: (value: string[]) => void, skill: string) =>
    setList(list.includes(skill) ? list.filter(item => item !== skill) : [...list, skill])
  const reset = () => {
    setEducation(demoSeed.education)
    setHardSkills(demoSeed.hardSkills)
    setSoftSkills(demoSeed.softSkills)
  }
  const scores = useMemo(() => jobs
    .map(job => scoreDemoJob(job, { education, hardSkills, softSkills }))
    .sort((a, b) => b.finalScore - a.finalScore), [jobs, education, hardSkills, softSkills])
  const labels = { hard: t('simulatorHardLabel'), soft: t('simulatorSoftLabel'), education: t('simulatorEducationLabel') }

  return <section className="border-t border-slate-200 bg-white">
    <div className="mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:py-16">
      <div className="rounded-[12px] border border-slate-200 bg-slate-50 p-5 shadow-[var(--ui-shadow)] sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-brand-600 text-white shadow-sm"><Sparkles className="h-5 w-5" /></span>
            <div>
              <p className="text-[11.5px] font-semibold tracking-[0.12em] text-brand-700 uppercase">{t('simulatorEyebrow')}</p>
              <h2 className="mt-1 text-[26px] font-semibold tracking-[-0.02em] text-slate-900 sm:text-[30px]">{t('simulatorTitle')}</h2>
              <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-slate-600">{t('simulatorLead')}</p>
            </div>
          </div>
          <Button variant="secondary" className="shrink-0" icon={<Shuffle className="h-4 w-4" />} onClick={() => setJobs(shuffleDemoJobs())}>{t('simulatorShuffle')}</Button>
        </div>

        <MatchWeightsLegend className="mt-5" labels={labels} threshold={DEMO_MATCHING_THRESHOLD} thresholdLabel={t('simulatorCutoff')} />

        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,330px)_minmax(0,1fr)] lg:items-start">
          <aside className="rounded-[8px] border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-brand-50 text-brand-700"><FileText className="h-[18px] w-[18px]" /></span>
                <div>
                  <h3 className="text-[15px] font-semibold text-slate-900">{t('simulatorSampleResume')}</h3>
                  <p className="mt-0.5 text-[11.5px] leading-snug text-slate-500">{t('simulatorTapHint')}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="shrink-0" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={reset}><span className="hidden sm:inline">{t('simulatorReset')}</span><span className="sr-only sm:hidden">{t('simulatorReset')}</span></Button>
            </div>

            <div className="mt-4">
              <Select label={t('simulatorEducation')} value={education} options={EDUCATION_LEVELS} onChange={event => setEducation(event.target.value)} />
            </div>

            <fieldset className="mt-5">
              <legend className="flex w-full items-center justify-between gap-2">
                <span className="text-[11px] font-semibold tracking-[0.08em] text-slate-500 uppercase">{t('simulatorHardLabel')}</span>
                <span className="text-[11px] font-medium text-slate-400">{hardSkills.length} {t('simulatorSelected')}</span>
              </legend>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {DEMO_HARD_SKILLS.map(skill => <button key={skill} type="button" aria-pressed={hardSkills.includes(skill)} onClick={() => toggle(hardSkills, setHardSkills, skill)} className={chipClass(hardSkills.includes(skill))}>{skill}</button>)}
              </div>
            </fieldset>

            <fieldset className="mt-5">
              <legend className="flex w-full items-center justify-between gap-2">
                <span className="text-[11px] font-semibold tracking-[0.08em] text-slate-500 uppercase">{t('simulatorSoftLabel')}</span>
                <span className="text-[11px] font-medium text-slate-400">{softSkills.length} {t('simulatorSelected')}</span>
              </legend>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {DEMO_SOFT_SKILLS.map(skill => <button key={skill} type="button" aria-pressed={softSkills.includes(skill)} onClick={() => toggle(softSkills, setSoftSkills, skill)} className={chipClass(softSkills.includes(skill))}>{skill}</button>)}
              </div>
            </fieldset>

            <p className="mt-5 flex gap-2 border-t border-slate-200 pt-4 text-[12px] leading-relaxed text-slate-500"><Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />{t('simulatorPrivacy')}</p>
          </aside>

          <div className="min-w-0">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-500 uppercase">{t('simulatorJobs')}</p>
                <p className="mt-0.5 text-[12.5px] text-slate-500">{t('simulatorRanked')}</p>
              </div>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-2" aria-live="polite">
              {scores.map((score, index) => {
                const matched = [...score.matchedHard, ...score.matchedSoft]
                const gaps = [...score.missingHard, ...score.missingSoft]
                return <article key={score.job.id} className="flex h-full min-w-0 flex-col gap-2.5 rounded-[12px] border border-slate-200 bg-white p-4 transition-[border-color,box-shadow] hover:border-slate-300 hover:shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-[14.5px] leading-snug font-bold break-words text-slate-900">{score.job.title}</h3>
                      {index === 0 && <span className="mt-1 inline-flex rounded-full bg-brand-50 px-2 py-0.5 text-[10.5px] font-semibold text-brand-700">{t('simulatorBestMatch')}</span>}
                    </div>
                    <MatchRing score={score.finalScore} suffix={t('simulatorMatch')} label={`${score.job.title}: ${Math.round(score.finalScore)}% ${t('simulatorMatch')}`} />
                  </div>

                  <p className="text-[12px] leading-snug break-words text-slate-500">{score.job.industry}</p>

                  <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12px] text-slate-500">
                    <GraduationCap aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span>{t('simulatorRequires')} {score.job.education}</span>
                    <span className="text-slate-300" aria-hidden="true">·</span>
                    <span className={`inline-flex items-center gap-1 font-medium ${score.educationScore === 100 ? 'text-slate-600' : 'text-warning-700'}`}>
                      {score.educationScore === 100 ? <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5 text-success-600" /> : <XCircle aria-hidden="true" className="h-3.5 w-3.5" />}
                      {score.educationScore === 100 ? t('simulatorMet') : t('simulatorNotMet')}
                    </span>
                  </p>

                  <MatchSkillList matchedHard={score.matchedHard} matchedSoft={score.matchedSoft} missingHard={score.missingHard} missingSoft={score.missingSoft} matchedLabel={t('simulatorMatched')} gapLabel={t('simulatorGapLabel')} />

                  <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-slate-100 pt-2.5 text-[11.5px] text-slate-500">
                    <span>{t('simulatorMatched')} {matched.length}</span>
                    <span className="text-slate-300" aria-hidden="true">·</span>
                    <span>{t('simulatorGaps')} {gaps.length}</span>
                  </div>
                </article>
              })}
            </div>

            <details className="mt-4 rounded-[8px] border border-slate-200 bg-white p-4">
              <summary className="cursor-pointer text-[13px] font-semibold text-slate-700 marker:text-brand-700">{t('simulatorFormulaTitle')}</summary>
              <p className="mt-2 text-[12.5px] leading-relaxed text-slate-600">{t('simulatorFormula')}</p>
            </details>
          </div>
        </div>
      </div>
    </div>
  </section>
}
