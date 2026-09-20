interface TarefaDeEmail {
    rotulo: string;
    executar: () => Promise<void>;
    aoFalhar?: (erro: unknown) => Promise<void> | void;
}

export class FilaDeEmails {
    private fila: TarefaDeEmail[] = [];
    private processando: Promise<void> | null = null;

    get pendentes(): number {
        return this.fila.length;
    }

    enfileirar(tarefa: TarefaDeEmail): void {
        this.fila.push(tarefa);

        if (!this.processando) {
            this.processando = this.processar().finally(() => {
                this.processando = null;
            });
        }
    }

    async aguardarOcioso(): Promise<void> {
        while (this.processando) {
            await this.processando;
        }
    }

    private async processar(): Promise<void> {
        while (this.fila.length > 0) {
            const tarefa = this.fila.shift()!;
            const inicio = Date.now();

            try {
                await tarefa.executar();
                console.log(`[email] ${tarefa.rotulo} enviado em ${Date.now() - inicio}ms`);
            } catch (erro) {
                console.error(`[email] ${tarefa.rotulo} falhou:`, erro);

                try {
                    await tarefa.aoFalhar?.(erro);
                } catch (falhaNoTratamento) {
                    console.error(`[email] tratamento de falha de ${tarefa.rotulo} quebrou:`, falhaNoTratamento);
                }
            }
        }
    }
}

export const filaDeEmails = new FilaDeEmails();
