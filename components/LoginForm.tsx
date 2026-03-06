'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Mode = 'login' | 'signup' | 'reset'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<Mode>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const reset = () => { setError(''); setMessage('') }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    reset()

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setMessage('이메일을 확인해서 계정을 인증해주세요. (스팸함도 확인!)')
    } else if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError('이메일 또는 비밀번호가 틀렸습니다. 이메일 인증을 완료했는지 확인해주세요.')
      else { window.location.href = '/dashboard' }
    } else if (mode === 'reset') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) setError(error.message)
      else setMessage('비밀번호 재설정 링크를 이메일로 보냈어요. 확인해주세요.')
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
            {mode === 'login' && '로그인해서 계속하세요'}
            {mode === 'signup' && '계정을 만들어 시작하세요'}
            {mode === 'reset' && '비밀번호를 재설정해요'}
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

          {mode !== 'reset' && (
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
          )}

          {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</div>}
          {message && <div className="text-green-600 text-sm bg-green-50 p-3 rounded-lg">{message}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 text-white py-2 rounded-lg font-medium hover:bg-gray-700 transition-colors disabled:opacity-50 text-sm"
          >
            {loading ? '처리 중...' : mode === 'login' ? '로그인' : mode === 'signup' ? '회원가입' : '재설정 링크 보내기'}
          </button>
        </form>

        <div className="mt-4 text-center space-y-2">
          {mode === 'login' && (
            <>
              <p className="text-sm text-gray-500">
                계정이 없나요?{' '}
                <button onClick={() => { setMode('signup'); reset() }} className="text-gray-900 font-medium hover:underline">
                  회원가입
                </button>
              </p>
              <p className="text-sm text-gray-500">
                <button onClick={() => { setMode('reset'); reset() }} className="text-gray-500 hover:underline">
                  비밀번호를 잊으셨나요?
                </button>
              </p>
            </>
          )}
          {mode !== 'login' && (
            <p className="text-sm text-gray-500">
              <button onClick={() => { setMode('login'); reset() }} className="text-gray-900 font-medium hover:underline">
                로그인으로 돌아가기
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
