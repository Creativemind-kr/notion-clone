'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FileText, Eye, EyeOff } from 'lucide-react'

export default function LoginForm() {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
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
      .from('users').select('name, password').eq('name', trimmedName).single()
    if (dbError && dbError.code !== 'PGRST116') {
      setError('오류가 발생했어요. 다시 시도해주세요.')
      setLoading(false)
      return
    }
    if (!data) {
      const { error: insertError } = await supabase.from('users').insert({ name: trimmedName, password })
      if (insertError) { setError('계정 생성에 실패했어요.'); setLoading(false); return }
    } else if (data.password !== password) {
      setError('비밀번호가 틀렸어요.')
      setLoading(false)
      return
    }
    localStorage.setItem('workspace_user', trimmedName)
    window.location.href = redirect
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 60%, #e2e8f0 100%)' }}>
      <div className="w-full max-w-sm">

        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center mb-5 shadow-lg">
            <FileText size={20} className="text-white" strokeWidth={1.8} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">스브스 메모장</h1>
          <p className="text-slate-400 text-sm mt-1.5">팀 전용 워크스페이스</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-7">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">이름</label>
              <input
                type="text" value={name}
                onChange={(e) => { setName(e.target.value); setError('') }}
                required autoFocus placeholder="홍길동"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm placeholder-slate-300 focus:outline-none focus:bg-white focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">비밀번호</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'} value={password}
                  onChange={(e) => { setPassword(e.target.value); setError('') }}
                  required placeholder="비밀번호 입력"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm placeholder-slate-300 focus:outline-none focus:bg-white focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all pr-11"
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-100 rounded-xl">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0" />
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-700 active:scale-[0.99] text-white py-3 rounded-xl text-sm font-semibold transition-all shadow-sm disabled:opacity-50 mt-1">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  확인 중...
                </span>
              ) : '입장하기'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-5">처음 입력하는 이름 + 비밀번호로 자동 가입</p>
      </div>
    </div>
  )
}
