import { Card } from '../../components/Card/index'
import TextField from '../../components/TextField'
import Button from '../../components/Button'
import DropDownCursos from '../../components/DropDownCursos/DropDownCursos'
import { Cursos } from '../../enums/cursos'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Cadastro(){    

    const pgProfessor = useNavigate();

    const [nomeProfessor, setNomePressor] = useState<string>('')
    const [curso, setCurso] = useState<Cursos | ''>('')

    function gravarAlteracoes(){
        
        if (nomeProfessor == '' || curso == ''){
           alert('não pode gravar') 
        }else{
            alert('gravou')
        }
        
    }

    function cancelarCadastro(){
        
        alert('cancelou')

        pgProfessor('/professores/lista')

    }

    return(
        <Card.Root>
            <Card.Header>Cadatro de Professor</Card.Header>            
            <Card.Content>
                
                
                <div style={{ display: 'flex', flexDirection: 'column' , justifyContent: 'space-around'}}>

                    {/* Dados iniciais */}
                     <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between'}}>
                        <Card.Title>Nome: </Card.Title><TextField value={nomeProfessor} onChange={(e) => setNomePressor(e.target.value)}></TextField>                        
                        <Card.Title>Cpf: </Card.Title><DropDownCursos value={curso} onChange={setCurso} ></DropDownCursos>
                        <Card.Title>Data de Nascimento: </Card.Title><DropDownCursos value={curso} onChange={setCurso} ></DropDownCursos>                        
                    </div>

                    {/* Dados de acesso */}
                    <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between'}}>
                        <Card.Title>Email: </Card.Title><TextField value={nomeProfessor} onChange={(e) => setNomePressor(e.target.value)}></TextField>                        
                        <Card.Title>Senha: </Card.Title><TextField value={nomeProfessor} onChange={(e) => setNomePressor(e.target.value)}></TextField>                        
                    </div>
                    
                    {/* Dados de instituição */}
                    <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between'}}>
                        <Card.Title>Curso: </Card.Title><DropDownCursos value={curso} onChange={setCurso} ></DropDownCursos>
                        <Card.Title>Faculdade: </Card.Title><DropDownCursos value={curso} onChange={setCurso} ></DropDownCursos>
                    </div>

                    {/* Dados de localização */}
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between'}}>
                       
                       {/* Iniciais */}
                        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between'}}>
                            <Card.Title>Logradouro: </Card.Title><TextField value={nomeProfessor} onChange={(e) => setNomePressor(e.target.value)}></TextField>                        
                            <Card.Title>Bairro: </Card.Title><TextField value={nomeProfessor} onChange={(e) => setNomePressor(e.target.value)}></TextField>                        

                            <div style={{ display: 'flex',flexDirection: 'row', justifyContent: 'space-between'}}>
                                <Card.Title>Estado: </Card.Title><DropDownCursos value={curso} onChange={setCurso} ></DropDownCursos>
                                <Card.Title>Número: </Card.Title><TextField value={nomeProfessor} onChange={(e) => setNomePressor(e.target.value)}></TextField>                        
                            </div>
                        </div>                       
                        
                        <div style={{ display: 'flex',flexDirection: 'row', justifyContent: 'space-between'}}>
                            <Card.Title>Cidade: </Card.Title><DropDownCursos value={curso} onChange={setCurso} ></DropDownCursos>
                            <Card.Title>CEP: </Card.Title><TextField value={nomeProfessor} onChange={(e) => setNomePressor(e.target.value)}></TextField>                        
                        </div>                                
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'end'}}>
                    <Button onClick={gravarAlteracoes}>Salvar</Button>
                    <Button onClick={cancelarCadastro}>Cancelar</Button>
                </div>
            </Card.Content>            
        </Card.Root>
    )
}