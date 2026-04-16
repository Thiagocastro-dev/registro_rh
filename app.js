// ==========================================
// CONFIGURAÇÃO DE SEGURANÇA E REDE
// ==========================================
const PALAVRA_CHAVE_SUPERVISOR = "rafao123";

// Caminho relativo! Funciona em localhost, no telemóvel, ou no Ngrok sem mexer no código.
const API_URL = " https://vision-afraid-chloride.ngrok-free.dev/api"; 

// ==========================================
// Regras de Negócio e Classes
// ==========================================
class Empregado {
    constructor(nome) {
        this.nome = nome;
        this.datasTrabalhadas = new Set();
    }

    registrarDia(data) {
        if (this.datasTrabalhadas.has(data)) return false;
        this.datasTrabalhadas.add(data);
        return true;
    }

    obterTotalDias() {
        return this.datasTrabalhadas.size;
    }
}

class GerenciadorRH {
    constructor() {
        this.empregados = {};
        this.carregarDados();
    }

    // --- COMUNICAÇÃO COM O SERVIDOR (BACKEND) ---
    async carregarDados() {
        try {
            const resposta = await fetch(`${API_URL}/dados`);
            if (!resposta.ok) throw new Error("Falha na ligação ao servidor");
            
            const dadosConvertidos = await resposta.json();
            
            this.empregados = {};
            for (const nome in dadosConvertidos) {
                const novoEmpregado = new Empregado(nome);
                const datas = dadosConvertidos[nome];
                datas.forEach(data => novoEmpregado.registrarDia(data));
                this.empregados[nome] = novoEmpregado;
            }
            atualizarInterface();
        } catch (erro) {
            console.error("Erro ao carregar dados:", erro);
            mostrarMensagem(false, "Erro: Não foi possível ligar à base de dados central.");
        }
    }

    async salvarDados() {
        const dadosParaSalvar = {};
        for (const nome in this.empregados) {
            dadosParaSalvar[nome] = Array.from(this.empregados[nome].datasTrabalhadas);
        }
        
        try {
            await fetch(`${API_URL}/sincronizar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadosParaSalvar)
            });
        } catch (erro) {
            console.error("Erro ao sincronizar dados:", erro);
            mostrarMensagem(false, "Aviso: Servidor offline. Dados não guardados.");
        }
    }

    formatarNome(nome) {
        return nome.trim().toLowerCase().replace(/(?:^|\s)\S/g, (letra) => letra.toUpperCase());
    }

    cadastrarEmpregado(nome) {
        if (!nome.trim()) return { sucesso: false, texto: "Erro: Informe um nome válido." };
        const nomeF = this.formatarNome(nome);
        if (this.empregados[nomeF]) return { sucesso: false, texto: `Aviso: '${nomeF}' já existe no sistema.` };
        
        this.empregados[nomeF] = new Empregado(nomeF);
        this.salvarDados();
        return { sucesso: true, texto: `Sucesso: '${nomeF}' cadastrado(a)!` };
    }

    adicionarDia(nome, data) {
        if (!nome.trim()) return { sucesso: false, texto: "Erro: Informe o nome." };
        if (!data) return { sucesso: false, texto: "Erro: Selecione uma data." };

        const nomeF = this.formatarNome(nome);
        if (this.empregados[nomeF]) {
            const adicionado = this.empregados[nomeF].registrarDia(data);
            const dataBR = data.split('-').reverse().join('/');

            if (adicionado) {
                this.salvarDados();
                return { sucesso: true, texto: `Sucesso: Dia ${dataBR} registado para '${nomeF}'.` };
            } else {
                return { sucesso: false, texto: `Aviso: A data ${dataBR} já estava registada.` };
            }
        }
        return { sucesso: false, texto: `Erro: Funcionário(a) '${nomeF}' não encontrado(a).` };
    }

    zerarDias(nome) {
        const nomeF = this.formatarNome(nome);
        if (this.empregados[nomeF]) {
            this.empregados[nomeF].datasTrabalhadas.clear(); 
            this.salvarDados();
            return { sucesso: true, texto: `Sucesso: Dias de '${nomeF}' foram zerados.` };
        }
        return { sucesso: false, texto: `Erro: Funcionário(a) '${nomeF}' não encontrado.` };
    }

    removerDia(nome, data) {
        const nomeF = this.formatarNome(nome);
        if (this.empregados[nomeF]) {
            const removido = this.empregados[nomeF].datasTrabalhadas.delete(data); 
            if (removido) {
                this.salvarDados();
                const dataBR = data.split('-').reverse().join('/');
                return { sucesso: true, texto: `Sucesso: O dia ${dataBR} foi removido de '${nomeF}'.` };
            }
            return { sucesso: false, texto: `Aviso: O funcionário não possui registo nessa data.` };
        }
        return { sucesso: false, texto: `Erro: Funcionário(a) '${nomeF}' não encontrado.` };
    }

    excluirEmpregado(nome) {
        const nomeF = this.formatarNome(nome);
        if (this.empregados[nomeF]) {
            delete this.empregados[nomeF];
            this.salvarDados();
            return { sucesso: true, texto: `Sucesso: Funcionário(a) '${nomeF}' foi excluído(a) do sistema.` };
        }
        return { sucesso: false, texto: `Erro: Funcionário(a) '${nomeF}' não encontrado.` };
    }

    limparTodosOsDados() {
        this.empregados = {};
        this.salvarDados();
        return { sucesso: true, texto: `Sucesso: Toda a base de dados foi limpa.` };
    }

    obterLista() {
        return Object.values(this.empregados);
    }

    obterFuncionariosNaData(data) {
        const listaNomes = [];
        for (const nome in this.empregados) {
            if (this.empregados[nome].datasTrabalhadas.has(data)) {
                listaNomes.push(this.empregados[nome].nome);
            }
        }
        return listaNomes;
    }
}

// ==========================================
// Interação com a Interface (DOM)
// ==========================================
const empresa = new GerenciadorRH();

const inputNome = document.getElementById("nomeEmpregado");
const inputData = document.getElementById("dataTrabalho");
const btnCadastrar = document.getElementById("btnCadastrar");
const btnAdicionarDia = document.getElementById("btnAdicionarDia");
const divMensagem = document.getElementById("mensagem");
const tabelaRelatorio = document.getElementById("tabelaRelatorio");

const inputNomeSup = document.getElementById("nomeSupervisor");
const inputDataSup = document.getElementById("dataRemover");
const inputSenhaSup = document.getElementById("senhaSupervisor");
const btnZerar = document.getElementById("btnZerar");
const btnRemoverDia = document.getElementById("btnRemoverDia");
const btnExcluirFunc = document.getElementById("btnExcluirFunc");
const btnLimparTudo = document.getElementById("btnLimparTudo");

const calendarioGrid = document.getElementById("calendarioGrid");
const mesAnoAtual = document.getElementById("mesAnoAtual");
const detalhesCalendario = document.getElementById("detalhesCalendario");
const btnMesAnterior = document.getElementById("btnMesAnterior");
const btnMesProximo = document.getElementById("btnMesProximo");

let dataControleCalendario = new Date();

function mostrarMensagem(sucesso, texto) {
    divMensagem.textContent = texto;
    divMensagem.style.display = "block";
    divMensagem.className = sucesso ? "sucesso" : "erro";
    setTimeout(() => divMensagem.style.display = "none", 4000);
}

function atualizarInterface() {
    tabelaRelatorio.innerHTML = ""; 
    const lista = empresa.obterLista();
    if (lista.length === 0) {
        tabelaRelatorio.innerHTML = "<tr><td colspan='2' style='text-align: center;'>Nenhum funcionário cadastrado.</td></tr>";
    } else {
        lista.forEach(emp => {
            const tr = document.createElement("tr");
            tr.innerHTML = `<td>${emp.nome}</td><td>${emp.obterTotalDias()} dia(s)</td>`;
            tabelaRelatorio.appendChild(tr);
        });
    }

    desenharCalendario();
    detalhesCalendario.innerHTML = "<p>Selecione um dia marcado para ver quem trabalhou.</p>";
}

// ==========================================
// MOTOR DO CALENDÁRIO
// ==========================================
function desenharCalendario() {
    calendarioGrid.innerHTML = "";
    
    const mes = dataControleCalendario.getMonth();
    const ano = dataControleCalendario.getFullYear();
    
    const mesesNomes = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    mesAnoAtual.textContent = `${mesesNomes[mes]} ${ano}`;

    const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    diasSemana.forEach(dia => {
        const div = document.createElement("div");
        div.className = "dia-semana";
        div.textContent = dia;
        calendarioGrid.appendChild(div);
    });

    const primeiroDiaDoMes = new Date(ano, mes, 1).getDay(); 
    const totalDiasNoMes = new Date(ano, mes + 1, 0).getDate();

    for (let i = 0; i < primeiroDiaDoMes; i++) {
        const div = document.createElement("div");
        div.className = "dia vazio";
        calendarioGrid.appendChild(div);
    }

    for (let dia = 1; dia <= totalDiasNoMes; dia++) {
        const div = document.createElement("div");
        div.className = "dia";
        div.textContent = dia;

        const dataStr = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        const trabalhadores = empresa.obterFuncionariosNaData(dataStr);
        
        if (trabalhadores.length > 0) {
            div.classList.add("marcado");
            div.title = `${trabalhadores.length} funcionário(s) trabalharam hoje.`;
        }

        div.addEventListener("click", () => {
            if (trabalhadores.length > 0) {
                const dataBR = dataStr.split('-').reverse().join('/');
                let htmlDetalhe = `<strong>Equipa do dia ${dataBR}:</strong><ul>`;
                trabalhadores.forEach(nome => {
                    htmlDetalhe += `<li>${nome}</li>`;
                });
                htmlDetalhe += "</ul>";
                detalhesCalendario.innerHTML = htmlDetalhe;
            } else {
                detalhesCalendario.innerHTML = `<p>Nenhum registo para o dia ${dia}.</p>`;
            }
        });

        calendarioGrid.appendChild(div);
    }
}

btnMesAnterior.addEventListener("click", () => {
    dataControleCalendario.setMonth(dataControleCalendario.getMonth() - 1);
    desenharCalendario();
});

btnMesProximo.addEventListener("click", () => {
    dataControleCalendario.setMonth(dataControleCalendario.getMonth() + 1);
    desenharCalendario();
});

// ==========================================
// EVENTOS DOS BOTÕES
// ==========================================
btnCadastrar.addEventListener("click", () => {
    const res = empresa.cadastrarEmpregado(inputNome.value);
    mostrarMensagem(res.sucesso, res.texto);
    if (res.sucesso) { inputNome.value = ""; atualizarInterface(); }
});

btnAdicionarDia.addEventListener("click", () => {
    const res = empresa.adicionarDia(inputNome.value, inputData.value);
    mostrarMensagem(res.sucesso, res.texto);
    if (res.sucesso) { inputData.value = ""; atualizarInterface(); }
});

function verificarSenha() {
    if (inputSenhaSup.value !== PALAVRA_CHAVE_SUPERVISOR) {
        inputSenhaSup.value = "";
        mostrarMensagem(false, "Acesso Negado: Palavra-chave incorreta.");
        return false;
    }
    return true;
}

btnZerar.addEventListener("click", () => {
    if (!inputNomeSup.value.trim()) return mostrarMensagem(false, "Erro: Informe o nome.");
    if (!verificarSenha()) return;

    if(confirm(`Zerar os dias de ${inputNomeSup.value}?`)) {
        const res = empresa.zerarDias(inputNomeSup.value);
        mostrarMensagem(res.sucesso, res.texto);
        if (res.sucesso) { 
            inputNomeSup.value = ""; inputDataSup.value = ""; inputSenhaSup.value = ""; 
            atualizarInterface(); 
        }
    }
});

btnRemoverDia.addEventListener("click", () => {
    if (!inputNomeSup.value.trim() || !inputDataSup.value) return mostrarMensagem(false, "Erro: Informe o nome e a data.");
    if (!verificarSenha()) return;

    const res = empresa.removerDia(inputNomeSup.value, inputDataSup.value);
    mostrarMensagem(res.sucesso, res.texto);
    if (res.sucesso) { inputDataSup.value = ""; inputSenhaSup.value = ""; atualizarInterface(); } 
});

btnExcluirFunc.addEventListener("click", () => {
    if (!inputNomeSup.value.trim()) return mostrarMensagem(false, "Erro: Informe o nome do funcionário para excluir.");
    if (!verificarSenha()) return;

    if(confirm(`ATENÇÃO: Deseja realmente EXCLUIR o(a) funcionário(a) '${inputNomeSup.value}' e todo o seu histórico?`)) {
        const res = empresa.excluirEmpregado(inputNomeSup.value);
        mostrarMensagem(res.sucesso, res.texto);
        if (res.sucesso) { 
            inputNomeSup.value = ""; inputDataSup.value = ""; inputSenhaSup.value = ""; 
            atualizarInterface(); 
        }
    }
});

btnLimparTudo.addEventListener("click", () => {
    if (!verificarSenha()) return;

    if(confirm(`ATENÇÃO EXTREMA: Deseja apagar TODOS os funcionários e todo o histórico do sistema? Esta ação NÃO pode ser desfeita.`)) {
        const res = empresa.limparTodosOsDados();
        mostrarMensagem(res.sucesso, res.texto);
        if (res.sucesso) { 
            inputNomeSup.value = ""; inputDataSup.value = ""; inputSenhaSup.value = ""; 
            atualizarInterface(); 
        }
    }
});
