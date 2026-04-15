import db from './src/database/index.js';

const seedDatabase = async () => {
  try {
    console.log('🌱 Iniciando seed do banco...');

    // Inserir cidades
    const cidades = await db('piv.cidade').insert([
      { id: '550e8400-e29b-41d4-a716-446655440100', nome: 'São Paulo', uf: 'SP' },
      { id: '550e8400-e29b-41d4-a716-446655440101', nome: 'Campinas', uf: 'SP' },
      { id: '550e8400-e29b-41d4-a716-446655440102', nome: 'Santos', uf: 'SP' },
      { id: '550e8400-e29b-41d4-a716-446655440103', nome: 'Sorocaba', uf: 'SP' },
      { id: '550e8400-e29b-41d4-a716-446655440104', nome: 'Rio de Janeiro', uf: 'RJ' },
      { id: '550e8400-e29b-41d4-a716-446655440105', nome: 'Niterói', uf: 'RJ' },
      { id: '550e8400-e29b-41d4-a716-446655440106', nome: 'Duque de Caxias', uf: 'RJ' },
      { id: '550e8400-e29b-41d4-a716-446655440107', nome: 'Belo Horizonte', uf: 'MG' },
      { id: '550e8400-e29b-41d4-a716-446655440108', nome: 'Uberlândia', uf: 'MG' },
      { id: '550e8400-e29b-41d4-a716-446655440109', nome: 'Contagem', uf: 'MG' },
      { id: '550e8400-e29b-41d4-a716-446655440110', nome: 'Porto Alegre', uf: 'RS' },
      { id: '550e8400-e29b-41d4-a716-446655440111', nome: 'Caxias do Sul', uf: 'RS' },
      { id: '550e8400-e29b-41d4-a716-446655440112', nome: 'Pelotas', uf: 'RS' },
      { id: '550e8400-e29b-41d4-a716-446655440113', nome: 'Salvador', uf: 'BA' },
      { id: '550e8400-e29b-41d4-a716-446655440114', nome: 'Feira de Santana', uf: 'BA' },
      { id: '550e8400-e29b-41d4-a716-446655440115', nome: 'Vitória da Conquista', uf: 'BA' },
    ]).onConflict('id').merge();
    console.log('✅ Cidades inseridas');

    // Inserir faculdades
    const faculdades = await db('piv.faculdade').insert([
      {
        id: '550e8400-e29b-41d4-a716-446655440010',
        nome: 'Faculdade de Tecnologia',
        cidade_id: '550e8400-e29b-41d4-a716-446655440100',
        logradouro: 'Rua da Tecnologia',
        numero: '100',
        bairro: 'Centro',
        cep: '01310-100',
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440011',
        nome: 'Faculdade de Engenharia',
        cidade_id: '550e8400-e29b-41d4-a716-446655440100',
        logradouro: 'Rua da Engenharia',
        numero: '200',
        bairro: 'Vila Mariana',
        cep: '01325-100',
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440012',
        nome: 'Faculdade de Ciências Exatas',
        cidade_id: '550e8400-e29b-41d4-a716-446655440100',
        logradouro: 'Rua das Ciências',
        numero: '300',
        bairro: 'Itaim Bibi',
        cep: '01310-200',
      },
    ]).onConflict('id').merge();
    console.log('✅ Faculdades inseridas');

    // Inserir departamento (necessário para criar cursos)
    const departamentos = await db('piv.departamento').insert([
      {
        id: '550e8400-e29b-41d4-a716-446655440020',
        codigo: 'DEPT-001',
        nome: 'Departamento de Tecnologia',
        faculdade_id: '550e8400-e29b-41d4-a716-446655440010',
      },
    ]).onConflict('id').merge();
    console.log('✅ Departamentos inseridos');

    // Inserir cursos
    const cursos = await db('piv.curso').insert([
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        codigo: 'EC001',
        nome: 'Engenharia da Computação',
        departamento_id: '550e8400-e29b-41d4-a716-446655440020',
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        codigo: 'SI001',
        nome: 'Sistemas de Informação',
        departamento_id: '550e8400-e29b-41d4-a716-446655440020',
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440003',
        codigo: 'CC001',
        nome: 'Ciência da Computação',
        departamento_id: '550e8400-e29b-41d4-a716-446655440020',
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440004',
        codigo: 'ES001',
        nome: 'Engenharia de Software',
        departamento_id: '550e8400-e29b-41d4-a716-446655440020',
      },
    ]).onConflict('id').merge();
    console.log('✅ Cursos inseridos');

    console.log('🎉 Seed concluído com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro durante seed:', error);
    process.exit(1);
  }
};

seedDatabase();
