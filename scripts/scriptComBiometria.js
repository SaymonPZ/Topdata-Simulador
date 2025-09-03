const display = document.getElementById("display");

let state = "idle";
let mainIndex = 0;
let subIndex = 0;
let inputBuffer = ""; // guarda números digitados
let editing = false; // esta no menu está editando um valor
const senhaCorreta = "1234"; // senha simulada

const menus = [
    { name: "Libera 30s", items: ["Liberar usuário (30s)"] },
    { name: "Biometria", items: ["Inclui usuário", "Testa usuário", "Exclui usuário", "Exclui identif", "Exclui todos"] },
    { name: "Testa Cartão", items: ["Passe/aproxime o cartão…"] },
    { name: "Informações", items: ["Exibir MAC", "Exibir Serial", "Contador de giros", "Versão firmware", "PCI Catraca", "Modelo Biometria"] },
    { name: "Rede", items: ["IP do Servidor", "DHCP", "IP do Inner", "Máscara", "Gateway", "Porta Servidor", "Número do Inner", "Login Web Server"] },
    { name: "Ajuste Relógio", items: ["Configurar Data", "Configurar Hora"] },
    { name: "Bloqueio Inner", items: ["Bloquear", "Desbloquear"] },
    { name: "Avançadas", items: ["Tipo Equipamento", "Modelo Catraca", "Urna", "Padrão Cartão", "Ajuste brilho", "Resgata Bilhetes"] },
];

const infoMock = {
    mac: "98:7A:DE:4C:12:9F",
    serial: "TD-4-2025-001234",
    firmware: "v4.0.3",
    pci: "PCI Catraca 1.12",
    bio: "LFD",
    girosH: 250,
    girosAH: 258,
};

// =========================
// Inicialização
// =========================
resetAll();

// =========================
// Exibição
// =========================
function setText(text) {
    display.textContent = text;
}
function showIdle() {
    inputBuffer = "";
    setText(`${formatarDataAtual()}\nPasse o cartão…`);
    state = "idle";
}
function showAskCombo() {
    setText("Aguardando usuário\nMaster");
    state = "awaitCombo";
}
function showMain() {
    setText("Menu Master:\n" + menus[mainIndex].name);
    state = "menu";
}
function showSub() {
    const m = menus[mainIndex];
    setText(m.name + ":\n" + m.items[subIndex]);
    state = "submenu";
}
function showInput(prompt, initial = "") {
    inputBuffer = initial;
    setText(prompt + "\n" + inputBuffer + "_");
}
function flashMessage(msg, backTo = "menu", ms = 1100) {
    setText(msg);
    setTimeout(() => {
        if (backTo === "menu") showMain();
        else if (backTo === "submenu") showSub();
        else showIdle();
    }, ms);
}

// =========================
// Formatação
// =========================
function formatarDataAtual() {
    const meses = ["jan", "fev", "mar", "abr", "mai", "jun",
        "jul", "ago", "set", "out", "nov", "dez"];

    const agora = new Date();
    const dia = agora.getDate();
    const mes = meses[agora.getMonth()];
    const ano = agora.getFullYear();

    const hh = String(agora.getHours()).padStart(2, "0");
    const mm = String(agora.getMinutes()).padStart(2, "0");
    const ss = String(agora.getSeconds()).padStart(2, "0");

    return `${dia} ${mes} ${ano} ${hh}:${mm}:${ss}`;
}
function formatIp(raw) {

    // Limita no máximo a 12 dígitos (4 blocos de até 3 números)
    raw = raw.slice(0, 12);

    // Divide em grupos de até 3
    let parts = raw.match(/.{1,3}/g) || [];

    // Junta com pontos
    return parts.join(".");
}

// =========================
// Entradas (cliques)
// =========================
function press(key) {
    switch (state) {
        // Tela inicial
        case "idle":
            if (!isNaN(key)) {
                inputBuffer += key;
                setText(`${formatarDataAtual()}\n${inputBuffer}_`);
            } else if (key === "OK" && inputBuffer.length > 0) {
                if (inputBuffer === senhaCorreta) {
                    flashMessage("ACESSO LIBERADO", "idle", 1500);
                } else if (inputBuffer === "0") {
                    state = "menu";
                    enterMenuCombo();
                }
                else {
                    flashMessage("SENHA INCORRETA", "idle", 1500);
                }
            } else if (key === "MENU") {
                showAskCombo();
            }
            break;

        // Aguardando combo F+1+9
        case "awaitCombo":
            if (key === "MENU") {
                showAskCombo();
            }
            registerManualCombo(key);
            break;

        // Navegação no menu principal
        case "menu":
            if (key === "LEFT") {
                mainIndex = (mainIndex - 1 + menus.length) % menus.length;
                showMain();
            } else if (key === "RIGHT") {
                mainIndex = (mainIndex + 1) % menus.length;
                showMain();
            } else if (key === "OK") {
                subIndex = 0;
                showSub();
            } else if (key === "ESC") {
                showIdle();
            }
            break;

        // Navegação nos submenus
        case "submenu":
            if (key === "LEFT") {
                const len = menus[mainIndex].items.length;
                subIndex = (subIndex - 1 + len) % len;
                showSub();
            } else if (key === "RIGHT") {
                const len = menus[mainIndex].items.length;
                subIndex = (subIndex + 1) % len;
                showSub();
            } else if (key === "OK") {
                executeAction();
            } else if (key === "ESC") {
                showMain();
            }
            break;

        // Entrada de dados (senha/IP/etc)

        case "IPdoServidor":
        case "IPdoInner":
            if (!isNaN(key)) {
                if (!editing) {
                    // Primeira tecla: apaga o valor inicial
                    inputBuffer = key;
                    editing = true;
                } else {
                    // Próximas teclas: vai adicionando
                    inputBuffer += key;
                }
                const ipFormatado = formatIp(inputBuffer);
                setText((state === "IPdoServidor" ? "IP do servidor:\n" : "IP do inner:\n") + ipFormatado + "_");
            } else if (key === "ESC") {
                showSub();
                editing = false;
            } else if (key === "OK") {
                const ipFormatado = formatIp(inputBuffer);
                flashMessage("Valor salvo: " + ipFormatado, "submenu", 1500);
                editing = false;
            }
            break;
    }
}

// =========================
// Ações simuladas
// =========================
function executeAction() {
    const menuName = menus[mainIndex].name;
    const item = menus[mainIndex].items[subIndex];

    if (menuName === "Libera 30s") {
        flashMessage("Usuário liberado por 30s");
        return;
    }
    if (menuName === "Testa Cartão") {
        flashMessage("Aproxime o cartão…\n(leitura simulada: 12345678)", "submenu", 1400);
        return;
    }
    if (menuName === "Informações") {
        switch (item) {
            case "Exibir MAC": flashMessage("MAC: " + infoMock.mac, "submenu"); return;
            case "Exibir Serial": flashMessage("Serial: " + infoMock.serial, "submenu"); return;
            case "Contador de giros": flashMessage(`H:${infoMock.girosH}  AH:${infoMock.girosAH}`, "submenu"); return;
            case "Versão firmware": flashMessage("FW: " + infoMock.firmware, "submenu"); return;
            case "PCI Catraca": flashMessage(infoMock.pci, "submenu"); return;
            case "Modelo Biometria": flashMessage("Biometria: " + infoMock.bio, "submenu"); return;
        }
    }
    if (menuName === "Rede") {
        switch (item) {
            case "IP do Servidor":
                showInput("IP do servidor:", "192.168.001.100");
                state = "IPdoServidor";
                return;
            case "IP do Inner":
                showInput("IP do inner:", "192.168.001.125");
                state = "IPdoInner";
                return;
            case "Máscara":
                showInput("Máscara de rede:");
                return;
            case "Gateway":
                showInput("Gateway:");
                return;
            case "Porta Servidor":
                showInput("Porta do servidor:");
                return;
        }

        // Se não for nenhum desses específicos
        flashMessage("Configuração: " + item + "\n(simulado)", "submenu", 1200);
        return;
    }
    if (menuName === "Ajuste Relógio") {
        flashMessage(item + "\n(dd/mm/aaaa ou hh:mm)\n(simulado)", "submenu", 1400);
        return;
    }
    if (menuName === "Bloqueio Inner") {
        flashMessage(item === "Bloquear" ? "Inner BLOQUEADO" : "Inner DESBLOQUEADO");
        return;
    }
    if (menuName === "Avançadas") {
        flashMessage(item + " (simulado)", "submenu");
        return;
    }
    flashMessage("Executando… " + item, "submenu");
}

// =========================
// Combo manual (F+1+9)
// =========================
let comboBuf = [];
let comboTimer = null;
function registerManualCombo(key) {
    if (!["F", "1", "9"].includes(key)) return;
    comboBuf.push(key);
    clearTimeout(comboTimer);
    comboTimer = setTimeout(() => { comboBuf = []; }, 800);

    if (comboBuf.join("") === "F19") {
        enterMenuCombo();
        comboBuf = [];
        clearTimeout(comboTimer);
    }
}

function enterMenuCombo() {
    if (state === "menu" || state === "awaitCombo") {
        mainIndex = 0;
        showMain();
    }
}
function resetAll() {
    mainIndex = 0;
    subIndex = 0;
    state = "idle";
    inputBuffer = "";
    setText(`${formatarDataAtual()}\nPasse o cartão…`);
    comboBuf = [];
    clearTimeout(comboTimer);
}
