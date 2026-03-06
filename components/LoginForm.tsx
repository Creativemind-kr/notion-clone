'use client'

import { useState } from 'react'

export default function LoginForm() {
  const [name, setName] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    localStorage.setItem('workspace_user', name.trim())
    window.location.href = '/dashboard'
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-3xl mb-2">📝</div>
          <h1 className="text-2xl font-bold text-gray-900">우리 팀 워크스페이스</h1>
          <p className="text-gray-500 mt-1 text-sm">이름을 입력하고 시작하세요</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
            placeholder="홍길동"
          />
          <button
            type="submit"
            className="w-full bg-gray-900 text-white py-2 rounded-lg font-medium hover:bg-gray-700 transition-colors text-sm"
          >
            입장하기
          </button>
        </form>
      </div>
    </div>
  )
}
