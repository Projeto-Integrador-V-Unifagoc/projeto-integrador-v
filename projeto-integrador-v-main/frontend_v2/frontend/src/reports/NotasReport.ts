import { previewPdf } from './ReportPreview'

type Nota = {
  aluno: string
  disciplina: string
  nota: string
  situacao: string
}

const notas: Nota[] = [
  { aluno: 'João Silva', disciplina: 'Matemática', nota: '8,5', situacao: 'Aprovado' },
  { aluno: 'Maria Oliveira', disciplina: 'Português', nota: '9,0', situacao: 'Aprovado' },
  { aluno: 'Pedro Santos', disciplina: 'História', nota: '7,0', situacao: 'Aprovado' },
  { aluno: 'Ana Costa', disciplina: 'Geografia', nota: '8,0', situacao: 'Aprovado' },
  { aluno: 'Lucas Ferreira', disciplina: 'Ciências', nota: '6,5', situacao: 'Recuperação' }
]

export function emitirRelatorioNotas() {
  const doc = new window.jspdf.jsPDF()

  doc.setFontSize(18)
  doc.text('RELATÓRIO DE NOTAS', 105, 20, { align: 'center' })

  doc.setFontSize(12)
  doc.text('Univercidade: Exemplo de Academico', 20, 35)
  doc.text(`Data de Emissão: ${new Date().toLocaleDateString('pt-BR')}`, 20, 45)

  doc.autoTable({
    startY: 55,
    head: [[
      'Aluno',
      'Disciplina',
      'Nota',
      'Situação'
    ]],
    body: notas.map(item => [item.aluno, item.disciplina, item.nota, item.situacao]),
    theme: 'grid',
    headStyles: { fillColor: [0, 123, 255], textColor: 255 },
    styles: { fontSize: 10 },
    columnStyles: {
      2: { halign: 'center' },
      3: { halign: 'center' }
    }
  })

  const finalY = doc.lastAutoTable?.finalY ?? 70
  doc.setFontSize(10)
  doc.text('Relatório gerado automaticamente para fins de teste.', 20, finalY + 10)

  previewPdf(doc)
}
