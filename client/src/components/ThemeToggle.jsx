import React from 'react'

export default function ThemeToggle({theme, setTheme}){
  return (
    <button onClick={()=>setTheme(theme==='light'?'dark':'light')} className="px-3 py-1 rounded hover:scale-105 transition bg-gray-100 dark:bg-gray-700">
      {theme==='light' ? '🌞 Light' : '🌙 Dark'}
    </button>
  )
}
