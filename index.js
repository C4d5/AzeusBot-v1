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

  // ==================== FUNÇÃO MULTIPLOS DADOS COM ! ====================
  const rollDice = (n, f) =>
    Array.from({ length: n }, () => Math.floor(Math.random() * f) + 1);

  const rollMultipleExpr = async (expr, msg) => {
    const parts = expr.split("+").map(p => p.trim()).filter(p => p);

    let totalSum = 0;
    let displayParts = [];
    let allRolls = [];
    let totalExtras = 0;

    for (const part of parts) {
      const explode = part.endsWith("!");
      const cleanedPart = explode ? part.slice(0, -1).trim() : part;
      const diceMatch = cleanedPart.match(/^(\d*)d(\d+)$/i);

      if (diceMatch) {
        const count = parseInt(diceMatch[1] || "1", 10);
        const faces = parseInt(diceMatch[2], 10);
        let rolls = rollDice(count, faces);
        let rollsDisplay = [...rolls];

        let extrasForPart = 0;
        if (explode) {
          let extras = rolls.filter(r => r === faces).length;
          while (extras > 0) {
            const newRolls = rollDice(extras, faces);
            rolls.push(...newRolls);
            rollsDisplay.push(...newRolls);
            extras = newRolls.filter(r => r === faces).length;
            extrasForPart += newRolls.length;
          }
        }

        totalSum += rolls.reduce((a, b) => a + b, 0);
        displayParts.push(`[${rollsDisplay.join(", ")}] ${cleanedPart}${explode ? "!" : ""}`);
        allRolls.push(...rolls);
        totalExtras += extrasForPart;
      } else {
        const num = parseInt(part, 10);
        if (!isNaN(num)) {
          totalSum += num;
          displayParts.push(`${num}`);
        }
      }
    }

    const hasMin = allRolls.includes(1);
    const hasMax = allRolls.includes(Math.max(...allRolls));
    let emoji = "";
    if (hasMin && hasMax) emoji = "🥶";
    else if (hasMin) emoji = "💀";
    else if (hasMax) emoji = "🥵";

    await msg.reply({
      content: `**${totalSum}${emoji}** <-- ${displayParts.join(" + ")}` +
        (totalExtras > 0 ? `\n(${totalExtras} dados extras rolados) !` : ""),
      allowedMentions: { repliedUser: false },
    });
  };

  // ---------------- DETECTAR EXPRESSÕES MULTIPLAS ----------------
  if (/^\d+d\d+([!]?(\+\d+d\d+|[+\-]?\d+))*$/i.test(content)) {
    await rollMultipleExpr(content, message);
    return;
  }


  // ==================== DADOS ====================
  const explode = content.endsWith("!");
  const comando = explode ? content.slice(0, -1).trim() : content;

  const handleExplode = (rolls, f) => rolls.filter(r => r === f).length;
  const allEqual = arr => arr.length > 0 && arr.every(v => v === arr[0]);
  const selectK = (arr, type, qty) => {
    const sorted = [...arr].sort((a, b) => (type === "kl" ? a - b : b - a));
    return sorted.slice(0, Math.max(0, Math.min(qty, arr.length)));
  };

  const modMap = { t: 5, v: 10, e: 15 };
  const parseMods = str => {
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

  const parseDiceExpr = exprStr => {
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

  const { count: innerCount, faces, kType, kQtd, modificador, formattedMods } = parsed;

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
  const tailDisplay = `${innerCount}d${faces}${kDisplay}${formattedMods ? ` ${formattedMods}` : ""}`;

  const processRolls = resultados => {
    let exibicao = [...resultados];
    let extrasCount = 0;

    if (explode) {
      let extras = handleExplode(resultados, faces);
      while (extras > 0) {
        const newRolls = rollDice(extras, faces);
        resultados.push(...newRolls);
        exibicao.push(...newRolls);
        extras = handleExplode(newRolls, faces);
        extrasCount += newRolls.length;
      }
    }
    totalExtras += extrasCount;

    const escolhidos = kType ? selectK(exibicao, kType, kQtd) : exibicao;
    const total = escolhidos.reduce((a, b) => a + b, 0) + modificador;

    const hasMin = escolhidos.includes(1);
    const hasMax = escolhidos.includes(faces);
    let emoji = "";
    if (hasMin && hasMax) emoji = "🥶";
    else if (hasMin) emoji = "💀";
    else if (hasMax) emoji = "🥵";

    return { totalComEmoji: `${total}${emoji}`, exibicaoFmt: exibicao.join(", ") };
  };

  if (repeats > 1) {
    const linhas = [];
    for (let i = 0; i < repeats; i++) {
      const resultados = rollDice(innerCount, faces);
      const { totalComEmoji, exibicaoFmt } = processRolls(resultados);

      linhas.push(`**${totalComEmoji}** <-- [ ${exibicaoFmt} ] ${tailDisplay}`);
      if (!pushedEqualReaction && innerCount > 1 && allEqual(resultados)) {
        linhas.push(allEqualReactions[Math.floor(Math.random() * allEqualReactions.length)]);
        pushedEqualReaction = true;
      }
    }
    resposta = linhas.join("\n");
    if (explode && totalExtras > 0) resposta += `\n(${totalExtras} dados extras rolados) !`;
  } else {
    const resultados = rollDice(innerCount, faces);
    const { totalComEmoji, exibicaoFmt } = processRolls(resultados);

    resposta = `**${totalComEmoji}** <-- [ ${exibicaoFmt} ] ${tailDisplay}`;
    if (explode && totalExtras > 0) resposta += `\n(${totalExtras} dados extras rolados) !`;
    if (innerCount > 1 && allEqual(resultados)) {
      resposta += `\n${allEqualReactions[Math.floor(Math.random() * allEqualReactions.length)]}`;
    }
  }

  await message.reply({
    content: resposta.trim(),
    allowedMentions: { repliedUser: false },
  });
});
