import React, { useEffect } from 'react'

export default function ThemeToggle({theme, setTheme}){
  useEffect(()=>{
    // apply theme to document.documentElement
    if(theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  return (
    <button onClick={()=>{ 
        const next = theme==='light'?'dark':'light'; 
        setTheme(next); 
        localStorage.setItem('site-theme', next);
      }} 
      className="px-3 py-1 rounded-md shadow-sm hover:scale-105 transform transition-all duration-150 bg-gray-100 dark:bg-gray-700 text-sm"
      aria-label="Toggle theme"
    >
      {theme==='light' ? '🌞 Light' : '🌙 Dark'}
    </button>
  )
}
