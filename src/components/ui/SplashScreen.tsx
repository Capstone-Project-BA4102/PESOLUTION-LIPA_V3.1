// @ts-nocheck
import { useEffect, useState } from 'react'

export function SplashScreen({ onFinish }: { onFinish?: () => void }) {
  const [mounted, setMounted] = useState(false)
  const [fade, setFade] = useState(false)

  useEffect(() => {
    setMounted(true)
    const timer = setTimeout(() => {
      setFade(true)
      setTimeout(() => {
        if (onFinish) onFinish()
      }, 500)
    }, 1500)
    return () => clearTimeout(timer)
  }, [onFinish])

  if (!mounted) return null

  return (
    <div className={`force-light fixed inset-0 z-[999] flex flex-col items-center justify-center bg-brand-600 transition-opacity duration-500 ${fade ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
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
            className="h-full bg-white rounded-full" 
            style={{ 
              animation: 'loadProgress 1.5s ease-in-out forwards',
              width: '0%' 
            }} 
          />
        </div>
        <style>{`
          @keyframes loadProgress {
            0% { width: 0%; }
            100% { width: 100%; }
          }
        `}</style>
      </div>
    </div>
  )
}
