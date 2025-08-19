const {
  Client,
  GatewayIntentBits,
  Events,
  REST,
  Routes,
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");
require("dotenv").config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ---------------- Mensagens de texto e roladas de dados ----------------
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const content = message.content.trim();

  // Calculadora simples
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

  // Rolagem de dados
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

    if (resultado === 1) exibicao.push(`${resultado} 💀`);
    else if (resultado === faces && (faces === 20 || faces === 100)) exibicao.push(`${resultado} 😋`);
    else exibicao.push(`${resultado}`);
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
      return `**${valorComMod}** <-- [ ${valor}${emoji} ] ${quantidade}#d${faces} ${
        modificador !== 0 ? (modificador > 0 ? "+" : "") + modificador : ""
      }`;
    });

    if (todosIguais && quantidade > 1) linhas.push("💥 pqp kk");

    await message.reply(linhas.join("\n"));
  } else {
    const total = resultados.reduce((a, b) => a + b, 0);
    const totalComMod = total + modificador;
    let totalComEmoji = `${totalComMod}`;

    if (resultados.includes(1)) totalComEmoji += " 💀";
    if (resultados.includes(faces) && (faces === 20 || faces === 100)) totalComEmoji += " 😋";

    let resposta = `**${totalComEmoji}** <-- [ ${exibicao.join(", ")} ] ${quantidade}${separador}${faces}`;

    if (modificador !== 0) resposta += ` ${modificador > 0 ? "+" : ""}${modificador}`;

    await message.reply(resposta);

    if (todosIguais && quantidade > 1) await message.channel.send("💥 pqp kk");
  }
});

// ---------------- Slash Commands ----------------
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand() && !interaction.isButton()) return;

  // ---------------- Botões de navegação para Amaldiçoado ----------------
  if (interaction.isButton()) {
    const [command, page] = interaction.customId.split("_");
    if (command !== "amaldiçoado") return;

    const pageIndex = parseInt(page);
    const embeds = getAmaldiçoadoEmbeds();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`amaldiçoado_${Math.max(pageIndex - 1, 0)}`)
        .setLabel("⬅️")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(pageIndex === 0),
      new ButtonBuilder()
        .setCustomId(`amaldiçoado_${Math.min(pageIndex + 1, embeds.length - 1)}`)
        .setLabel("➡️")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(pageIndex === embeds.length - 1)
    );

    await interaction.update({ embeds: [embeds[pageIndex]], components: [row] });
    return;
  }

  // ---------------- Comandos normais ----------------
  switch (interaction.commandName) {
    case "ping":
      await interaction.reply("Pong!");
      break;

    case "especialista":
      await interaction.reply(
        `土 Júpiter [ORDO] — 01/08/2025

Quando a gente fala do especialista, o problema dele é que todas as outras classes fazem a mesma coisa q ele
E fazem melhor ate
O problema não é ele ser como é
O problema é que ocultista é infinitamente melhor
E sempre vai ser.`
      );
      break;

    case "marcus":
      await interaction.reply("VIADO");
      break;

    case "hb":
      await interaction.reply(
        "https://docs.google.com/document/d/1X_FTz-PPvnhMeSLZR3A-Rcqhn8hKJluLf_dGZskAP_c/edit?usp=drivesdk"
      );
      break;

    case "guia":
      await interaction.reply(
        "https://docs.google.com/document/d/17wmZ7GJ9MZEs8TMtj2hxxunTfOc_1Eiiwgifis6DohQ/edit?usp=drivesdk"
      );
      break;

    case "amaldiçoado":
      const embeds = getAmaldiçoadoEmbeds();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`amaldiçoado_0`)
          .setLabel("⬅️")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId(`amaldiçoado_1`)
          .setLabel("➡️")
          .setStyle(ButtonStyle.Primary)
      );

      await interaction.reply({ embeds: [embeds[0]], components: [row] });
      break;
  }
});

// ---------------- Função que cria os embeds paginados ----------------
function getAmaldiçoadoEmbeds() {
  const textos = [
    {
      title: "👻 Amaldiçoado - Página 1",
      description:
        "Nessa vida, ou até mesmo em vidas passadas, você foi amaldiçoado por algo ou alguém, talvez tenha tocado em um objeto místico que não deveria, ou fez muito mal à um cultista que lançou algo sobre você. Independente de como ou quando essa criatura entrou no seu corpo, você teve que aprender a sobreviver e lidar com isso da melhor forma, e ela também, afinal, se você morrer, ela também morre.\n\nEspecial: Ao chegar no NEX75% com essa trilha o agente é banido da Ordo Personae.",
    },
    {
      title: "👻 Amaldiçoado - NEX 10%",
      description:
        "**Encosto Imposto.** Você sente a criatura tomando forma em seu interior. Sempre que receber um novo poder de classe, recebe o poder Transcender no lugar. Você possui **Pontos Amaldiçoados (PA)**: 3 + 2 por poder Transcender. Pode gastar até seu Vigor em PA por turno. Cada PA gasto recupera 5 San ou 2 PE. Recupera 1 PA a cada ação de interlúdio dormir. Não pode usar PA se estiver enlouquecendo.",
    },
    {
      title: "👻 Amaldiçoado - NEX 40%",
      description:
        "**Metamorfose Forçada.** Seu corpo muda forçadamente, o encosto consome cada vez mais suas memórias e traz informações do outro lado para sua mente. Aprende 1 ritual a cada 10% de NEX, podendo aprender rituais de 2° Círculo a partir do NEX 40% e de 3° Círculo a partir do NEX 70%, a DT de seus rituais é calculada com o Atributo-Base Vigor ou Força. Limite de PA por turno é o dobro do Vigor.",
    },
    {
      title: "👻 Amaldiçoado - NEX 65%",
      description:
        "**Mescla Inconstante.** O ser presente em seu corpo começa a se adaptar às situações mais severas. Gastando 2PE você pode copiar Reações ou Ações Livres de criaturas paranormais e usar a ação copiada com custo de 1PA. Se morrer, a criatura dominará completamente seu corpo, transformando-o em uma criatura de elemento igual à sua afinidade e VD igual ao NEXx4.",
    },
    {
      title: "👻 Amaldiçoado - NEX 99%",
      description:
        "**Amálgama Maldita.** Sua consciência original desapareceu, a maldição dentro de você domina totalmente seu ser. Aprende o ritual Forma Monstruosa e pode usar todos os aprimoramentos sem pré-requisitos. Agora sabe copiar Ações Padrões e Ações de Movimento de criaturas paranormais.",
    },
  ];

  return textos.map((t) => new EmbedBuilder().setTitle(t.title).setDescription(t.description).setColor(7419530));
}

// ---------------- Registro dos comandos ----------------
const commands = [
  new SlashCommandBuilder().setName("ping").setDescription("mensagem de ping"),
  new SlashCommandBuilder().setName("especialista").setDescription("Mensagem do especialista"),
  new SlashCommandBuilder().setName("marcus").setDescription("mensagem do marcus"),
  new SlashCommandBuilder().setName("hb").setDescription("mensagem do hb"),
  new SlashCommandBuilder().setName("guia").setDescription("mensagem do guia"),
  new SlashCommandBuilder().setName("amaldiçoado").setDescription("mensagem do amaldiçoado"),
].map((cmd) => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
  try {
    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), {
      body: commands,
    });
    console.log("Slash command registered!");
  } catch (error) {
    console.error(error);
  }
})();

client.login(process.env.TOKEN);
