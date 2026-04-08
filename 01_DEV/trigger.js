// trigger.js — LinkedIn Prospector — Motor de Aceleração Dev v1.0

const fs = require('fs');
const path = require('path');

function dispararTrigger(tarefa) {
    const logPath = path.join(__dirname, 'tasks.log');
    const time = new Date().toLocaleString();
    
    // 1️⃣ REGISTRO IMEDIATO NO LOG
    const logEntry = `${time} - [TRIGGER DEV] - Ativado por Samuel Betim. Iniciando tarefa: ${tarefa.desc} (Prioridade: ${tarefa.prio})\n`;
    fs.appendFileSync(logPath, logEntry);

    console.log(`🏛️ LP TRIGGER DEV: Ação detectada! Iniciando o motor para: ${tarefa.desc}`);

    // 2️⃣ EXECUÇÃO SIMULADA (O Agente Autônomo entra aqui)
    // No futuro, isso pode rodar um script bash, um git push ou um scraper.
    setTimeout(() => {
        const doneEntry = `${time} - [SUCCESS] - Tarefa "${tarefa.desc}" concluída via Trigger Dev.\n`;
        fs.appendFileSync(logPath, doneEntry);
        console.log(`✅ LP TRIGGER DEV: Missão cumprida com sucesso.`);
    }, 2000);
}

module.exports = { dispararTrigger };
