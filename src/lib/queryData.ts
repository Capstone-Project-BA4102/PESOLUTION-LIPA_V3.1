/** Share identical JSON subtrees so unchanged rows/charts keep stable props and DOM. */
export function shareQueryData<T>(previous: T, next: T): T {
  if (Object.is(previous,next)) return previous
  if (!previous || !next || typeof previous !== 'object' || typeof next !== 'object') return next
  if (Array.isArray(previous) && Array.isArray(next)) {
    if (previous.length !== next.length) return next
    const result=next.map((value,index)=>shareQueryData(previous[index],value))
    return result.every((value,index)=>Object.is(value,previous[index])) ? previous : result as T
  }
  if (Array.isArray(previous) || Array.isArray(next) || Object.prototype.toString.call(previous)!=='[object Object]' || Object.prototype.toString.call(next)!=='[object Object]') return next
  const old=previous as Record<string,unknown>,incoming=next as Record<string,unknown>,keys=Object.keys(incoming)
  const result: Record<string,unknown>={...incoming};let equal=Object.keys(old).length===keys.length
  for(const key of keys){result[key]=shareQueryData(old[key],incoming[key]);equal &&= Object.hasOwn(old,key)&&Object.is(result[key],old[key])}
  return (equal ? previous : result) as T
}
