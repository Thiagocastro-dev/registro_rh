const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const porta = 3000;

// Configurações
app.use(cors()); // Permite que o Frontend comunique com este servidor
app.use(express.json()); // Permite ler os dados em formato JSON

// Inicialização da Base de Dados SQLite
const db = new sqlite3.Database('./banco_rh.sqlite', (err) => {
    if (err) console.error("Erro ao abrir a base de dados:", err.message);
    else console.log("Ligado à base de dados SQLite local.");
});

// Criar tabelas se não existirem
db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS empregados (nome TEXT PRIMARY KEY)");
    db.run("CREATE TABLE IF NOT EXISTS registos (nome TEXT, data TEXT, FOREIGN KEY(nome) REFERENCES empregados(nome) ON DELETE CASCADE)");
});

// Rota GET: Envia os dados para o Frontend carregar o calendário e relatórios
app.get('/api/dados', (req, res) => {
    const dadosConvertidos = {};
    
    db.all("SELECT * FROM empregados", [], (err, empregados) => {
        if (err) return res.status(500).json({ erro: err.message });
        
        db.all("SELECT * FROM registos", [], (err, registos) => {
            if (err) return res.status(500).json({ erro: err.message });
            
            // Reconstrói a estrutura de objecto que o Frontend espera
            empregados.forEach(emp => dadosConvertidos[emp.nome] = []);
            registos.forEach(reg => {
                if (dadosConvertidos[reg.nome]) {
                    dadosConvertidos[reg.nome].push(reg.data);
                }
            });
            res.json(dadosConvertidos);
        });
    });
});

// Rota POST: Recebe o estado atualizado do Frontend e guarda na base de dados
app.post('/api/sincronizar', (req, res) => {
    const dados = req.body;
    
    db.serialize(() => {
        // Limpa as tabelas e insere o novo estado (sincronização total)
        db.run("DELETE FROM empregados");
        db.run("DELETE FROM registos");
        
        const stmtEmp = db.prepare("INSERT INTO empregados (nome) VALUES (?)");
        const stmtReg = db.prepare("INSERT INTO registos (nome, data) VALUES (?, ?)");
        
        for (const nome in dados) {
            stmtEmp.run(nome);
            dados[nome].forEach(data => stmtReg.run(nome, data));
        }
        
        stmtEmp.finalize();
        stmtReg.finalize();
        res.json({ sucesso: true, mensagem: "Base de dados atualizada com sucesso." });
    });
});

app.listen(porta, () => {
    console.log(`Servidor a correr em http://localhost:${porta}`);
});