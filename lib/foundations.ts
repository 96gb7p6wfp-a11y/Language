import type { Exercise, Language, Word } from "./curriculum";

type ChunkEntry = readonly [expression: string, gloss: string, meaning: string, example: string];
type ChoiceEntry = readonly [prompt: string, answer: string, distractors: readonly [string, string], explanation: string, chinese: string, rule: string];
type SentenceEntry = readonly [answer: string, prompt: string, explanation: string, chinese: string];

const chunks: Record<Language, readonly ChunkEntry[]> = {
  en: [
    ["get up", "起床", "to leave your bed in the morning", "I get up at seven."],
    ["have breakfast", "吃早饭", "to eat your first meal of the day", "I have breakfast with my family."],
    ["go to school", "去上学", "to travel to the place where you study", "I go to school by bus."],
    ["I need help", "我需要帮助", "to say that you cannot do something alone", "I need help with this question."],
    ["I'd like", "我想要（礼貌表达）", "a polite way to say what you want", "I'd like a tea, please."],
    ["I don't understand", "我不明白", "to say that something is not clear to you", "I'm sorry, I don't understand."],
    ["How much is it?", "多少钱？", "a question about the price of something", "This sandwich looks good. How much is it?"],
    ["See you later", "回头见", "a friendly goodbye when you will meet again", "I have to go. See you later!"],
  ],
  de: [
    ["aufstehen", "起床", "das Bett verlassen und den Tag beginnen", "Ich stehe um sieben Uhr auf."],
    ["frühstücken", "吃早饭", "die erste Mahlzeit des Tages essen", "Ich frühstücke mit meiner Familie."],
    ["zur Schule gehen", "去上学", "zum Ort gehen, an dem man lernt", "Ich gehe morgens zur Schule."],
    ["Ich brauche Hilfe", "我需要帮助", "sagen, dass man etwas nicht allein machen kann", "Ich brauche Hilfe bei dieser Aufgabe."],
    ["Ich möchte", "我想要（礼貌表达）", "höflich sagen, was man will", "Ich möchte einen Tee, bitte."],
    ["Ich verstehe nicht", "我不明白", "sagen, dass etwas nicht klar ist", "Entschuldigung, ich verstehe nicht."],
    ["Was kostet das?", "多少钱？", "nach dem Preis von etwas fragen", "Das Brot sieht gut aus. Was kostet das?"],
    ["Bis später", "回头见", "sich verabschieden, wenn man sich wieder trifft", "Ich muss gehen. Bis später!"],
  ],
};

const grammar: Record<Language, readonly ChoiceEntry[]> = {
  en: [
    ["I ___ a student.", "am", ["is", "are"], "Use I am to say who you are.", "主语 I 搭配 am：I am a student。", "Be: I am"],
    ["She ___ in Berlin.", "lives", ["live", "living"], "With she, add -s to the present-simple verb.", "一般现在时中，she 后的动词加 -s。", "Present simple"],
    ["This is ___ apple.", "an", ["a", "two"], "Use an before a vowel sound: an apple.", "元音音素前用 an：an apple。", "A / an"],
    ["I ___ like coffee.", "don't", ["doesn't", "am not"], "Use I don't + the base verb to make a present-simple negative.", "一般现在时否定：I don't + 动词原形。", "Present-simple negatives"],
    ["___ you speak English?", "Do", ["Does", "Are"], "Start a present-simple question with Do when the subject is you.", "主语为 you 的一般现在时问句用 Do 开头。", "Present-simple questions"],
    ["We have lunch ___ twelve.", "at", ["on", "in"], "Use at with a clock time: at twelve.", "具体钟点前用 at：at twelve。", "Time: at"],
  ],
  de: [
    ["Ich ___ Schülerin.", "bin", ["ist", "bist"], "Mit ich heißt die Form von sein: bin.", "sein 搭配 ich 时变为 bin。", "Sein: ich bin"],
    ["Du ___ in Berlin.", "wohnst", ["wohne", "wohnen"], "Mit du endet wohnen auf -st: du wohnst.", "wohnen 搭配 du 时词尾为 -st：du wohnst。", "Verb endings"],
    ["Das ist ___ Buch.", "ein", ["eine", "einen"], "Buch ist neutral: das Buch, ein Buch.", "Buch 是中性名词：das Buch，ein Buch。", "Noun gender"],
    ["Ich habe ___ Zeit.", "keine", ["nicht", "kein"], "Zeit ist feminin. Mit keine verneinst du dieses Nomen.", "Zeit 是阴性；否定名词用 keine Zeit。", "Kein / keine"],
    ["Heute ___ ich Deutsch.", "lerne", ["ich lerne", "lernen"], "Im Aussagesatz steht das konjugierte Verb an zweiter Stelle.", "陈述句中，变位动词放在第二个位置。", "Verb second"],
    ["Der Unterricht beginnt ___ acht Uhr.", "um", ["am", "im"], "Vor einer Uhrzeit steht um: um acht Uhr.", "具体钟点前用 um：um acht Uhr。", "Time: um"],
  ],
};

const sentences: Record<Language, readonly SentenceEntry[]> = {
  en: [
    ["My name is Alex.", "Introduce yourself as Alex.", "Use My name is + your name.", "介绍名字：My name is + 名字。"],
    ["I get up at seven.", "Say when you get up.", "Use get up together and at before the time.", "get up 表示起床；钟点前用 at。"],
    ["I like playing volleyball.", "Say that you enjoy volleyball.", "Like can be followed by an -ing activity.", "like 后可以接 -ing，表达喜欢某项活动。"],
    ["Where do you live?", "Ask someone where they live.", "Use Where + do + you + the base verb.", "疑问结构：Where + do + you + 动词原形。"],
    ["Can you help me?", "Ask someone for help.", "Use Can you + the base verb to ask for help.", "请求帮助：Can you + 动词原形。"],
    ["I have breakfast with my family.", "Say who you have breakfast with.", "Have breakfast is a useful everyday phrase; with introduces the people.", "have breakfast 表示吃早饭；with 介绍一起吃饭的人。"],
  ],
  de: [
    ["Ich heiße Alex.", "Stell dich als Alex vor.", "Mit Ich heiße + Name stellst du dich vor.", "介绍名字：Ich heiße + 名字。"],
    ["Ich stehe um sieben Uhr auf.", "Sag, wann du aufstehst.", "Aufstehen ist trennbar: stehe steht an zweiter Stelle, auf am Ende.", "aufstehen 是可分动词：stehe 在第二位，auf 在句末。"],
    ["Ich spiele gern Volleyball.", "Sag, dass du gern Volleyball spielst.", "Gern zeigt, dass dir eine Aktivität Spaß macht.", "gern 表示喜欢做某事。"],
    ["Wo wohnst du?", "Frag jemanden nach seinem Wohnort.", "In einer W-Frage folgt das Verb direkt auf das Fragewort.", "特殊疑问句中，动词紧跟疑问词。"],
    ["Kannst du mir helfen?", "Bitte jemanden um Hilfe.", "Kannst steht vor du; helfen steht am Ende. Helfen braucht mir.", "问句中 Kannst 在 du 前；helfen 在句末，搭配第三格 mir。"],
    ["Ich frühstücke mit meiner Familie.", "Sag, mit wem du frühstückst.", "Nach mit steht der Dativ: mit meiner Familie.", "mit 后用第三格：mit meiner Familie。"],
  ],
};

const daily: Record<Language, readonly ChoiceEntry[]> = {
  en: [
    ["You meet a new classmate. Introduce yourself.", "Hi, I'm Alex.", ["Hi, I have Alex.", "Hi, me Alex is."], "Hi, I'm + your name is a natural introduction.", "自然的自我介绍：Hi, I'm + 名字。", "Introductions"],
    ["You want a cup of tea. Ask politely.", "I'd like a tea, please.", ["I am a tea, please.", "I like a tea yesterday."], "I'd like + a drink + please is a polite ordering phrase.", "点饮料时可用 I'd like + 饮料 + please。", "Ordering a drink"],
    ["Someone speaks too fast. Ask them to slow down.", "Please speak slowly.", ["Please slowly speech.", "Please you slow is."], "Use Please + the base verb to make a simple request.", "简单请求：Please + 动词原形。", "Asking for help"],
    ["You want to buy a ticket. Ask the price.", "How much is it?", ["How many is it?", "How price it has?"], "How much is it? asks the price of one thing.", "How much is it? 用于询问价格。", "Asking the price"],
    ["A friend says Thank you. Reply.", "You're welcome.", ["You are thank.", "I am welcome you."], "You're welcome is a common reply to thanks.", "You're welcome 是常见的感谢回复。", "Replying to thanks"],
    ["You will see a friend again this afternoon. Say goodbye.", "See you later!", ["See you yesterday!", "Look you later!"], "See you later is a friendly goodbye before meeting again.", "稍后会再见面时，可说 See you later。", "Saying goodbye"],
  ],
  de: [
    ["Du lernst jemanden kennen. Stell dich vor.", "Hallo, ich heiße Alex.", ["Hallo, ich haben Alex.", "Hallo, mich ist Alex."], "Hallo, ich heiße + Name ist eine einfache Vorstellung.", "自然的自我介绍：Hallo, ich heiße + 名字。", "Sich vorstellen"],
    ["Du bestellst im Café einen Tee. Was sagst du?", "Einen Tee, bitte.", ["Ein Tee mich.", "Ich bin einen Tee."], "Einen Tee, bitte ist eine kurze, höfliche Bestellung.", "Einen Tee, bitte 是简短、礼貌的点单表达。", "Ein Getränk bestellen"],
    ["Jemand spricht zu schnell. Bitte ihn, langsam zu sprechen.", "Bitte sprich langsam.", ["Bitte du langsam ist.", "Bitte langsam Sprache."], "Bitte sprich langsam ist eine direkte, höfliche Bitte an eine Person, die du duzt.", "对以 du 相称的人，可以用 Bitte sprich langsam 请求说慢一点。", "Um Hilfe bitten"],
    ["Du möchtest ein Ticket kaufen. Frag nach dem Preis.", "Was kostet das?", ["Wie viele kostet das?", "Was Preis das ist?"], "Mit Was kostet das? fragst du nach dem Preis.", "Was kostet das? 用于询问价格。", "Nach dem Preis fragen"],
    ["Eine Freundin sagt Danke. Was antwortest du?", "Gern geschehen.", ["Ich danke du.", "Du bist Danke."], "Gern geschehen ist eine übliche Antwort auf Danke.", "Gern geschehen 是 Danke 的常见回复。", "Auf Dank antworten"],
    ["Du siehst einen Freund heute Nachmittag wieder. Verabschiede dich.", "Bis später!", ["Bis gestern!", "Später ist du!"], "Bis später sagt man, wenn man sich später wieder trifft.", "稍后会再见面时，可以说 Bis später。", "Sich verabschieden"],
  ],
};

export const foundationWords: Word[] = [];
export const foundationExercises: Exercise[] = [];

for (const language of ["en", "de"] as const) {
  chunks[language].forEach(([word, gloss, meaning, example], index, list) => {
    const id = `${language}-A1-v${index}`;
    foundationWords.push({ id, language, level: "A1", word, gloss, meaning, example });
    foundationExercises.push({
      id, language, level: "A1", category: "vocabulary", kind: "choice",
      prompt: language === "en" ? `What does “${word}” mean?` : `Was bedeutet „${word}“?`,
      answer: meaning,
      options: [meaning, list[(index + 2) % list.length][2], list[(index + 5) % list.length][2]],
      explanation: `${word} — ${example}`,
      chinese: `${word}：${gloss}`, rule: "Useful chunks", example, word, gloss,
    });
    foundationExercises.push({
      id: `${id}-recall`, language, level: "A1", category: "vocabulary", kind: "write",
      prompt: language === "en"
        ? `Recall the expression meaning “${meaning}”. It starts with “${word[0]}…”.`
        : `Welche Wendung bedeutet „${meaning}“? Sie beginnt mit „${word[0]}…“.`,
      answer: word,
      alternatives: word === "I'd like" ? ["I would like"] : word === "I don't understand" ? ["I do not understand"] : undefined,
      explanation: `${word} — ${example}`,
      chinese: `${word}：${gloss}`, rule: "Active recall", example, word, gloss,
    });
  });
  grammar[language].forEach(([prompt, answer, distractors, explanation, chinese, rule], index) => {
    foundationExercises.push({ id: `${language}-A1-g${index}`, language, level: "A1", category: "grammar", kind: "choice", prompt, answer, options: [answer, ...distractors], explanation, chinese, rule });
  });
  sentences[language].forEach(([answer, prompt, explanation, chinese], index) => {
    foundationExercises.push({ id: `${language}-A1-s${index}`, language, level: "A1", category: "sentences", kind: "order", prompt, answer, chunks: answer.split(" "), explanation, chinese, rule: language === "en" ? "English sentence structure" : "German word order" });
  });
  daily[language].forEach(([prompt, answer, distractors, explanation, chinese, rule], index) => {
    foundationExercises.push({ id: `${language}-A1-d${index}`, language, level: "A1", category: "daily", kind: "choice", prompt, answer, options: [answer, ...distractors], explanation, chinese, rule, example: answer });
  });
}
