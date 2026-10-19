'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { ADMIN_NAME, RESET_PASSWORD } from '@/lib/admin'
import { X } from 'lucide-react'

const inputClass =
  'w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm placeholder-slate-300 focus:outline-none focus:bg-white focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all'

async function postPassword(body: Record<string, string>) {
  const res = await fetch('/api/password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || '오류가 발생했어요. 다시 시도해주세요.')
  return data
}

function ModalShell({ title, subtitle, onClose, children }: {
  title: string
  subtitle?: string
  onClose: () => void
  children: React.ReactNode
}) {
  return createPortal(
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden break-keep"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <span className="text-sm font-semibold text-slate-800">{title}</span>
            {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  )
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-100 rounded-xl">
      <div className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0" />
      <p className="text-xs text-red-600">{message}</p>
    </div>
  )
}

// ─── 본인 비밀번호 변경 ─────────────────────────────────────────────────────────
export function ChangePasswordModal({ userName, onClose }: { userName: string; onClose: () => void }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (next !== confirm) { setError('새 비밀번호가 서로 달라요.'); return }
    setLoading(true)
    setError('')
    try {
      await postPassword({ mode: 'change', name: userName, currentPassword: current, newPassword: next })
      setDone(true)
      setTimeout(onClose, 1500)
    } catch (err) {
      setError((err as Error).message)
    }
    setLoading(false)
  }

  return (
    <ModalShell title="비밀번호 변경" subtitle={userName} onClose={onClose}>
      {done ? (
        <p className="px-5 py-8 text-center text-sm text-slate-700">비밀번호가 바뀌었어요.</p>
      ) : (
        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-3">
          <input type="password" value={current} onChange={(e) => { setCurrent(e.target.value); setError('') }}
            required autoFocus placeholder="현재 비밀번호 (임시 비밀번호)" className={inputClass} />
          <input type="password" value={next} onChange={(e) => { setNext(e.target.value); setError('') }}
            required placeholder="새 비밀번호" className={inputClass} />
          <input type="password" value={confirm} onChange={(e) => { setConfirm(e.target.value); setError('') }}
            required placeholder="새 비밀번호 확인" className={inputClass} />
          {error && <ErrorBox message={error} />}
          <button type="submit" disabled={loading}
            className="w-full bg-slate-900 hover:bg-slate-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50">
            {loading ? '변경 중...' : '변경하기'}
          </button>
        </form>
      )}
    </ModalShell>
  )
}

// ─── 관리자: 사용자 비밀번호 초기화 ─────────────────────────────────────────────
export function AdminResetModal({ onClose }: { onClose: () => void }) {
  const [adminPassword, setAdminPassword] = useState('')
  const [users, setUsers] = useState<string[] | null>(null)
  const [confirmName, setConfirmName] = useState<string | null>(null)
  const [loadingName, setLoadingName] = useState<string | null>(null)
  const [resetName, setResetName] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    createClient().from('users').select('name').order('name').then(({ data }) => {
      setUsers((data || []).map(u => u.name as string).filter(n => n !== ADMIN_NAME))
    })
  }, [])

  const handleReset = async (name: string) => {
    if (confirmName !== name) { setConfirmName(name); return }
    setLoadingName(name)
    setError('')
    setResetName(null)
    try {
      await postPassword({ mode: 'reset', adminPassword, targetName: name })
      setResetName(name)
    } catch (err) {
      setError((err as Error).message)
    }
    setConfirmName(null)
    setLoadingName(null)
  }

  return (
    <ModalShell title="비밀번호 초기화" subtitle={`초기화하면 비밀번호가 ${RESET_PASSWORD}로 바뀌어요`} onClose={onClose}>
      <div className="px-5 pt-4 pb-3 space-y-3 border-b border-slate-100">
        <input type="password" value={adminPassword} onChange={(e) => { setAdminPassword(e.target.value); setError('') }}
          autoFocus placeholder="관리자 비밀번호 확인" className={inputClass} />
        {error && <ErrorBox message={error} />}
        {resetName && (
          <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
            <p className="text-sm text-slate-800">
              {resetName}님 비밀번호를 <span className="font-bold">{RESET_PASSWORD}</span>로 초기화했어요.
            </p>
            <p className="text-[11px] text-slate-400 mt-1">입장 후 바로 비밀번호를 바꾸라고 안내해주세요.</p>
          </div>
        )}
      </div>
      <ul className="overflow-y-auto max-h-[45vh] py-2">
        {users === null && <li className="px-5 py-3 text-xs text-slate-400">불러오는 중...</li>}
        {users?.length === 0 && <li className="px-5 py-3 text-xs text-slate-400">가입한 사용자가 없어요</li>}
        {users?.map(name => (
          <li key={name} className="flex items-center justify-between px-5 py-2 hover:bg-slate-50 transition-colors">
            <span className="text-[13px] text-slate-700 truncate">{name}</span>
            <button
              onClick={() => handleReset(name)}
              disabled={!adminPassword || loadingName !== null}
              className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-lg transition-colors disabled:opacity-40 ${
                confirmName === name ? 'bg-red-500 text-white hover:bg-red-600' : 'text-slate-500 hover:bg-slate-200'
              }`}
            >
              {loadingName === name ? '처리 중...' : confirmName === name ? '한 번 더 눌러 초기화' : '초기화'}
            </button>
          </li>
        ))}
      </ul>
    </ModalShell>
  )
}
