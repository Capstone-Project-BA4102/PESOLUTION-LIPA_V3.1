import { useEffect, useRef, useState } from 'react'
import { appReveal } from './appReveal'
const reduceMotion = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
/** Animate once on initial reveal. Later values render directly, without count-up replay. */
export function useCountUp(target: number, duration = 800) {
  const [reduced] = useState(reduceMotion)
  const [initialTarget] = useState(target)
  const [finished,setFinished] = useState(false)
  const [display,setDisplay] = useState(()=>reduced?target:0)
  const displayRef=useRef(display)
  useEffect(()=>{
    if(reduced || finished || target!==initialTarget || duration<=0){
      if(!finished)setFinished(true)
      displayRef.current=target;setDisplay(target);return
    }
    let frame=0,cancelled=false
    const run=()=>{
      if(cancelled)return
      const from=displayRef.current
      if(from===target){setFinished(true);return}
      const start=performance.now()
      const tick=(now:number)=>{
        if(cancelled)return
        const progress=Math.min(1,(now-start)/duration),value=from+(target-from)*(1-Math.pow(1-progress,3))
        displayRef.current=value;setDisplay(value)
        if(progress<1)frame=requestAnimationFrame(tick)
        else setFinished(true)
      }
      frame=requestAnimationFrame(tick)
    }
    const unsubscribe=appReveal.hidden?appReveal.subscribe(run):null
    if(!appReveal.hidden)run()
    return()=>{cancelled=true;unsubscribe?.();cancelAnimationFrame(frame)}
  },[reduced,target,duration,initialTarget,finished])
  return reduced || finished || target!==initialTarget ? target : display
}
