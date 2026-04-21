import { previewPdf } from './ReportPreview'

type Historico = {
  aluno: string
  ano: string
  disciplina: string
  notaFinal: string
  status: string
}

const historico: Historico[] = [
  { aluno: 'João Silva', ano: '2025', disciplina: 'Matemática', notaFinal: '8,5', status: 'Aprovado' },
  { aluno: 'João Silva', ano: '2025', disciplina: 'Português', notaFinal: '9,0', status: 'Aprovado' },
  { aluno: 'Maria Oliveira', ano: '2025', disciplina: 'História', notaFinal: '8,0', status: 'Aprovado' },
  { aluno: 'Pedro Santos', ano: '2024', disciplina: 'Ciências', notaFinal: '7,0', status: 'Aprovado' },
  { aluno: 'Lucas Ferreira', ano: '2024', disciplina: 'Educação Física', notaFinal: '9,5', status: 'Aprovado' }
]

export function emitirHistoricoEscolar() {
  const doc = new window.jspdf.jsPDF()

  doc.setFontSize(18)
  doc.text('HISTÓRICO ESCOLAR', 105, 20, { align: 'center' })

  doc.setFontSize(12)
  doc.text('Univercidade: Exemplo de Academico', 20, 35)
  doc.text(`Data de Emissão: ${new Date().toLocaleDateString('pt-BR')}`, 20, 45)

  doc.autoTable({
    startY: 55,
    head: [[
      'Aluno',
      'Ano',
      'Disciplina',
      'Nota Final',
      'Status'
    ]],
    body: historico.map(item => [item.aluno, item.ano, item.disciplina, item.notaFinal, item.status]),
    theme: 'grid',
    headStyles: { fillColor: [0, 123, 255], textColor: 255 },
    styles: { fontSize: 10 },
    columnStyles: {
      1: { halign: 'center' },
      3: { halign: 'center' },
      4: { halign: 'center' }
    }
  })

  const finalY = doc.lastAutoTable?.finalY ?? 70
  doc.setFontSize(10)
  doc.text('Relatório gerado automaticamente para fins de teste.', 20, finalY + 10)

  previewPdf(doc)
}
