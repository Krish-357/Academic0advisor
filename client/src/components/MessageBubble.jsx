import React from 'react'

export default function MessageBubble({role, text}){
  const isUser = role==='user'
  return (
    <div className={`flex ${isUser? 'justify-end':'justify-start'}`}>
      <div className={`${isUser? 'bg-blue-600 text-white':'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'} max-w-[80%] p-3 rounded-lg shadow`}> 
        <div style={{whiteSpace:'pre-wrap'}}>{text}</div>
      </div>
    </div>
  )
}
