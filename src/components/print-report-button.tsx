'use client'

export function PrintReportButton({ label }: { label: string }) {
  return <button className="button" onClick={() => window.print()} type="button">{label}</button>
}
