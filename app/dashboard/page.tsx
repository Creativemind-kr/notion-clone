export default function DashboardPage() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center select-none">
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
        </div>
        <p className="text-base font-semibold text-slate-700">페이지를 선택하세요</p>
        <p className="text-sm text-slate-400 mt-1.5">왼쪽에서 페이지를 고르거나 새로 만들어요</p>
      </div>
    </div>
  )
}
