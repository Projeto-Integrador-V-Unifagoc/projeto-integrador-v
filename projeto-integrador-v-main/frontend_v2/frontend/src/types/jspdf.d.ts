declare module 'jspdf' {
  export class jsPDF {
    constructor(options?: unknown)
    setFontSize(size: number): void
    text(text: string, x: number, y: number, options?: unknown): void
    save(filename: string): void
    lastAutoTable?: {
      finalY?: number
      [key: string]: unknown
    }
    [key: string]: unknown
  }
}

declare module 'jspdf-autotable' {
  import { jsPDF } from 'jspdf'

  export interface AutoTableOptions {
    startY?: number
    head?: unknown[]
    body?: unknown[]
    theme?: string
    headStyles?: Record<string, unknown>
    styles?: Record<string, unknown>
    columnStyles?: Record<string, unknown>
    [key: string]: unknown
  }

  export default function autoTable(doc: jsPDF, options: AutoTableOptions): void
}

declare global {
  interface Window {
    jspdf: {
      jsPDF: new (options?: unknown) => JsPDFInstance
    }
  }

  interface JsPDFInstance {
    setFontSize(size: number): void
    text(text: string, x: number, y: number, options?: unknown): void
    save(filename: string): void
    output(type: string): string
    autoTable(options: Record<string, unknown>): void
    lastAutoTable?: {
      finalY?: number
      [key: string]: unknown
    }
    [key: string]: unknown
  }
}
