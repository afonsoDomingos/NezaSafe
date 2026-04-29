require('dotenv').config();
const mongoose = require('mongoose');

const riskSchema = new mongoose.Schema({
    id: String,
    name: String,
    description: String,
    level: String,
    status: String,
    date: Date
});

const Risk = mongoose.models.Risk || mongoose.model('Risk', riskSchema);

const seedData = [
    {
        id: 'RSK-101',
        name: 'Ataque de Força Bruta (RDP)',
        description: 'Múltiplas tentativas de login no servidor Windows (IP 192.168.1.15) via porta 3389 originadas de uma botnet conhecida. O firewall já realizou o bloqueio temporário do IP de origem.',
        level: 'alto',
        status: 'ativo',
        date: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
    },
    {
        id: 'RSK-102',
        name: 'Vazamento de Credenciais AWS',
        description: 'Identificada chave de acesso AWS-IAM em repositório público do GitHub pela ferramenta de varredura automatizada. Chave requer revogação imediata e auditoria de logs no CloudTrail.',
        level: 'alto',
        status: 'ativo',
        date: new Date(Date.now() - 7200000).toISOString() // 2 hours ago
    },
    {
        id: 'RSK-103',
        name: 'Tentativa de SQL Injection',
        description: 'Picos de anomalia no WAF detectando comandos UNION SELECT nos inputs de autenticação da aplicação principal (muv.co.mz). O payload foi bloqueado pela Cloudflare.',
        level: 'medio',
        status: 'resolvido',
        date: new Date(Date.now() - 86400000).toISOString() // 1 day ago
    },
    {
        id: 'RSK-104',
        name: 'Software Desatualizado (CVE-2023-44487)',
        description: 'Servidores Nginx internos operando em versões vulneráveis a ataques HTTP/2 Rapid Reset. É necessária a aplicação do patch emergencial aprovado pelo comitê.',
        level: 'baixo',
        status: 'ativo',
        date: new Date(Date.now() - 172800000).toISOString() // 2 days ago
    },
    {
        id: 'RSK-105',
        name: 'Exfiltração de Dados (Anomalia de Tráfego)',
        description: 'Upload massivo de 50GB de dados para IP desconhecido detectado pela madrugada a partir da máquina virtual do departamento financeiro.',
        level: 'alto',
        status: 'ativo',
        date: new Date(Date.now() - 1000000).toISOString() // Recent
    }
];

async function seedDB() {
    try {
        console.log('Conectando ao MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Limpando dados antigos...');
        await Risk.deleteMany({});
        console.log('Inserindo novos riscos reais...');
        await Risk.insertMany(seedData);
        console.log('Banco de dados semeado com sucesso!');
        process.exit(0);
    } catch (err) {
        console.error('Erro ao semear banco de dados:', err);
        process.exit(1);
    }
}

seedDB();
