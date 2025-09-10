const WebSocket = require("ws");
const { v4: uuidv4 } = require("uuid"); // gera UUID único
const PORT = 10000;

const wss = new WebSocket.Server({ port: PORT });

// Lista global de jogadores
let players = {};

console.log(`🌍 Servidor rodando na porta ${PORT}`);

// Quando alguém se conecta
wss.on("connection", (ws) => {
  const playerId = uuidv4();
  players[playerId] = { uuid: playerId, x: 0, y: 0, z: 0 };

  console.log(`✅ Novo jogador conectado: ${playerId}`);

  // Envia confirmação + dados do mundo atual
  ws.send(JSON.stringify({
    cmd: "joined_server",
    content: {
      msg: "Bem-vindo ao servidor!",
      uuid: playerId,
      players: Object.values(players) // envia todos os jogadores já conectados
    }
  }));

  // Avisa os outros jogadores que um novo player entrou
  broadcast(ws, {
    cmd: "spawn_new_player",
    content: players[playerId]
  });

  // Quando o cliente manda dados (posição, chat, etc.)
  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg.toString());

      if (data.cmd === "update_position") {
        // Atualiza posição do jogador
        if (players[data.content.uuid]) {
          players[data.content.uuid].x = data.content.x;
          players[data.content.uuid].y = data.content.y;
          players[data.content.uuid].z = data.content.z;
        }

        // Repassa para os outros
        broadcast(ws, {
          cmd: "update_position",
          content: data.content
        });
      }

      if (data.cmd === "chat") {
        broadcast(ws, {
          cmd: "new_chat_message",
          content: { uuid: playerId, msg: data.content.msg }
        });
      }

    } catch (err) {
      console.error("❌ Erro ao processar mensagem:", err);
    }
  });

  // Quando o jogador sai
  ws.on("close", () => {
    console.log(`🚪 Jogador saiu: ${playerId}`);
    delete players[playerId];

    // Avisa os outros clientes
    broadcast(ws, {
      cmd: "player_disconnected",
      content: { uuid: playerId }
    });
  });
});

// Função para enviar mensagem para todos menos o próprio
function broadcast(sender, data) {
  wss.clients.forEach((client) => {
    if (client !== sender && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}