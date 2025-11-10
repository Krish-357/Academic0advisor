import React, {useState, useRef} from 'react'
import MessageBubble from './MessageBubble'
import { motion } from 'framer-motion'

export default function ChatAdvisor({apiUrl}){
  const [messages, setMessages] = useState([
    {id: 1, role: 'advisor', text: 'Hello! I am your Academic & Career Advisor. How can I help you today?'}
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = ()=>{
    messagesEndRef.current?.scrollIntoView({behavior:'smooth'})
  }

  const sendMessage = async (text)=>{
    if(!text) return
    const userMsg = {id: Date.now(), role: 'user', text}
    setMessages(prev=>[...prev, userMsg])
    setInput('')
    setLoading(true)
    scrollToBottom()
    try{
      const resp = await fetch(`${apiUrl}/api/query`,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({user_id: 'student1', message: text})
      })
      const data = await resp.json()
      const advisorText = (data.academic || data.career) ? (data.academic||data.career) : (data.reply || JSON.stringify(data))
      setMessages(prev=>[...prev, {id: Date.now()+1, role:'advisor', text: advisorText}])
    }catch(err){
      setMessages(prev=>[...prev, {id: Date.now()+1, role:'advisor', text:'(Error) Could not reach backend.'}])
    }
    setLoading(false)
    scrollToBottom()
  }

  const suggestionClick = (s)=>{ setInput(s) }

  return (
    <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex flex-col">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-800 dark:text-gray-100">Chat with Advisor</h2>
        <div className="text-sm text-gray-500">AI-powered guidance</div>
      </div>

      <div className="flex-1 overflow-auto h-96 p-2 space-y-3">
        {messages.map(m=> (
          <MessageBubble key={m.id} role={m.role} text={m.text} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="mt-3">
        <div className="flex gap-2 mb-2">
          {['Recommend courses for AI', 'Career paths in Data Science', 'How to improve my GPA?'].map(s=> (
            <button key={s} onClick={()=>suggestionClick(s)} className="px-3 py-1 rounded-full border hover:scale-105 transition">{s}</button>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') sendMessage(input) }} placeholder="Ask something..." className="flex-1 p-2 rounded border focus:outline-none focus:ring-2" />
          <motion.button whileHover={{scale:1.03}} whileTap={{scale:0.98}} onClick={()=>sendMessage(input)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">{loading? 'Thinking...':'Ask'}</motion.button>
        </div>
      </div>
    </div>
  )
}
