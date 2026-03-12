import { ArrowLeft } from 'lucide-react'

export default function DashboardPage() {
  const tips = [
    { icon: '📝', label: '새 페이지', desc: '사이드바 + 버튼 클릭' },
    { icon: '✏️', label: '블록 추가', desc: '/ 입력 후 선택' },
    { icon: '🔀', label: '순서 변경', desc: '⋮ → 순서편집' },
    { icon: '🎨', label: '글씨 꾸미기', desc: '상단 툴바 활용' },
    { icon: '🔗', label: '링크 추가', desc: '텍스트 선택 후 🔗' },
    { icon: '▶️', label: '유튜브 삽입', desc: '/ → YouTube' },
    { icon: '📤', label: '공유하기', desc: '우상단 공유 버튼' },
  ]

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center select-none max-w-xs w-full">

        {/* 애니메이션 화살표 */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[0, 1, 2].map((i) => (
            <ArrowLeft
              key={i}
              size={20}
              className="animate-slide-left text-blue-400"
              style={{ animationDelay: `${i * 0.18}s` }}
            />
          ))}
        </div>

        {/* 아이콘 + 메인 텍스트 */}
        <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
        </div>
        <p className="text-base font-semibold text-slate-700">시작하려면 왼쪽에서</p>
        <p className="text-sm text-slate-400 mt-1 mb-6">페이지를 선택하거나 만들어요</p>

        {/* 구분선 */}
        <div className="border-t border-slate-100 mb-5" />

        {/* 빠른 사용법 */}
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3">💡 빠른 사용법</p>
        <div className="space-y-2 text-left">
          {tips.map((tip) => (
            <div key={tip.label} className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
              <span className="text-base w-5 text-center shrink-0">{tip.icon}</span>
              <span className="text-xs font-medium text-slate-600 w-20 shrink-0">{tip.label}</span>
              <span className="text-slate-300 text-xs shrink-0">→</span>
              <span className="text-xs text-slate-400">{tip.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
