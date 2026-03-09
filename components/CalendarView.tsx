'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getHoliday } from '@/lib/korean-holidays'
import { ChevronLeft, ChevronRight, X, Plus } from 'lucide-react'

interface CalendarEvent {
  id: string
  title: string
  date: string
  time: string | null
  description: string | null
  color: string
  author_name: string
}

const EVENT_COLORS = [
  { label: '파랑', value: '#3b82f6' },
  { label: '초록', value: '#22c55e' },
  { label: '빨강', value: '#ef4444' },
  { label: '주황', value: '#f97316' },
  { label: '보라', value: '#a855f7' },
  { label: '회색', value: '#6b7280' },
]

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토']

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export default function CalendarView({ userName }: { userName: string }) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [modal, setModal] = useState<{ date: string } | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [newTime, setNewTime] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newColor, setNewColor] = useState(EVENT_COLORS[0].value)
  const [saving, setSaving] = useState(false)
  const supabase = useRef(createClient())

  const fetchEvents = async () => {
    const from = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const toMonth = month === 11 ? 0 : month + 1
    const toYear = month === 11 ? year + 1 : year
    const to = `${toYear}-${String(toMonth + 1).padStart(2, '0')}-01`

    const { data } = await supabase.current
      .from('events')
      .select('*')
      .eq('author_name', userName)
      .gte('date', from)
      .lt('date', to)
    setEvents(data || [])
  }

  useEffect(() => { fetchEvents() }, [year, month])

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const openModal = (dateStr: string) => {
    setModal({ date: dateStr })
    setNewTitle('')
    setNewTime('')
    setNewDesc('')
    setNewColor(EVENT_COLORS[0].value)
  }

  const addEvent = async () => {
    if (!newTitle.trim() || !modal) return
    setSaving(true)
    const { data } = await supabase.current
      .from('events')
      .insert({
        title: newTitle.trim(),
        date: modal.date,
        time: newTime || null,
        description: newDesc.trim() || null,
        color: newColor,
        author_name: userName,
      })
      .select()
      .single()
    if (data) setEvents(prev => [...prev, data].sort((a, b) => (a.time || '').localeCompare(b.time || '')))
    setSaving(false)
    setModal(null)
  }

  const deleteEvent = async (id: string) => {
    await supabase.current.from('events').delete().eq('id', id)
    setEvents(prev => prev.filter(e => e.id !== id))
  }

  // 달력 날짜 계산
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate())

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <h2 className="text-lg font-bold text-gray-900">{year}년 {month + 1}월</h2>
        </div>
        <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {DAY_NAMES.map((d, i) => (
          <div key={d} className={`py-2 text-center text-xs font-medium ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'}`}>
            {d}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-7 h-full" style={{ gridAutoRows: 'minmax(80px, 1fr)' }}>
          {cells.map((day, idx) => {
            if (!day) return <div key={idx} className="border-b border-r border-gray-100 bg-gray-50/50" />

            const dateStr = toDateStr(year, month, day)
            const holiday = getHoliday(dateStr)
            const dayEvents = events.filter(e => e.date === dateStr)
            const isToday = dateStr === todayStr
            const isSun = idx % 7 === 0
            const isSat = idx % 7 === 6

            return (
              <div
                key={idx}
                onClick={() => openModal(dateStr)}
                className="border-b border-r border-gray-100 p-1.5 cursor-pointer hover:bg-gray-50 transition-colors relative group min-h-20"
              >
                <div className="flex items-start justify-between mb-0.5">
                  <span className={`text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full
                    ${isToday ? 'bg-gray-900 text-white' : isSun || holiday ? 'text-red-500' : isSat ? 'text-blue-500' : 'text-gray-700'}
                  `}>
                    {day}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); openModal(dateStr) }}
                    className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-gray-500 transition-opacity"
                  >
                    <Plus size={12} />
                  </button>
                </div>

                {holiday && (
                  <div className="text-xs text-red-400 truncate leading-tight mb-0.5">{holiday}</div>
                )}

                <div className="space-y-0.5">
                  {dayEvents.map(event => (
                    <div
                      key={event.id}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 rounded px-1 py-0.5 group/event"
                      style={{ backgroundColor: event.color + '20', borderLeft: `2px solid ${event.color}` }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          {event.time && <span className="text-xs shrink-0" style={{ color: event.color }}>{event.time}</span>}
                          <span className="text-xs truncate" style={{ color: event.color }}>{event.title}</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteEvent(event.id) }}
                        className="opacity-0 group-hover/event:opacity-100 shrink-0"
                        style={{ color: event.color }}
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 일정 추가 모달 */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setModal(null)}>
          <div className="bg-white rounded-xl shadow-lg p-5 w-80" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">{modal.date}</h3>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            <input
              autoFocus
              type="text"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addEvent()}
              placeholder="일정 제목 *"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 mb-2"
            />

            <input
              type="time"
              value={newTime}
              onChange={e => setNewTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 mb-2 text-gray-600"
            />

            <textarea
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              placeholder="설명 (선택)"
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 mb-3 resize-none"
            />

            <div className="flex gap-2 mb-4">
              {EVENT_COLORS.map(c => (
                <button
                  key={c.value}
                  onClick={() => setNewColor(c.value)}
                  className={`w-6 h-6 rounded-full transition-transform ${newColor === c.value ? 'scale-125 ring-2 ring-offset-1 ring-gray-400' : 'hover:scale-110'}`}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                />
              ))}
            </div>

            <button
              onClick={addEvent}
              disabled={saving || !newTitle.trim()}
              className="w-full bg-gray-900 text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {saving ? '저장 중...' : '추가'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
