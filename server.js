// server.js
const WebSocket = require("ws");
const { v4: uuidv4 } = require("uuid");

const wss = new WebSocket.Server({ port: 8080 });

let players = {}; // { uuid: { uuid, x, y } }

wss.on("connection", (ws) => {
  const uuid = uuidv4();
  console.log(`✅ Novo jogador conectado: ${uuid}`);

  // Inicializa posição padrão (0,0 por exemplo)
  players[uuid] = { uuid: uuid, x: 0, y: 0 };

  // Envia para o jogador conectado: todos os outros que já estão no mundo
  ws.send(
    JSON.stringify({
      type: "spawn_network_players",
      players: Object.values(players),
    })
  );

  // Informa a todos os outros que este novo jogador entrou
  broadcast(
    {
      type: "spawn_new_player",
      player: players[uuid],
    },
    ws
  );

  // Cria o próprio player no cliente
  ws.send(
    JSON.stringify({
      type: "spawn_local_player",
      player: players[uuid],
    })
  );

  // Quando o cliente manda atualização de posição
  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === "update_position") {
        if (players[uuid]) {
          players[uuid].x = data.x;
          players[uuid].y = data.y;

          broadcast(
            {
              type: "update_position",
              uuid: uuid,
              x: data.x,
              y: data.y,
            },
            ws
          );
        }
      }
    } catch (e) {
      console.error("❌ Erro ao processar mensagem:", e);
    }
  });

  // Quando o cliente desconecta
  ws.on("close", () => {
    console.log(`👋 Jogador saiu: ${uuid}`);

    delete players[uuid];

    broadcast({
      type: "player_disconnected",
      uuid: uuid,
    });
  });
});

function broadcast(msg, exclude) {
  const data = JSON.stringify(msg);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client !== exclude) {
      client.send(data);
    }
  });
}

console.log("🚀 Servidor rodando na porta 8080");