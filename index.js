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

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const content = message.content.trim();

  // ==================== CALCULADORA SIMPLES ====================
  if (content.toLowerCase().startsWith("c")) {
    const expr = content.slice(1).trim();
    const calcRegex = /^[+\-/*\d\s.()]+$/;

    if (calcRegex.test(expr)) {
      try {
        const safeEval = new Function(`"use strict"; return (${expr})`);
        const resultado = safeEval();
        if (typeof resultado === "number" && !isNaN(resultado)) {
          await message.reply({
            content: `${resultado}`,
            allowedMentions: { repliedUser: false },
          });
        }
      } catch {
        await message.reply({
          content: "❌ Expressão inválida.",
          allowedMentions: { repliedUser: false },
        });
      }
    }
    return;
  }

  // ==================== DADOS ====================
  const explode = content.endsWith("!");
  const comando = explode ? content.slice(0, -1).trim() : content;

  // ---------- Helpers ----------
  const rollDice = (n, f) =>
    Array.from({ length: n }, () => Math.floor(Math.random() * f) + 1);

  const handleExplode = (rolls, f) => rolls.filter((r) => r === f).length;

  const allEqual = (arr) => arr.length > 0 && arr.every((v) => v === arr[0]);

  const selectK = (arr, type, qty) => {
    const sorted = [...arr].sort((a, b) => (type === "kl" ? a - b : b - a));
    return sorted.slice(0, Math.max(0, Math.min(qty, arr.length)));
  };

  const modMap = { t: 5, v: 10, e: 15 };

  const parseMods = (str) => {
    const tokens = str.match(/[+\-](?:\d+|[tve])/gi) || [];
    let modificador = 0;
    const parts = [];
    for (const m of tokens) {
      const sign = m[0];
      const token = m.slice(1).toLowerCase();
      const isSym = /[tve]/i.test(token);
      const val = isSym ? modMap[token] : parseInt(token, 10);
      modificador += (sign === "+" ? 1 : -1) * val;
      parts.push(`${sign} ${isSym ? token : val}`);
    }
    return { modificador, formatted: parts.join(" ") };
  };

  const parseDiceExpr = (exprStr) => {
    const m = exprStr.match(/^(\d*)d(\d+)?/i);
    if (!m) return null;

    const count = Math.min(parseInt(m[1] || "1", 10), 100);
    const faces = parseInt(m[2] || "20", 10);

    const kMatch = exprStr.match(/(kh|kl|k)(\d+)?/i);
    const kType = kMatch ? kMatch[1].toLowerCase() : null;
    const kQtd = kMatch ? parseInt(kMatch[2] || "1", 10) : 1;

    const { modificador, formatted } = parseMods(exprStr);

    return { count, faces, kType, kQtd, modificador, formattedMods: formatted };
  };

  let repeats = 1;
  let expr = comando;

  if (comando.includes("#")) {
    const [repStr, right] = comando.split("#", 2);
    const maybeRepeats = parseInt(repStr, 10);
    if (!right || isNaN(maybeRepeats) || maybeRepeats <= 0) return;
    repeats = Math.min(maybeRepeats, 100);
    expr = right.trim();
  }

  const parsed = parseDiceExpr(expr);
  if (!parsed) return;

  const {
    count: innerCount,
    faces,
    kType,
    kQtd,
    modificador,
    formattedMods,
  } = parsed;

  const allEqualReactions = [
    "💥 pqp kk",
    "🎲 todos iguais, que azar kkkkk",
    "🔥 o RNG bugou, tudo igual!",
    "😱 mano, todos os dados saíram iguais!",
    "🤯 estatisticamente improvável, mas rolou!",
    "😂 isso é hack, só pode",
  ];

  let resposta = "";
  let totalExtras = 0;
  let pushedEqualReaction = false;

  const kDisplay = kType ? `${kType}${kQtd}` : "";
  const tailDisplay = `${innerCount}d${faces}${kDisplay}${
    formattedMods ? ` ${formattedMods}` : ""
  }`;

  // ---------------- ROLAGEM ----------------
  const processRolls = (resultados) => {
    let exibicao = [...resultados];

    if (explode) {
      let extras = handleExplode(resultados, faces);
      totalExtras += extras;
      while (extras > 0) {
        const newRolls = rollDice(extras, faces);
        resultados.push(...newRolls);
        exibicao.push(...newRolls);
        extras = handleExplode(newRolls, faces);
        totalExtras += extras;
      }
    }

    const escolhidos = kType ? selectK(exibicao, kType, kQtd) : exibicao;
    const total = escolhidos.reduce((a, b) => a + b, 0) + modificador;

    // ---------------- EMOJIS NO TOTAL ----------------
    const hasMin = escolhidos.includes(1);
    const hasMax = escolhidos.includes(faces);
    let emoji = "";
    if (hasMin && hasMax) emoji = "🥶";
    else if (hasMin) emoji = "💀";
    else if (hasMax) emoji = "🥵";

    const totalComEmoji = `${total}${emoji}`;
    const exibicaoFmt = exibicao.join(", ");

    return { totalComEmoji, exibicaoFmt };
  };

  if (repeats > 1) {
    const linhas = [];
    for (let i = 0; i < repeats; i++) {
      const resultados = rollDice(innerCount, faces);
      const { totalComEmoji, exibicaoFmt } = processRolls(resultados);

      linhas.push(`**${totalComEmoji}** <-- [ ${exibicaoFmt} ] ${tailDisplay}`);

      if (!pushedEqualReaction && innerCount > 1 && allEqual(resultados)) {
        linhas.push(
          allEqualReactions[
            Math.floor(Math.random() * allEqualReactions.length)
          ],
        );
        pushedEqualReaction = true;
      }
    }
    resposta = linhas.join("\n");
    if (explode) resposta += `\n(${totalExtras} dados extras rolados) !`;
  } else {
    const resultados = rollDice(innerCount, faces);
    const { totalComEmoji, exibicaoFmt } = processRolls(resultados);

    resposta = `**${totalComEmoji}** <-- [ ${exibicaoFmt} ] ${tailDisplay}`;
    if (explode) resposta += `\n(${totalExtras} dados extras rolados) !`;
    if (innerCount > 1 && allEqual(resultados)) {
      resposta += `\n${
        allEqualReactions[Math.floor(Math.random() * allEqualReactions.length)]
      }`;
    }
  }

  await message.reply({
    content: resposta.trim(),
    allowedMentions: { repliedUser: false },
  });
});

// ---------------- Slash Commands ----------------
// (restante do código de slash commands, embeds e registro permanecem iguais)

client.login(process.env.TOKEN);

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
        .setCustomId(
          `amaldiçoado_${Math.min(pageIndex + 1, embeds.length - 1)}`,
        )
        .setLabel("➡️")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(pageIndex === embeds.length - 1),
    );

    await interaction.update({
      embeds: [embeds[pageIndex]],
      components: [row],
    });
    return;
  }

  // ---------------- Comandos normais ----------------
  switch (interaction.commandName) {
    case "eusd":
      await interaction.reply(
        "https://cdn.discordapp.com/attachments/1263135959306862672/1407619098438926456/Projeto_10-19_HD_720p_MEDIUM_FR30.mp4?ex=68a6c2f1&is=68a57171&hm=010af28477a62ffef466c2962c77025bbce06c0c4459ea4d6dc8e4813158465b&",
      );
      break;

    case "especialista":
      await interaction.reply(
        `土 Júpiter [ORDO] — 01/08/2025

Quando a gente fala do especialista, o problema dele é que todas as outras classes fazem a mesma coisa q ele
E fazem melhor ate
O problema não é ele ser como é
O problema é que ocultista é infinitamente melhor
E sempre vai ser.`,
      );
      break;
    case "marcus":
      await interaction.reply("VIADO");
      break;
    case "lankas":
      await interaction.reply(
        "Vou da cuzada nos adversarios, https://media.discordapp.net/attachments/1123193663959351347/1407505702049812530/meme_lankas_mamador.png?ex=68a65955&is=68a507d5&hm=9f2db0748d8a53cbe9dd0873d9d91d51b6949e5091154805cac3150ef0c13634&=&format=webp&quality=lossless&width=988&height=988",
      );
      break;
    case "lankas2":
      await interaction.reply(
        "https://media.discordapp.net/attachments/1123193663959351347/1407505663289987113/lan_sendo_lan.png?ex=68a6594c&is=68a507cc&hm=074bf8d2f6b1f6f4480d1ec3a9879d893d5da3fe886ae6201726cba2d370fe4e&=&format=webp&quality=lossless&width=529&height=225, https://media.discordapp.net/attachments/1402459433132363906/1407523072445124749/image.png?ex=68a66982&is=68a51802&hm=5f7dc98dab9b27204a99414e17034357481f9a0e48fef77841c12882109c669b&=&format=webp&quality=lossless&width=415&height=298 ",
      );
      break;
    case "hb":
      await interaction.reply(
        "https://docs.google.com/document/d/1X_FTz-PPvnhMeSLZR3A-Rcqhn8hKJluLf_dGZskAP_c/edit?usp=drivesdk",
      );
      break;
    case "guia":
      await interaction.reply(
        "https://docs.google.com/document/d/17wmZ7GJ9MZEs8TMtj2hxxunTfOc_1Eiiwgifis6DohQ/edit?usp=drivesdk",
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
          .setStyle(ButtonStyle.Primary),
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

  return textos.map((t) =>
    new EmbedBuilder()
      .setTitle(t.title)
      .setDescription(t.description)
      .setColor(7419530),
  );
}

// ---------------- Registro dos comandos ----------------
const commands = [
  new SlashCommandBuilder().setName("eusd").setDescription("éusd"),
  new SlashCommandBuilder()
    .setName("especialista")
    .setDescription("Mensagem do especialista"),
  new SlashCommandBuilder()
    .setName("marcus")
    .setDescription("mensagem do marcus"),
  new SlashCommandBuilder()
    .setName("lankas")
    .setDescription("mensagem do lankas"),
  new SlashCommandBuilder()
    .setName("lankas2")
    .setDescription("mensagem do lankas"),
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

client.login(process.env.TOKEN);
