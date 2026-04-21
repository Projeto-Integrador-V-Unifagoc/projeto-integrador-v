import { previewPdf } from './ReportPreview'

type Falta = {
  aluno: string
  turma: string
  data: string
  qtd: number
  justificada: string
  obs: string
}

const faltas: Falta[] = [
  { aluno: 'João Silva', turma: '9º Ano A', data: '2026-04-01', qtd: 2, justificada: 'Não', obs: 'Sem justificativa' },
  { aluno: 'Maria Oliveira', turma: '9º Ano A', data: '2026-04-02', qtd: 1, justificada: 'Sim', obs: 'Atestado médico' },
  { aluno: 'Pedro Santos', turma: '8º Ano B', data: '2026-04-03', qtd: 3, justificada: 'Não', obs: '' },
  { aluno: 'Ana Costa', turma: '9º Ano A', data: '2026-04-05', qtd: 1, justificada: 'Sim', obs: 'Problema familiar' },
  { aluno: 'Lucas Ferreira', turma: '7º Ano C', data: '2026-04-06', qtd: 2, justificada: 'Não', obs: 'Falta injustificada' }
]

export function emitirRelatorioFrequencia() {
  const doc = new window.jspdf.jsPDF()

  doc.setFontSize(18)
  doc.text('RELATÓRIO DE FREQUÊNCIA', 105, 20, { align: 'center' })

  doc.setFontSize(12)
  doc.text('Univercidade: Exemplo de Academico', 20, 35)
  doc.text(`Data de Emissão: ${new Date().toLocaleDateString('pt-BR')}`, 20, 45)

  doc.autoTable({
    startY: 55,
    head: [[
      'Aluno',
      'Turma',
      'Data da Falta',
      'Quantidade',
      'Justificada?',
      'Observação'
    ]],
    body: faltas.map(f => [
      f.aluno,
      f.turma,
      f.data,
      f.qtd,
      f.justificada,
      f.obs || '-'
    ]),
    theme: 'grid',
    headStyles: { fillColor: [0, 123, 255], textColor: 255 },
    styles: { fontSize: 10 },
    columnStyles: {
      3: { halign: 'center' },
      4: { halign: 'center' }
    }
  })

  const finalY = doc.lastAutoTable?.finalY ?? 70
  doc.setFontSize(10)
  doc.text('Relatório gerado automaticamente para fins de teste.', 20, finalY + 10)

  previewPdf(doc)
}
