export function reportingMonthRange(month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('Choose a valid reporting month.')
  const [year,value] = month.split('-').map(Number)
  if (year < 2000 || year > 9999) throw new Error('Choose a valid reporting year.')
  return { from:`${month}-01`, to:`${month}-${new Date(Date.UTC(year,value,0)).getUTCDate()}` }
}
export const currentReportingMonth = (now: Date = new Date()) => now.toLocaleDateString('en-CA',{timeZone:'Asia/Manila'}).slice(0,7)
