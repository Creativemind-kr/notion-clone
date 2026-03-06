'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginForm() {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [redirect, setRedirect] = useState('/dashboard')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const r = params.get('redirect')
    if (r) setRedirect(r)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName || !password) return

    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data, error: dbError } = await supabase
      .from('users')
      .select('name, password')
      .eq('name', trimmedName)
      .single()

    if (dbError && dbError.code !== 'PGRST116') {
      setError('오류가 발생했어요. 다시 시도해주세요.')
      setLoading(false)
      return
    }

    if (!data) {
      // 신규 사용자 → 계정 생성
      const { error: insertError } = await supabase
        .from('users')
        .insert({ name: trimmedName, password })
      if (insertError) {
        setError('계정 생성에 실패했어요. 다시 시도해주세요.')
        setLoading(false)
        return
      }
    } else if (data.password !== password) {
      setError('비밀번호가 틀렸어요.')
      setLoading(false)
      return
    }

    localStorage.setItem('workspace_user', trimmedName)
    window.location.href = redirect
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-3xl mb-2">📝</div>
          <h1 className="text-2xl font-bold text-gray-900">스브스 전용 메모장★</h1>
          <p className="text-gray-500 mt-1 text-sm">이름과 비밀번호를 입력하세요</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">이름</label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError('') }}
              required
              autoFocus
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
              placeholder="홍길동"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError('') }}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
              placeholder="비밀번호 입력"
            />
          </div>

          {error && (
            <p className="text-xs text-red-500">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 text-white py-2 rounded-lg font-medium hover:bg-gray-700 transition-colors text-sm disabled:opacity-50 mt-1"
          >
            {loading ? '확인 중...' : '입장하기'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-4">
          처음 입력하는 이름+비밀번호로 자동 가입돼요
        </p>
      </div>
    </div>
  )
}
