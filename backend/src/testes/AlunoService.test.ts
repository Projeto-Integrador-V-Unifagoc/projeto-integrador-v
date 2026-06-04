import {AlunoService} from '../Modules/modulo-gestao-alunos/service/AlunoService';

describe('AlunoService', () => {
    let alunoService: AlunoService;

    beforeEach(() => {
        alunoService = new AlunoService();
    });

    it("deve lançar um erro quando a consulta tiver menos de 3 caracteres", async () => {
        await expect(
            alunoService.buscarAlunoPorCpfOuMatricula("12")
        ).rejects.toThrow("Informe ao menos 3 caracteres.");
    });

    it("deve atualizar um aluno existente", async () => {

        const alunoMock = {
            matricula: "1234567",
        }

        jest.spyOn(alunoService.alunoRepository, 'buscarAlunoPorMatricula').mockResolvedValue(alunoMock as any);

        jest.spyOn(alunoService.alunoRepository, 'atualizarAluno').mockResolvedValue({
            sucesso: true,
        } as any);

        const resultado = await alunoService.atualizarAluno("1234567", { });

        expect(resultado).toEqual({ sucesso: true });
    });

    it("deve lançar um erro ao tentar atualizar um aluno que não existe", async () => {

        jest.spyOn(alunoService.alunoRepository, 'buscarAlunoPorMatricula').mockResolvedValue(null);

        await expect(
            alunoService.atualizarAluno("1111111", { })
        ).rejects.toThrow("Aluno não encontrado");

    });
});