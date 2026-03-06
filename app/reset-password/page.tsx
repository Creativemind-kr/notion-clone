'use client'

import dynamic from 'next/dynamic'

const ResetPasswordForm = dynamic(() => import('@/components/ResetPasswordForm'), { ssr: false })

export default function ResetPasswordPage() {
  return <ResetPasswordForm />
}
