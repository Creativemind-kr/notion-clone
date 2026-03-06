'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
      } else {
        setMessage('이메일을 확인해서 계정을 인증해주세요.')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError('이메일 또는 비밀번호가 틀렸습니다.')
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="text-3xl mb-2">📝</div>
          <h1 className="text-2xl font-bold text-gray-900">우리 팀 워크스페이스</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {isSignUp ? '계정을 만들어 시작하세요' : '로그인해서 계속하세요'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
              placeholder="email@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
              placeholder="6자 이상"
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</div>
          )}
          {message && (
            <div className="text-green-600 text-sm bg-green-50 p-3 rounded-lg">{message}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 text-white py-2 rounded-lg font-medium hover:bg-gray-700 transition-colors disabled:opacity-50 text-sm"
          >
            {loading ? '처리 중...' : isSignUp ? '회원가입' : '로그인'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          {isSignUp ? '이미 계정이 있나요?' : '계정이 없나요?'}{' '}
          <button
            onClick={() => { setIsSignUp(!isSignUp); setError(''); setMessage('') }}
            className="text-gray-900 font-medium hover:underline"
          >
            {isSignUp ? '로그인' : '회원가입'}
          </button>
        </p>
      </div>
    </div>
  )
}
