'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getHoliday } from '@/lib/korean-holidays'
import { ChevronLeft, ChevronRight, X, Plus, LayoutList, Grid2X2, CalendarDays, ChevronDown } from 'lucide-react'

interface CalendarEvent {
  id: string
  title: string
  date: string
  time: string | null
  description: string | null
  color: string
  author_name: string
}

type ViewMode = 'week' | 'month' | 'year'

const EVENT_COLORS = [
  { label: '파랑', value: '#3b82f6' },
  { label: '초록', value: '#22c55e' },
  { label: '빨강', value: '#ef4444' },
  { label: '주황', value: '#f97316' },
  { label: '보라', value: '#a855f7' },
  { label: '회색', value: '#6b7280' },
]

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토']
const MONTH_NAMES = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  d.setDate(d.getDate() - d.getDay())
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function dateToStr(d: Date): string {
  return toDateStr(d.getFullYear(), d.getMonth(), d.getDate())
}

export default function CalendarView({ userName }: { userName: string }) {
  const today = new Date()
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate())

  const [view, setView] = useState<ViewMode>('month')
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [weekStart, setWeekStart] = useState<Date>(getWeekStart(today))
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [modal, setModal] = useState<{ date: string } | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [newTime, setNewTime] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newColor, setNewColor] = useState(EVENT_COLORS[0].value)
  const [saving, setSaving] = useState(false)
  const [yearPicker, setYearPicker] = useState(false)
  const supabase = useRef(createClient())

  const fetchEvents = useCallback(async () => {
    let from: string, to: string

    if (view === 'month') {
      from = `${year}-${String(month + 1).padStart(2, '0')}-01`
      const toMonth = month === 11 ? 0 : month + 1
      const toYear = month === 11 ? year + 1 : year
      to = `${toYear}-${String(toMonth + 1).padStart(2, '0')}-01`
    } else if (view === 'week') {
      from = dateToStr(weekStart)
      to = dateToStr(addDays(weekStart, 7))
    } else {
      from = `${year}-01-01`
      to = `${year + 1}-01-01`
    }

    const { data } = await supabase.current
      .from('events')
      .select('*')
      .eq('author_name', userName)
      .gte('date', from)
      .lt('date', to)
    setEvents(data || [])
  }, [view, year, month, weekStart, userName])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  useEffect(() => {
    if (!yearPicker) return
    const close = () => setYearPicker(false)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [yearPicker])

  // 네비게이션
  const goToday = () => {
    setYear(today.getFullYear())
    setMonth(today.getMonth())
    setWeekStart(getWeekStart(today))
  }

  const prev = () => {
    if (view === 'month') {
      if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1)
    } else if (view === 'week') {
      setWeekStart(d => addDays(d, -7))
    } else {
      setYear(y => y - 1)
    }
  }

  const next = () => {
    if (view === 'month') {
      if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1)
    } else if (view === 'week') {
      setWeekStart(d => addDays(d, 7))
    } else {
      setYear(y => y + 1)
    }
  }

  // 헤더 타이틀
  const headerTitle = () => {
    if (view === 'month') return `${year}년 ${month + 1}월`
    if (view === 'year') return `${year}년`
    const weekEnd = addDays(weekStart, 6)
    const sM = weekStart.getMonth() + 1, sD = weekStart.getDate()
    const eM = weekEnd.getMonth() + 1, eD = weekEnd.getDate()
    const sY = weekStart.getFullYear(), eY = weekEnd.getFullYear()
    if (sY !== eY) return `${sY}년 ${sM}월 ${sD}일 – ${eY}년 ${eM}월 ${eD}일`
    if (sM !== eM) return `${sY}년 ${sM}월 ${sD}일 – ${eM}월 ${eD}일`
    return `${sY}년 ${sM}월 ${sD}일 – ${eD}일`
  }

  const openModal = (dateStr: string) => {
    setModal({ date: dateStr })
    setNewTitle(''); setNewTime(''); setNewDesc(''); setNewColor(EVENT_COLORS[0].value)
  }

  const addEvent = async () => {
    if (!newTitle.trim() || !modal) return
    setSaving(true)
    const { data } = await supabase.current
      .from('events')
      .insert({ title: newTitle.trim(), date: modal.date, time: newTime || null, description: newDesc.trim() || null, color: newColor, author_name: userName })
      .select().single()
    if (data) setEvents(prev => [...prev, data].sort((a, b) => (a.time || '').localeCompare(b.time || '')))
    setSaving(false)
    setModal(null)
  }

  const deleteEvent = async (id: string) => {
    await supabase.current.from('events').delete().eq('id', id)
    setEvents(prev => prev.filter(e => e.id !== id))
  }

  // 달력 날짜 계산 (월 뷰)
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const VIEW_TABS: { key: ViewMode; icon: React.ReactNode; label: string }[] = [
    { key: 'week', icon: <LayoutList size={13} />, label: '주' },
    { key: 'month', icon: <Grid2X2 size={13} />, label: '월' },
    { key: 'year', icon: <CalendarDays size={13} />, label: '연' },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 gap-4">
        {/* 좌: 이전/다음 + 오늘 + 타이틀 */}
        <div className="flex items-center gap-2">
          <button
            onClick={goToday}
            className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
          >
            오늘
          </button>
          <button onClick={prev} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <button onClick={next} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <ChevronRight size={16} />
          </button>

          {/* 연도 클릭 시 선택 드롭다운 */}
          <div className="relative ml-1">
            <button
              onClick={() => setYearPicker(o => !o)}
              className="flex items-center gap-1 text-base font-bold text-gray-900 hover:text-gray-600 transition-colors whitespace-nowrap"
            >
              {headerTitle()}
              <ChevronDown size={13} className={`text-gray-400 transition-transform ${yearPicker ? 'rotate-180' : ''}`} />
            </button>
            {yearPicker && (
              <div className="absolute left-0 top-full mt-1.5 z-50 bg-white border border-gray-200 rounded-xl shadow-xl p-2 w-48">
                <div className="grid grid-cols-4 gap-1 max-h-52 overflow-y-auto">
                  {Array.from({ length: 20 }, (_, i) => today.getFullYear() - 5 + i).map(y => (
                    <button
                      key={y}
                      onClick={() => { setYear(y); setYearPicker(false) }}
                      className={`py-1.5 text-xs rounded-lg font-medium transition-colors ${
                        y === year ? 'bg-gray-900 text-white' : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 우: 뷰 토글 */}
        <div className="flex items-center bg-gray-100 rounded-xl p-0.5 gap-0.5">
          {VIEW_TABS.map(({ key, icon, label }) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                view === key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ───── 월 뷰 ───── */}
      {view === 'month' && (
        <>
          <div className="grid grid-cols-7 border-b border-gray-100">
            {DAY_NAMES.map((d, i) => (
              <div key={d} className={`py-2 text-center text-sm font-medium ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'}`}>
                {d}
              </div>
            ))}
          </div>
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
                        ${isToday ? 'bg-gray-900 text-white' : isSun || holiday ? 'text-red-500' : isSat ? 'text-blue-500' : 'text-gray-700'}`}>
                        {day}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); openModal(dateStr) }}
                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-gray-500 transition-opacity"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                    {holiday && <div className="text-[11px] text-red-400 truncate leading-tight mb-0.5">{holiday}</div>}
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
                              {event.time && <span className="text-[11px] shrink-0" style={{ color: event.color }}>{event.time}</span>}
                              <span className="text-[12px] truncate" style={{ color: event.color }}>{event.title}</span>
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
        </>
      )}

      {/* ───── 주 뷰 ───── */}
      {view === 'week' && (
        <div className="flex-1 overflow-y-auto flex flex-col">
          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 border-b border-gray-100 sticky top-0 bg-white z-10">
            {Array.from({ length: 7 }, (_, i) => {
              const d = addDays(weekStart, i)
              const ds = dateToStr(d)
              const isToday = ds === todayStr
              const isSun = i === 0
              const isSat = i === 6
              return (
                <div key={i} className="py-3 text-center border-r border-gray-100 last:border-0">
                  <div className={`text-xs font-medium mb-1 ${isSun ? 'text-red-400' : isSat ? 'text-blue-400' : 'text-gray-400'}`}>
                    {DAY_NAMES[i]}
                  </div>
                  <div className={`text-lg font-bold w-9 h-9 mx-auto flex items-center justify-center rounded-full transition-colors
                    ${isToday ? 'bg-gray-900 text-white' : isSun ? 'text-red-500' : isSat ? 'text-blue-500' : 'text-gray-800'}`}>
                    {d.getDate()}
                  </div>
                </div>
              )
            })}
          </div>

          {/* 이벤트 컬럼 */}
          <div className="grid grid-cols-7 flex-1">
            {Array.from({ length: 7 }, (_, i) => {
              const d = addDays(weekStart, i)
              const ds = dateToStr(d)
              const holiday = getHoliday(ds)
              const dayEvents = events.filter(e => e.date === ds)
              const isToday = ds === todayStr
              const isSun = i === 0
              return (
                <div
                  key={i}
                  onClick={() => openModal(ds)}
                  className={`border-r border-gray-100 last:border-0 p-2 cursor-pointer hover:bg-gray-50/70 transition-colors min-h-40 group ${isToday ? 'bg-blue-50/30' : ''}`}
                >
                  {holiday && <div className="text-[11px] text-red-400 mb-1 truncate">{holiday}</div>}
                  <div className="space-y-1">
                    {dayEvents
                      .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
                      .map(event => (
                        <div
                          key={event.id}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded-lg px-2 py-1 group/event flex items-start gap-1"
                          style={{ backgroundColor: event.color + '18', borderLeft: `3px solid ${event.color}` }}
                        >
                          <div className="flex-1 min-w-0">
                            {event.time && <div className="text-[10px] font-medium" style={{ color: event.color }}>{event.time}</div>}
                            <div className="text-[12px] font-medium truncate" style={{ color: event.color }}>{event.title}</div>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteEvent(event.id) }}
                            className="opacity-0 group-hover/event:opacity-100 mt-0.5 shrink-0"
                            style={{ color: event.color }}
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); openModal(ds) }}
                    className={`mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${isSun ? 'text-red-300' : 'text-gray-300'} hover:text-gray-500`}
                  >
                    <Plus size={13} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ───── 연 뷰 ───── */}
      {view === 'year' && (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-3 gap-4 max-w-4xl mx-auto">
            {Array.from({ length: 12 }, (_, mi) => {
              const firstDayOfMini = new Date(year, mi, 1).getDay()
              const daysInMini = new Date(year, mi + 1, 0).getDate()
              const miniCells: (number | null)[] = [
                ...Array(firstDayOfMini).fill(null),
                ...Array.from({ length: daysInMini }, (_, i) => i + 1),
              ]
              while (miniCells.length % 7 !== 0) miniCells.push(null)
              const monthEvents = events.filter(e => e.date.startsWith(`${year}-${String(mi + 1).padStart(2, '0')}`))

              return (
                <div
                  key={mi}
                  className="bg-white border border-gray-100 rounded-xl p-3 cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all"
                  onClick={() => { setMonth(mi); setView('month') }}
                >
                  {/* 미니 캘린더 헤더 */}
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-bold ${mi === today.getMonth() && year === today.getFullYear() ? 'text-gray-900' : 'text-gray-600'}`}>
                      {MONTH_NAMES[mi]}
                    </span>
                    {monthEvents.length > 0 && (
                      <span className="text-[10px] text-gray-400 font-medium">{monthEvents.length}개</span>
                    )}
                  </div>

                  {/* 요일 헤더 */}
                  <div className="grid grid-cols-7 mb-1">
                    {DAY_NAMES.map((d, di) => (
                      <div key={d} className={`text-center text-[9px] font-medium ${di === 0 ? 'text-red-400' : di === 6 ? 'text-blue-400' : 'text-gray-300'}`}>
                        {d}
                      </div>
                    ))}
                  </div>

                  {/* 날짜 그리드 */}
                  <div className="grid grid-cols-7 gap-y-0.5">
                    {miniCells.map((day, idx) => {
                      if (!day) return <div key={idx} />
                      const ds = toDateStr(year, mi, day)
                      const hasEvent = monthEvents.some(e => e.date === ds)
                      const eventColors = [...new Set(monthEvents.filter(e => e.date === ds).map(e => e.color))]
                      const isToday = ds === todayStr
                      const isSun = idx % 7 === 0
                      const isSat = idx % 7 === 6
                      const holiday = getHoliday(ds)
                      return (
                        <div key={idx} className="flex flex-col items-center">
                          <span className={`text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-medium
                            ${isToday ? 'bg-gray-900 text-white' : isSun || holiday ? 'text-red-400' : isSat ? 'text-blue-400' : 'text-gray-600'}`}>
                            {day}
                          </span>
                          {hasEvent && (
                            <div className="flex gap-0.5 mt-0.5">
                              {eventColors.slice(0, 3).map((c, ci) => (
                                <div key={ci} className="w-1 h-1 rounded-full" style={{ backgroundColor: c }} />
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 일정 추가 모달 */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setModal(null)}>
          <div className="bg-white rounded-xl shadow-lg p-5 w-80" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">{modal.date}</h3>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>
            <input
              autoFocus type="text" value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addEvent()}
              placeholder="일정 제목 *"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 mb-2"
            />
            <input
              type="time" value={newTime}
              onChange={e => setNewTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 mb-2 text-gray-600"
            />
            <textarea
              value={newDesc} onChange={e => setNewDesc(e.target.value)}
              placeholder="설명 (선택)" rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 mb-3 resize-none"
            />
            <div className="flex gap-2 mb-4">
              {EVENT_COLORS.map(c => (
                <button
                  key={c.value} onClick={() => setNewColor(c.value)}
                  className={`w-6 h-6 rounded-full transition-transform ${newColor === c.value ? 'scale-125 ring-2 ring-offset-1 ring-gray-400' : 'hover:scale-110'}`}
                  style={{ backgroundColor: c.value }} title={c.label}
                />
              ))}
            </div>
            <button
              onClick={addEvent} disabled={saving || !newTitle.trim()}
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
