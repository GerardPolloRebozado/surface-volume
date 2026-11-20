import type { ReactNode } from 'react'

export function Page({
  children,
  maxWidth = 980,
}: {
  children: ReactNode
  maxWidth?: number
}) {
  return (
    <div
      className="mx-auto flex w-full flex-col gap-4 px-4 py-6 sm:px-6"
      style={{ maxWidth }}
    >
      {children}
    </div>
  )
}
