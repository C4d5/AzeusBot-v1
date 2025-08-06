const {
  Client,
  GatewayIntentBits,
  Events,
  REST,
  Routes,
  SlashCommandBuilder,
} = require("discord.js");
require("dotenv").config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const content = message.content.trim();

  const calcRegex = /^[-+/*\d\s.()]+$/;
  if (calcRegex.test(content)) {
    try {
      const safeEval = (expr) => Function(`"use strict"; return (${expr})`)();
      const resultado = safeEval(content);
      if (typeof resultado === "number" && !isNaN(resultado)) {
        await message.reply(`${resultado}`);
        return;
      }
    } catch {}
  }

  const regex = /^(\d*)([d#])d?(100|20|12|10|8|6|4|3|2)([+\-]\d+)?$/i;
  const match = content.match(regex);
  if (!match) return;

  let quantidade = parseInt(match[1]) || 1;
  const separador = match[2];
  const faces = parseInt(match[3]);
  const modificadorStr = match[4] || "";
  const modificador = modificadorStr ? parseInt(modificadorStr) : 0;

  if (quantidade > 100) {
    await message.reply("❌ Não posso rolar mais de 100 dados de uma vez. ❌");
    return;
  }

  const resultados = [];
  const exibicao = [];

  for (let i = 0; i < quantidade; i++) {
    const resultado = Math.floor(Math.random() * faces) + 1;
    resultados.push(resultado);

    if (resultado === 1) {
      exibicao.push(`${resultado} 💀`);
    } else if (resultado === faces && (faces === 20 || faces === 100)) {
      exibicao.push(`${resultado} 😋`);
    } else {
      exibicao.push(`${resultado}`);
    }
  }

  const todosIguais = resultados.every((r) => r === resultados[0]);

  if (separador === "#") {
    let linhas = resultados.map((valor) => {
      const valorComMod = valor + modificador;
      const emoji =
        valor === 1
          ? " 💀"
          : valor === faces && (faces === 20 || faces === 100)
            ? " 😋"
            : "";
      return `**${valorComMod}** <-- [ ${valor}${emoji} ] ${quantidade}#d${faces} ${modificador !== 0 ? (modificador > 0 ? "+" : "") + modificador : ""}`;
    });

    if (todosIguais && quantidade > 1) {
      linhas.push("💥 pqp kk");
    }

    await message.reply(linhas.join("\n"));
  } else {
    const total = resultados.reduce((a, b) => a + b, 0);
    const totalComMod = total + modificador;
    let totalComEmoji = `${totalComMod}`;

    if (resultados.includes(1)) totalComEmoji += " 💀";
    if (resultados.includes(faces) && (faces === 20 || faces === 100))
      totalComEmoji += " 😋";

    let resposta = `**${totalComEmoji}** <-- [ ${exibicao.join(", ")} ] ${quantidade}${separador}${faces}`;

    if (modificador !== 0) {
      resposta += ` ${modificador > 0 ? "+" : ""}${modificador}`;
    }

    await message.reply(resposta);

    if (todosIguais && quantidade > 1) {
      await message.channel.send("💥 pqp kk");
    }
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "ping") {
    await interaction.reply("Pong!");
    return;
  }

  if (interaction.commandName === "especialista") {
    const mensagem = `土 Júpiter [ORDO] — 01/08/2025

Quando a gente fala do especialista, o problema dele é que todas as outras classes fazem a mesma coisa q ele
E fazem melhor ate
O problema não é ele ser como é
O problema é que ocultista é infinitamente melhor
E sempre vai ser.`;

    await interaction.reply(mensagem);
    return;
  }

  if (interaction.commandName === "marcus") {
    await interaction.reply("VIADO");
    return;
  }

  if (interaction.commandName === "hb") {
    await interaction.reply(
      "https://docs.google.com/document/d/1X_FTz-PPvnhMeSLZR3A-Rcqhn8hKJluLf_dGZskAP_c/edit?usp=drivesdk",
    );
    return;
  }

  if (interaction.commandName === "guia") {
    await interaction.reply(
      "https://docs.google.com/document/d/17wmZ7GJ9MZEs8TMtj2hxxunTfOc_1Eiiwgifis6DohQ/edit?usp=drivesdk",
    );
    return;
  }

  if (interaction.commandName === "amaldiçoado") {
    const mensagem = `Amaldiçoado
Em alguma vida, você foi marcado por uma maldição — talvez ao tocar um objeto proibido ou ofender um cultista poderoso. Agora, carrega uma entidade dentro de si, e ambos precisam sobreviver juntos, pois a morte de um é o fim do outro.

Especial: Ao alcançar NEX 75%, o agente é banido da Ordo Personae.

NEX 10% – Encosto Imposto:
A criatura desperta dentro de você, oferecendo poder em troca de controle. Sempre que ganharia um novo poder de classe, você recebe Transcender no lugar. Você possui Pontos Amaldiçoados (PA): 3 + 2 por poder Transcender. Pode gastar até seu Vigor em PA por turno. Cada PA gasto recupera 5 San ou 2 PE. Recupera 1 PA por ação de interlúdio dormir. Não pode usar PA se estiver enlouquecendo.

NEX 40% – Metamorfose Forçada:
Sua mente e corpo são corroídos e remodelados. Aprende 1 ritual a cada 10% de NEX (10%, 20%...), podendo aprender rituais de 2º círculo a partir de 40% e de 3º a partir de 70%. A DT dos rituais usa Vigor ou Força como Atributo-Base. Seu limite de PA por turno agora é o dobro do Vigor.

NEX 65% – Mescla Inconstante:
A entidade adapta sua forma à sobrevivência. Gastando 2 PE, você pode copiar Reações ou Ações Livres usadas por criaturas paranormais na cena, podendo usá-las com custo de 1 PA. Caso morra, a entidade assume total controle e transforma seu corpo em uma criatura de elemento igual à sua afinidade, com VD = NEX x 4.

`;
    await interaction.reply(mensagem);
    return;
  }
});

client.login(process.env.TOKEN);

const commands = [
  new SlashCommandBuilder().setName("ping").setDescription("mensagem de ping"),

  new SlashCommandBuilder()
    .setName("especialista")
    .setDescription("Mensagem do especialista"),

  new SlashCommandBuilder()
    .setName("marcus")
    .setDescription("mensagem do marcus"),

  new SlashCommandBuilder().setName("hb").setDescription("mensagem do hb"),

  new SlashCommandBuilder().setName("guia").setDescription("mensagem do guia"),

  new SlashCommandBuilder()
    .setName("amaldiçoado")
    .setDescription("mensagem do amaldiçoado"),
].map((cmd) => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID,
      ),
      { body: commands },
    );
    console.log("Slash command registered!");
  } catch (error) {
    console.error(error);
  }
})();
