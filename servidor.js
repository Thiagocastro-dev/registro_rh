const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const porta = 3000;

// Configurações base
app.use(cors());
app.use(express.json());

// ==========================================
// SERVIR A INTERFACE WEB (FRONTEND)
// ==========================================
// Diz ao Express que os ficheiros CSS, JS e imagens na pasta atual são públicos
app.use(express.static(path.join(__dirname)));

// Rota para a raiz ("/") entregar o ficheiro HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ==========================================
// API DE DADOS E BASE DE DADOS (BACKEND)
// ==========================================
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

// Rota GET: Envia os dados para a interface web
app.get('/api/dados', (req, res) => {
    const dadosConvertidos = {};
    
    db.all("SELECT * FROM empregados", [], (err, empregados) => {
        if (err) return res.status(500).json({ erro: err.message });
        
        db.all("SELECT * FROM registos", [], (err, registos) => {
            if (err) return res.status(500).json({ erro: err.message });
            
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

// Rota POST: Recebe o estado atualizado e guarda na base de dados
app.post('/api/sincronizar', (req, res) => {
    const dados = req.body;
    
    db.serialize(() => {
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
    console.log(`\n✅ Servidor a correr! Aceda à interface em: http://localhost:${porta}\n`);
});