import { previewPdf } from './ReportPreview'

type Aluno = {
  matricula: string
  nome: string
  turma: string
  email: string
  telefone: string
  status: string
}

const alunos: Aluno[] = [
  { matricula: '2026001', nome: 'João Silva', turma: '9º Ano A', email: 'joao.silva@escola.edu.br', telefone: '(11) 91234-5678', status: 'Ativo' },
  { matricula: '2026002', nome: 'Maria Oliveira', turma: '9º Ano A', email: 'maria.oliveira@escola.edu.br', telefone: '(11) 92345-6789', status: 'Ativo' },
  { matricula: '2026003', nome: 'Pedro Santos', turma: '8º Ano B', email: 'pedro.santos@escola.edu.br', telefone: '(11) 93456-7890', status: 'Ativo' },
  { matricula: '2026004', nome: 'Ana Costa', turma: '9º Ano A', email: 'ana.costa@escola.edu.br', telefone: '(11) 94567-8901', status: 'Ativo' },
  { matricula: '2026005', nome: 'Lucas Ferreira', turma: '7º Ano C', email: 'lucas.ferreira@escola.edu.br', telefone: '(11) 95678-9012', status: 'Ativo' }
]

export function emitirConsultaAluno() {
  const doc = new window.jspdf.jsPDF()

  doc.setFontSize(18)
  doc.text('CONSULTA DE ALUNOS', 105, 20, { align: 'center' })

  doc.setFontSize(12)
  doc.text('Univercidade: Exemplo de Academico', 20, 35)
  doc.text(`Data de Emissão: ${new Date().toLocaleDateString('pt-BR')}`, 20, 45)

  doc.autoTable({
    startY: 55,
    head: [[
      'Matrícula',
      'Nome',
      'Turma',
      'Email',
      'Telefone',
      'Status'
    ]],
    body: alunos.map(item => [item.matricula, item.nome, item.turma, item.email, item.telefone, item.status]),
    theme: 'grid',
    headStyles: { fillColor: [0, 123, 255], textColor: 255 },
    styles: { fontSize: 9 },
    columnStyles: {
      0: { halign: 'center' },
      5: { halign: 'center' }
    }
  })

  const finalY = doc.lastAutoTable?.finalY ?? 70
  doc.setFontSize(10)
  doc.text('Relatório gerado automaticamente para fins de teste.', 20, finalY + 10)

  previewPdf(doc)
}
