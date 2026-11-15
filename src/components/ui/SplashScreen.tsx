// @ts-nocheck
import { useEffect, useState } from 'react'

/** How long the splash stays fully opaque before it starts fading. */
export const SPLASH_HOLD_MS = 1100
/** How long the splash fade-out takes. App content is revealed as it fades. */
export const SPLASH_FADE_MS = 420

export function SplashScreen({ onFinish }: { onFinish?: () => void }) {
  const [mounted, setMounted] = useState(false)
  const [fade, setFade] = useState(false)

  useEffect(() => {
    setMounted(true)
    const timer = setTimeout(() => {
      setFade(true)
      setTimeout(() => {
        if (onFinish) onFinish()
      }, SPLASH_FADE_MS)
    }, SPLASH_HOLD_MS)
    return () => clearTimeout(timer)
  }, [onFinish])

  if (!mounted) return null

  return (
    <div
      className={`splash-panel force-light fixed inset-0 z-[999] flex flex-col items-center justify-center bg-brand-600 transition-opacity ${fade ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      style={{ transitionDuration: `${SPLASH_FADE_MS}ms` }}
    >
      <div className="relative flex flex-col items-center">
        {/* Logo Container */}
        <div className="h-24 w-24 rounded-full bg-white p-2 shadow-2xl animate-bounce mb-6 flex items-center justify-center">
          <img src="/logo-lipa.png" alt="PESO Lipa Logo" className="h-full w-full object-contain" />
        </div>
        {/* App Name */}
        <h1 className="text-4xl font-black !text-white tracking-tight animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
          PESO<span className="text-brand-200">LUTION</span>
        </h1>
        <p className="mt-2 text-brand-100 font-medium tracking-wide animate-in fade-in slide-in-from-bottom-2 duration-700 delay-300">
          LIPA CITY
        </p>
        {/* Loading bar */}
        <div className="mt-8 h-1 w-48 overflow-hidden rounded-full bg-brand-800/50">
          <div 
            className="splash-progress h-full bg-white rounded-full" 
            style={{ 
              animation: `loadProgress ${SPLASH_HOLD_MS}ms ease-in-out forwards`,
              width: '0%' 
            }} 
          />
        </div>
        <style>{`
          @keyframes loadProgress {
            0% { width: 0%; }
            100% { width: 100%; }
          }
          @media (prefers-reduced-motion: reduce) {
            .splash-progress { animation-duration: ${SPLASH_HOLD_MS}ms !important; }
            /* Opacity-only fade is safe under reduced motion and avoids a blank frame. */
            .splash-panel { transition-duration: ${SPLASH_FADE_MS}ms !important; }
          }
        `}</style>
      </div>
    </div>
  )
}
