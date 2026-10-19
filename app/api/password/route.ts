import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomInt } from 'crypto'
import { ADMIN_NAME } from '@/lib/admin'

const SUPABASE_URL = 'https://biuojrtaitzgodfcpzja.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// mode 'change' : 본인이 현재 비밀번호를 확인한 뒤 새 비밀번호로 변경
// mode 'reset'  : 관리자가 자기 비밀번호를 확인한 뒤 다른 사용자를 임시 비밀번호로 초기화
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    const checkPassword = async (name: string, password: string) => {
      const { data, error } = await supabase.from('users').select('password').eq('name', name).maybeSingle()
      if (error) throw new Error(error.message)
      return !!data && data.password === password
    }

    if (body.mode === 'change') {
      const { name, currentPassword, newPassword } = body
      if (!name || !currentPassword || !newPassword) {
        return NextResponse.json({ error: '모든 칸을 입력해주세요.' }, { status: 400 })
      }
      if (!(await checkPassword(name, currentPassword))) {
        return NextResponse.json({ error: '현재 비밀번호가 틀렸어요.' }, { status: 401 })
      }
      const { error } = await supabase.from('users').update({ password: newPassword }).eq('name', name)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    if (body.mode === 'reset') {
      const { adminPassword, targetName } = body
      if (!adminPassword || !targetName) {
        return NextResponse.json({ error: '관리자 비밀번호를 입력해주세요.' }, { status: 400 })
      }
      if (targetName === ADMIN_NAME) {
        return NextResponse.json({ error: '관리자 비밀번호는 여기서 초기화할 수 없어요.' }, { status: 400 })
      }
      if (!(await checkPassword(ADMIN_NAME, adminPassword))) {
        return NextResponse.json({ error: '관리자 비밀번호가 틀렸어요.' }, { status: 401 })
      }
      const tempPassword = String(randomInt(100000, 1000000))
      const { data, error } = await supabase
        .from('users').update({ password: tempPassword }).eq('name', targetName).select('name')
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      if (!data?.length) return NextResponse.json({ error: '해당 사용자가 없어요.' }, { status: 404 })
      return NextResponse.json({ tempPassword })
    }

    return NextResponse.json({ error: '알 수 없는 요청이에요.' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
