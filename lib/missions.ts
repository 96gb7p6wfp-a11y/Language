import type { Language, Level } from "./curriculum";

export type MissionKind = "debate" | "roleplay" | "mystery";
export type MissionTopic = "entrepreneurship" | "technology" | "volleyball" | "university" | "business" | "society" | "everyday";
export type Topic = MissionTopic;
export type MissionDifficulty = 1 | 2 | 3;
export type MissionPhase = "challenge" | "feedback" | "retry" | "summary";
export type MissionInputMode = "text" | "voice";
export type MissionDimension = "grammar" | "naturalness" | "precision" | "clarity" | "register" | "reasoning";
export type MissionLocalized = Record<Language, string>;
export type MissionPhrase = { expression: string; meaning: string; example: string };
export type MissionOutcome = { state: "in_progress" | "success" | "partial" | "not_yet"; label: string; evidence: string };
export type MissionSummary = { didWell: string[]; weaknesses: string[]; betterExpressions: MissionPhrase[]; retryImprovements: string[] };
export type MissionFeedback = {
  strengths: string[];
  improvements: { dimension: MissionDimension; original: string; improved: string; why: string }[];
  phrases: MissionPhrase[];
  retryPrompt: string;
  outcome: MissionOutcome;
  adaptation: "harder" | "same" | "scaffold";
  nextChallenge: string;
  summary?: MissionSummary;
};
export type MissionTurn = {
  id: string;
  round: number;
  attempt: 1 | 2;
  answer: string;
  inputMode: MissionInputMode;
  characterReply: string;
  feedback: MissionFeedback;
  challenge?: string;
  createdAt?: number;
};
export type MissionRun = {
  id: string;
  templateId: string;
  language: Language;
  level: Level;
  difficulty: MissionDifficulty;
  status: "active" | "complete";
  phase: MissionPhase;
  round: number;
  currentChallenge: string;
  opening: string;
  turns: MissionTurn[];
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  outcome?: MissionOutcome;
  summary?: MissionSummary;
};
export type MissionEvidence = { id: string; title: MissionLocalized; text: MissionLocalized; simpleText?: MissionLocalized; audio: boolean };
export type MissionTemplate = {
  id: string;
  kind: MissionKind;
  topic: MissionTopic;
  title: MissionLocalized;
  teaser: MissionLocalized;
  brief: MissionLocalized;
  role: MissionLocalized;
  opening: MissionLocalized;
  stakes: MissionLocalized;
  registers: string[];
  evidence: MissionEvidence[];
  authenticSources: { title: string; url: string }[];
  maxRounds: 3;
};
export type MissionPreferences = { likedTopics: MissionTopic[]; dislikedTopics: MissionTopic[]; rejectedTemplateIds: string[] };
export type MissionBrief = {
  id: string; kind: MissionKind; topic: MissionTopic; title: string; teaser: string; brief: string; role: string;
  opening: string; stakes: string; registers: string[]; evidence: { id: string; title: string; text: string; audio: boolean }[];
  authenticSources: { title: string; url: string }[]; maxRounds: 3; level: Level; difficulty: MissionDifficulty; languageInstructions: string;
};

export const MISSION_TOPICS: readonly MissionTopic[] = ["entrepreneurship", "technology", "volleyball", "university", "business", "society", "everyday"];
export const MISSION_MAX_ROUNDS = 3;
export const MISSION_MAX_ANSWER_LENGTH = 1800;
export const MISSION_TOPIC_LABELS: Record<MissionTopic, MissionLocalized> = {
  entrepreneurship: { en: "Startups", de: "Start-ups" }, technology: { en: "Technology & AI", de: "Technologie & KI" },
  volleyball: { en: "Volleyball & sport", de: "Volleyball & Sport" }, university: { en: "University", de: "Universität" },
  business: { en: "Business & negotiation", de: "Business & Verhandlung" }, society: { en: "Society & ideas", de: "Gesellschaft & Ideen" },
  everyday: { en: "Everyday life", de: "Alltag" },
};
export const MISSION_KIND_LABELS: Record<MissionKind, MissionLocalized> = {
  debate: { en: "Debate", de: "Debatte" }, roleplay: { en: "Roleplay", de: "Rollenspiel" }, mystery: { en: "Mystery", de: "Rätsel" },
};

export const missionTemplates: MissionTemplate[] = [
  {
    id: "debate-ai-classroom", kind: "debate", topic: "technology",
    title: { en: "Defend your position", de: "Verteidige deine Position" },
    teaser: { en: "Your university wants to ban AI. You have the floor.", de: "Deine Universität will KI verbieten. Du hast das Wort." },
    brief: { en: "A university committee is deciding whether students may use AI for assessed work. Choose a position and defend a policy that could actually be enforced. You must address both learning and fairness; a slogan will not settle the question.", de: "Ein Hochschulausschuss entscheidet über KI bei benoteten Arbeiten. Beziehe Position und verteidige eine Regel, die sich praktisch umsetzen lässt. Berücksichtige Lernen und Fairness; ein Schlagwort löst das Problem nicht." },
    role: { en: "Dr Morgan, a sceptical lecturer who cares about independent thinking", de: "Dr. Weber, eine skeptische Dozentin, der selbstständiges Denken wichtig ist" },
    opening: { en: "If AI writes part of an assessed essay, how can I tell what the student understands? Tell me what your policy would allow and why.", de: "Wenn KI einen Teil einer benoteten Arbeit schreibt: Woran erkenne ich, was die Person selbst verstanden hat? Erkläre, was deine Regel erlauben würde und warum." },
    stakes: { en: "Win support for a defensible policy, not a blanket yes or no.", de: "Gewinne Zustimmung für eine begründete Regel statt für ein pauschales Ja oder Nein." },
    registers: ["respectful disagreement", "academic discussion", "qualified claims"], evidence: [],
    authenticSources: [{ title: "UNESCO · Guidance for generative AI in education", url: "https://www.unesco.org/en/articles/guidance-generative-ai-education-and-research" }], maxRounds: 3,
  },
  {
    id: "debate-team-selection", kind: "debate", topic: "volleyball",
    title: { en: "Earn your place", de: "Verdiene deinen Platz" },
    teaser: { en: "Should the strongest six always start? Convince the coach.", de: "Sollten immer die sechs Besten starten? Überzeuge die Trainerin." },
    brief: { en: "Your volleyball team has a final in two weeks. Two experienced players have missed training; two newer players have worked hard but are less consistent. Propose a selection policy that balances winning, development and trust. No match result is known in advance.", de: "Dein Volleyballteam steht in zwei Wochen im Finale. Zwei erfahrene Spieler haben Training verpasst; zwei neue Spielerinnen trainieren zuverlässig, spielen aber noch wechselhaft. Entwickle eine Auswahlregel, die Siegeswillen, Entwicklung und Vertrauen berücksichtigt. Das Spielergebnis steht nicht fest." },
    role: { en: "Alex, your coach, who must explain the decision to the whole team", de: "Alex, deine Trainerin, die ihre Entscheidung dem ganzen Team erklären muss" },
    opening: { en: "I need a line-up, not just a principle. Would you bench a stronger player for missing training? Give me your rule and a concrete exception.", de: "Ich brauche eine Aufstellung, nicht nur einen Grundsatz. Würdest du einen stärkeren Spieler wegen verpassten Trainings auf die Bank setzen? Nenne deine Regel und eine konkrete Ausnahme." },
    stakes: { en: "Build a selection rule the team can accept even when it hurts.", de: "Entwickle eine Auswahlregel, die das Team auch bei unangenehmen Entscheidungen akzeptieren kann." },
    registers: ["team discussion", "constructive disagreement", "supportive leadership"], evidence: [],
    authenticSources: [{ title: "FIVB · Official volleyball rules", url: "https://www.fivb.com/volleyball/the-game/official-volleyball-rules/" }], maxRounds: 3,
  },
  {
    id: "debate-campus-housing", kind: "debate", topic: "university",
    title: { en: "Who gets the room?", de: "Wer bekommt das Zimmer?" },
    teaser: { en: "Cheap student housing is scarce. Defend a fair allocation.", de: "Günstige Wohnheimplätze sind knapp. Verteidige eine faire Vergabe." },
    brief: { en: "There are twenty affordable university rooms and many applicants. A proposed rule gives priority to students who live furthest away. You represent the student council. Make a case for keeping, changing or replacing that rule without claiming it can help everyone equally.", de: "Für zwanzig günstige Wohnheimplätze gibt es viele Bewerbungen. Nach einem Vorschlag sollen Personen mit der weitesten Anreise Vorrang haben. Du vertrittst den Studierendenrat. Begründe, ob die Regel bleiben, geändert oder ersetzt werden soll, ohne vorzugeben, sie könne allen gleichermaßen helfen." },
    role: { en: "Samira, a housing officer concerned about clear and verifiable rules", de: "Samira, eine Wohnheimleiterin, die klare und überprüfbare Regeln braucht" },
    opening: { en: "Distance is easy to check. Your alternative may be fairer in theory, but can it work in practice? Tell me who should get priority and how you would verify it.", de: "Entfernung lässt sich leicht prüfen. Deine Alternative klingt vielleicht gerechter, aber funktioniert sie im Alltag? Erkläre, wer Vorrang haben sollte und wie wir das überprüfen." },
    stakes: { en: "Defend a workable trade-off while acknowledging who loses out.", de: "Verteidige eine umsetzbare Abwägung und benenne, wer dabei zurückstehen muss." },
    registers: ["formal discussion", "fair comparison", "precise qualification"], evidence: [],
    authenticSources: [], maxRounds: 3,
  },
  {
    id: "roleplay-investor", kind: "roleplay", topic: "entrepreneurship",
    title: { en: "The investor", de: "Die Investorin" },
    teaser: { en: "Your startup has one chance. Make a case that survives scrutiny.", de: "Dein Start-up hat eine Chance. Halte kritischen Nachfragen stand." },
    brief: { en: "You are pitching Rally, a tool that helps amateur sports teams organise training. Six teams have tried a free prototype; none has paid yet. You want funding for a three-month paid pilot. You may choose the amount, pricing and pilot targets, but must distinguish assumptions from evidence.", de: "Du präsentierst Rally, ein Werkzeug zur Trainingsorganisation für Amateurteams. Sechs Teams haben einen kostenlosen Prototyp getestet; bezahlt hat bisher niemand. Du möchtest einen dreimonatigen bezahlten Pilotversuch finanzieren. Betrag, Preis und Pilotziele wählst du selbst. Trenne Annahmen klar von Belegen." },
    role: { en: "Jordan, an investor who likes ambition but will not fund unsupported promises", de: "Jordan, eine Investorin, die Ehrgeiz schätzt, aber keine unbelegten Versprechen finanziert" },
    opening: { en: "Six teams tried it for free. Why should I believe anyone will pay? Give me the customer problem, your pilot plan and what you are asking for.", de: "Sechs Teams haben es kostenlos ausprobiert. Warum sollte ich glauben, dass jemand dafür bezahlt? Nenne das Kundenproblem, deinen Pilotplan und deinen Finanzierungswunsch." },
    stakes: { en: "Secure a conditional pilot offer by responding to the actual objections.", de: "Erreiche ein bedingtes Pilotangebot, indem du auf die tatsächlichen Einwände eingehst." },
    registers: ["professional pitch", "confident but credible", "commercial precision"], evidence: [],
    authenticSources: [], maxRounds: 3,
  },
  {
    id: "roleplay-salary", kind: "roleplay", topic: "business",
    title: { en: "The negotiation", de: "Die Verhandlung" },
    teaser: { en: "The offer is good. The terms could be better.", de: "Das Angebot ist gut. Die Bedingungen könnten besser sein." },
    brief: { en: "You have an offer for a university research-assistant role: €15 per hour, twelve hours a week, with fixed afternoon shifts. Your classes sometimes overlap. You want an arrangement you can sustain, not simply the highest number. Negotiate pay, hours or flexibility without inventing competing offers.", de: "Dir wird eine Stelle als studentische Hilfskraft angeboten: 15 Euro pro Stunde, zwölf Wochenstunden, feste Nachmittagsschichten. Deine Lehrveranstaltungen überschneiden sich teilweise damit. Verhandle eine tragfähige Lösung bei Gehalt, Zeit oder Flexibilität. Erfinde keine anderen Angebote." },
    role: { en: "Robin, a team lead with a limited budget and real coverage needs", de: "Robin, eine Teamleitung mit begrenztem Budget und konkretem Personalbedarf" },
    opening: { en: "We would like you to join. The hourly rate is €15 and we need afternoon coverage. What would you like to change, and what could you offer in return?", de: "Wir hätten dich gerne im Team. Der Stundenlohn liegt bei 15 Euro, und wir brauchen nachmittags Unterstützung. Was möchtest du ändern, und was kannst du dafür anbieten?" },
    stakes: { en: "Reach an explicit agreement both sides could honour, or explain why you walk away.", de: "Erreiche eine klare Vereinbarung, die beide Seiten einhalten können, oder begründe deinen Ausstieg." },
    registers: ["polite negotiation", "clear conditions", "professional boundaries"], evidence: [],
    authenticSources: [], maxRounds: 3,
  },
  {
    id: "roleplay-friend", kind: "roleplay", topic: "everyday",
    title: { en: "Say the difficult thing", de: "Sprich es an" },
    teaser: { en: "A friend keeps cancelling. Stay honest without starting a fight.", de: "Ein Freund sagt ständig ab. Bleib ehrlich, ohne Streit zu beginnen." },
    brief: { en: "A friend has cancelled plans at the last minute three times. Today you waited outside a sports hall for twenty minutes before getting a message. You want to keep the friendship and stop repeating the situation. Their reason may be legitimate; their intention is not known.", de: "Ein Freund hat drei Verabredungen kurzfristig abgesagt. Heute hast du zwanzig Minuten vor der Sporthalle gewartet, bevor seine Nachricht kam. Du möchtest die Freundschaft erhalten und verhindern, dass es wieder passiert. Sein Grund kann berechtigt sein; seine Absicht kennst du nicht." },
    role: { en: "Chris, your friend, who initially feels accused rather than understood", de: "Chris, dein Freund, der sich zunächst eher beschuldigt als verstanden fühlt" },
    opening: { en: "I said I was sorry. It has been a stressful week. Are you really going to make this into a big argument?", de: "Ich habe mich doch entschuldigt. Die Woche war stressig. Willst du daraus jetzt wirklich einen großen Streit machen?" },
    stakes: { en: "Name the problem, understand the explanation and agree on one practical change.", de: "Benenne das Problem, verstehe die Erklärung und vereinbare eine konkrete Änderung." },
    registers: ["natural conversation", "tactful boundaries", "informal but respectful"], evidence: [],
    authenticSources: [], maxRounds: 3,
  },
  {
  "id": "mystery-demo",
  "kind": "mystery",
  "topic": "entrepreneurship",
  "title": {
    "en": "The Demo That Failed",
    "de": "Die gescheiterte Demo"
  },
  "teaser": {
    "en": "An investor saw a blank screen. Find what actually went wrong.",
    "de": "Beim Investor blieb der Bildschirm leer. Was ist wirklich passiert?"
  },
  "brief": {
    "en": "Original fictional case. Your startup demo stopped at 09:02. A colleague blames the venue Wi-Fi; an investor doubts the product. Read the release note, hear the witness and inspect the short log. Explain the most plausible cause without claiming more than the evidence proves.",
    "de": "Fiktiver Übungsfall. Eure Start-up-Demo brach um 09:02 Uhr ab. Ein Kollege gibt dem WLAN die Schuld; eine Investorin zweifelt am Produkt. Lies die Änderungsnotiz, höre die Aussage und prüfe das kurze Protokoll. Erkläre die plausibelste Ursache, ohne mehr zu behaupten, als die Belege zeigen."
  },
  "role": {
    "en": "Mara, a sceptical investor asking the founder for an honest explanation of the failed demo",
    "de": "Mara, eine skeptische Investorin, die eine ehrliche Erklärung für die gescheiterte Vorführung erwartet"
  },
  "opening": {
    "en": "Was this a venue connection problem, a product failure or a demo setup error? Give your best explanation using two clues. Say what you still need to check.",
    "de": "Lag es an der Verbindung vor Ort, am Produkt oder an der Einrichtung der Demo? Begründe deine Erklärung mit zwei Hinweisen. Sag auch, was noch geprüft werden muss."
  },
  "stakes": {
    "en": "Earn trust through a precise explanation and a credible next check. Blaming somebody without evidence will weaken your case.",
    "de": "Gewinne Vertrauen durch eine präzise Erklärung und einen sinnvollen nächsten Prüfschritt. Unbelegte Schuldzuweisungen schwächen deine Position."
  },
  "registers": [
    "professional",
    "candid",
    "precise"
  ],
  "evidence": [
    {
      "id": "demo-note",
      "title": {
        "en": "Release note · 08:50",
        "de": "Änderungsnotiz · 08:50"
      },
      "text": {
        "en": "The demo server now expects credential version 3. The demo laptop still shows version 2. The note says clients must restart after the change. This note does not say whether the laptop was restarted.",
        "de": "Der Demo-Server erwartet jetzt Zugangsversion 3. Auf dem Demo-Laptop ist noch Version 2 eingetragen. Laut Notiz müssen die Geräte nach der Änderung neu gestartet werden. Ob der Laptop neu gestartet wurde, steht nicht darin."
      },
      "simpleText": {
        "en": "The server needs version 3. The laptop has version 2. The laptop needs a restart.",
        "de": "Der Server braucht Version 3. Der Laptop hat Version 2. Der Laptop muss neu starten."
      },
      "audio": false
    },
    {
      "id": "demo-witness",
      "title": {
        "en": "Witness · product designer",
        "de": "Aussage · Produktdesignerin"
      },
      "text": {
        "en": "The screen said “Connection lost”, so I assumed the Wi-Fi had failed. I did not test another site at that moment. A minute later I opened our public homepage on the same laptop without a problem.",
        "de": "Auf dem Bildschirm stand „Verbindung verloren“. Deshalb dachte ich, das WLAN sei ausgefallen. Ich habe in dem Moment keine andere Seite getestet. Eine Minute später konnte ich unsere öffentliche Startseite auf demselben Laptop problemlos öffnen."
      },
      "simpleText": {
        "en": "I saw “Connection lost”. One minute later, the website worked on the same laptop. I did not check the Wi-Fi before that.",
        "de": "Ich sah „Verbindung verloren“. Eine Minute später ging die Webseite auf demselben Laptop. Vorher habe ich das WLAN nicht geprüft."
      },
      "audio": true
    },
    {
      "id": "demo-log",
      "title": {
        "en": "Server log · 09:02–09:03",
        "de": "Serverprotokoll · 09:02–09:03"
      },
      "text": {
        "en": "09:02 — Demo laptop: protected upload request received; response 401, “credential version rejected”. 09:03 — Same laptop: public homepage request received; response 200, page delivered. No protected upload succeeded in this interval.",
        "de": "09:02 — Demo-Laptop: geschützte Upload-Anfrage eingegangen; Antwort 401, „Zugangsversion abgelehnt“. 09:03 — Derselbe Laptop: öffentliche Startseite angefragt; Antwort 200, Seite ausgeliefert. In diesem Zeitraum gelang kein geschützter Upload."
      },
      "simpleText": {
        "en": "09:02: The laptop reached the server. The server rejected version 2. 09:03: The public website worked.",
        "de": "09:02: Der Laptop erreichte den Server. Der Server lehnte Version 2 ab. 09:03: Die öffentliche Webseite ging."
      },
      "audio": false
    }
  ],
  "authenticSources": [],
  "maxRounds": 3
},
{
  "id": "mystery-final",
  "kind": "mystery",
  "topic": "volleyball",
  "title": {
    "en": "The Point We Won—and Lost",
    "de": "Der verlorene Punktgewinn"
  },
  "teaser": {
    "en": "Your team won the rally. The other side got the point.",
    "de": "Dein Team gewinnt den Ballwechsel. Trotzdem bekommt der Gegner den Punkt."
  },
  "brief": {
    "en": "Original fictional case. In the tournament final, your team led 23–22 and appeared to win a long rally. After a check, the score became 23–23. The bench is arguing about the setter. Compare the rotation card, a bench statement and the referee record. Explain what the evidence supports and how you would prevent a repeat.",
    "de": "Fiktiver Übungsfall. Im Turnierfinale führte dein Team 23:22 und gewann scheinbar einen langen Ballwechsel. Nach einer Prüfung stand es 23:23. Auf der Bank wird über das Zuspiel gestritten. Vergleiche Aufstellungsblatt, Aussage und Schiedsrichterprotokoll. Erkläre den belegten Ablauf und wie du eine Wiederholung verhindern würdest."
  },
  "role": {
    "en": "Leonie, the head coach, who wants the assistant coach to reconstruct the point accurately before speaking to the team",
    "de": "Leonie, die Cheftrainerin, die vor dem Teamgespräch eine genaue Rekonstruktion des Punktes braucht"
  },
  "opening": {
    "en": "Why did the score become 23–23 after a rally your team appeared to win? Connect two records before blaming anyone. Give one practical instruction for the next serve.",
    "de": "Warum stand es nach dem scheinbar gewonnenen Ballwechsel 23:23? Verbinde zwei Belege, bevor du jemandem die Schuld gibst. Formuliere eine praktische Anweisung für den nächsten Aufschlag."
  },
  "stakes": {
    "en": "Help the team understand the decision and regain focus. A convincing account needs the sequence of events, not a scapegoat.",
    "de": "Hilf dem Team, die Entscheidung zu verstehen und wieder konzentriert zu spielen. Eine überzeugende Erklärung braucht den Ablauf, keinen Sündenbock."
  },
  "registers": [
    "team-talk",
    "clear",
    "supportive"
  ],
  "evidence": [
    {
      "id": "final-card",
      "title": {
        "en": "Rotation card",
        "de": "Aufstellungsblatt"
      },
      "text": {
        "en": "At 23–22, the recorded next server is number 4. Number 11 has just replaced number 7. The note beneath the substitution says that number 4 keeps the next serving position.",
        "de": "Bei 23:22 ist Nummer 4 als nächste Aufschlägerin eingetragen. Nummer 11 wurde gerade für Nummer 7 eingewechselt. Unter dem Wechsel steht: Nummer 4 behält die nächste Aufschlagposition."
      },
      "simpleText": {
        "en": "At 23–22, number 4 must serve next. Number 11 replaces number 7, not number 4.",
        "de": "Bei 23:22 muss Nummer 4 aufschlagen. Nummer 11 kommt für Nummer 7, nicht für Nummer 4."
      },
      "audio": false
    },
    {
      "id": "final-witness",
      "title": {
        "en": "From the bench",
        "de": "Von der Bank"
      },
      "text": {
        "en": "I waved number 11 towards the service line after the substitution. Number 11 served and we won the rally. Then the officials spoke to each other. I first thought the setter must have touched the net, but I did not see a net touch.",
        "de": "Nach dem Wechsel habe ich Nummer 11 zur Aufschlaglinie gewinkt. Nummer 11 schlug auf und wir gewannen den Ballwechsel. Dann berieten sich die Offiziellen. Zuerst dachte ich an eine Netzberührung der Zuspielerin, gesehen habe ich aber keine."
      },
      "simpleText": {
        "en": "I told number 11 to serve. We won the rally. I did not see a net touch.",
        "de": "Ich sagte Nummer 11: Schlag auf. Wir gewannen den Ballwechsel. Eine Netzberührung habe ich nicht gesehen."
      },
      "audio": true
    },
    {
      "id": "final-referee",
      "title": {
        "en": "Referee record",
        "de": "Schiedsrichterprotokoll"
      },
      "text": {
        "en": "Score before the serve: 23–22. Server observed: number 11. The serving order was checked before the next serve. Under this event’s stated rule, a wrong server gives the opponents the point and service; the apparent rally point is cancelled. Corrected score: 23–23.",
        "de": "Spielstand vor dem Aufschlag: 23:22. Beobachtete Aufschlägerin: Nummer 11. Die Reihenfolge wurde vor dem nächsten Aufschlag geprüft. Nach der angegebenen Turnierregel erhält der Gegner bei falscher Aufschlägerin Punkt und Aufschlag; der scheinbare Punktgewinn zählt nicht. Korrigierter Stand: 23:23."
      },
      "simpleText": {
        "en": "Number 11 served. The rule says: wrong server means a point for the other team. New score: 23–23.",
        "de": "Nummer 11 schlug auf. Die Regel sagt: falsche Aufschlägerin, Punkt für den Gegner. Neuer Stand: 23:23."
      },
      "audio": false
    }
  ],
  "authenticSources": [],
  "maxRounds": 3
},
{
  "id": "mystery-newsroom",
  "kind": "mystery",
  "topic": "society",
  "title": {
    "en": "Two Headlines. One Timetable.",
    "de": "Zwei Schlagzeilen. Ein Fahrplan."
  },
  "teaser": {
    "en": "“More buses” or “half the service lost”? Find the missing context.",
    "de": "„Mehr Busse“ oder „die Hälfte gestrichen“? Finde den fehlenden Kontext."
  },
  "brief": {
    "en": "Original fictional case. Two reports describe a proposed change to bus route N3. One calls it an expansion; the other calls it a cut. Your editor needs a fair short report. Compare the time windows, distinguish a proposal from an implemented change and avoid treating every passenger as equally affected.",
    "de": "Fiktiver Übungsfall. Zwei Berichte beschreiben einen geplanten Fahrplan für die Buslinie N3. Einer spricht vom Ausbau, der andere von Kürzungen. Deine Redaktion braucht eine faire Kurzmeldung. Vergleiche die Zeitfenster, unterscheide Planung und Umsetzung und beachte, dass Fahrgäste unterschiedlich betroffen sind."
  },
  "role": {
    "en": "Nora, an exacting editor who wants a clear, defensible headline and challenges unsupported certainty",
    "de": "Nora, eine genaue Redakteurin, die eine belegbare Schlagzeile braucht und unbegründete Gewissheit hinterfragt"
  },
  "opening": {
    "en": "Which headline would you publish about the N3 proposal? Explain how both reports use the figures, then state one thing the documents do not tell us.",
    "de": "Welche Schlagzeile würdest du zum N3-Vorschlag veröffentlichen? Erkläre, wie beide Berichte die Zahlen verwenden. Nenne dann eine Information, die in den Unterlagen fehlt."
  },
  "stakes": {
    "en": "Publish an accurate account that survives a sceptical editor’s follow-up. Precision matters more than sounding certain.",
    "de": "Veröffentliche eine genaue Meldung, die kritischen Nachfragen standhält. Präzision ist wichtiger als ein sicherer Ton."
  },
  "registers": [
    "newsroom",
    "neutral",
    "evidence-led"
  ],
  "evidence": [
    {
      "id": "news-council",
      "title": {
        "en": "Council press note",
        "de": "Pressemitteilung des Stadtrats"
      },
      "text": {
        "en": "“More choice in the evening: the proposal increases N3 departures by 50%.” The attached table covers only 20:00–23:59: twelve departures in the current timetable and eighteen in the proposal. Its headline does not mention the period after midnight.",
        "de": "„Abends mehr Auswahl: Der Vorschlag erhöht die N3-Abfahrten um 50 Prozent.“ Die beigefügte Tabelle gilt nur für 20:00 bis 23:59 Uhr: zwölf Abfahrten im aktuellen Fahrplan, achtzehn im Vorschlag. Die Überschrift erwähnt die Zeit nach Mitternacht nicht."
      },
      "simpleText": {
        "en": "Before midnight: 12 buses now, 18 in the plan. The headline says “More buses”.",
        "de": "Vor Mitternacht: jetzt 12 Busse, im Plan 18. Die Überschrift sagt: „Mehr Busse“."
      },
      "audio": false
    },
    {
      "id": "news-worker",
      "title": {
        "en": "A night worker’s statement",
        "de": "Aussage einer Nachtarbeiterin"
      },
      "text": {
        "en": "“They have taken away half our night buses.” I usually travel between midnight and 02:00. For that period, the proposal lists four departures instead of the current eight. I have not seen a new timetable at my stop yet.",
        "de": "„Die Hälfte unserer Nachtbusse haben sie uns gestrichen.“ Ich fahre normalerweise zwischen Mitternacht und 02:00 Uhr. Dafür sieht der Vorschlag vier statt der bisherigen acht Abfahrten vor. An meiner Haltestelle habe ich noch keinen neuen Fahrplan gesehen."
      },
      "simpleText": {
        "en": "After midnight: 8 buses now, 4 in the plan. I need a bus after work. The old timetable is still at my stop.",
        "de": "Nach Mitternacht: jetzt 8 Busse, im Plan 4. Ich brauche nach der Arbeit einen Bus. An der Haltestelle hängt noch der alte Plan."
      },
      "audio": true
    },
    {
      "id": "news-memo",
      "title": {
        "en": "Operations memo",
        "de": "Betriebsnotiz"
      },
      "text": {
        "en": "The N3 change is a proposal awaiting next Thursday’s council vote. No departures have been changed. Across both time windows, the count would rise from twenty to twenty-two. The memo contains no passenger counts, journey destinations or evidence about demand at particular times.",
        "de": "Die N3-Änderung ist ein Vorschlag, über den der Stadtrat kommenden Donnerstag abstimmt. Bisher wurde keine Abfahrt geändert. Zusammen würden beide Zeitfenster von zwanzig auf zweiundzwanzig Abfahrten steigen. Angaben zu Fahrgastzahlen, Fahrtzielen oder Nachfrage zu einzelnen Zeiten fehlen."
      },
      "simpleText": {
        "en": "This is a plan, not a change. Nothing has changed yet. Total: 20 buses now, 22 in the plan. We do not know how many people need each bus.",
        "de": "Das ist ein Plan. Bisher ist nichts geändert. Insgesamt: jetzt 20 Busse, im Plan 22. Wir wissen nicht, wie viele Menschen jeden Bus brauchen."
      },
      "audio": false
    }
  ],
  "authenticSources": [],
  "maxRounds": 3
}
];
export const MISSIONS = missionTemplates;

export function createMissionPreferences(): MissionPreferences {
  return { likedTopics: [], dislikedTopics: [], rejectedTemplateIds: [] };
}

export function normaliseMissionPreferences(value: unknown): MissionPreferences {
  if (!value || typeof value !== "object" || Array.isArray(value)) return createMissionPreferences();
  const input = value as Partial<MissionPreferences>;
  const topics = (items: unknown) => Array.isArray(items) ? [...new Set(items.filter((item): item is MissionTopic => typeof item === "string" && MISSION_TOPICS.includes(item as MissionTopic)))] : [];
  const dislikedTopics = topics(input.dislikedTopics);
  const likedTopics = topics(input.likedTopics).filter(topic => !dislikedTopics.includes(topic));
  return { likedTopics, dislikedTopics, rejectedTemplateIds: Array.isArray(input.rejectedTemplateIds) ? [...new Set(input.rejectedTemplateIds.filter((id): id is string => typeof id === "string" && missionTemplates.some(mission => mission.id === id)))].slice(-40) : [] };
}

export function getMissionTemplate(id: string): MissionTemplate | undefined {
  return missionTemplates.find(mission => mission.id === id);
}

const simpleOpenings: Record<string, MissionLocalized> = {
  "debate-ai-classroom": { en: "Should students use AI for schoolwork? Give your opinion and one reason.", de: "Sollen Lernende KI für Schulaufgaben nutzen? Sage deine Meinung und nenne einen Grund." },
  "debate-team-selection": { en: "A good player missed training. Should they play in the final? Explain your choice.", de: "Ein guter Spieler hat das Training verpasst. Soll er im Finale spielen? Begründe deine Wahl." },
  "debate-campus-housing": { en: "There are not enough student rooms. Who should get a room first, and why?", de: "Es gibt zu wenige Zimmer für Studierende. Wer soll zuerst ein Zimmer bekommen? Warum?" },
  "roleplay-investor": { en: "What does your team app do? Why would someone pay for it?", de: "Was kann deine Team-App? Warum würde jemand dafür bezahlen?" },
  "roleplay-salary": { en: "We can pay €15 an hour. You work in the afternoons. What would you like to change?", de: "Wir zahlen 15 Euro pro Stunde. Du arbeitest nachmittags. Was möchtest du ändern?" },
  "roleplay-friend": { en: "I am sorry I was late. Why are you upset?", de: "Es tut mir leid, dass ich zu spät war. Warum bist du verärgert?" },
  "mystery-demo": { en: "The demo failed. Look at the evidence. What happened?", de: "Die Vorführung hat nicht funktioniert. Sieh dir die Hinweise an. Was ist passiert?" },
  "mystery-final": { en: "The team lost a point. Read or listen to the evidence. Why did this happen?", de: "Das Team hat einen Punkt verloren. Lies oder höre die Hinweise. Warum ist das passiert?" },
  "mystery-newsroom": { en: "Two reports tell different stories. Which explanation fits the evidence?", de: "Zwei Berichte erzählen etwas anderes. Welche Erklärung passt zu den Hinweisen?" },
};
const simpleBriefs: Record<string, MissionLocalized> = {
  "debate-ai-classroom": { en: "Your university wants a rule for AI. Choose a rule. Explain why it is fair.", de: "Deine Universität braucht eine Regel für KI. Wähle eine Regel. Erkläre, warum sie fair ist." },
  "debate-team-selection": { en: "Your team has a final soon. Two strong players missed training. Two newer players came every week. Help the coach choose.", de: "Dein Team spielt bald im Finale. Zwei gute Spieler haben das Training verpasst. Zwei neue waren jede Woche da. Hilf bei der Auswahl." },
  "debate-campus-housing": { en: "Many students need a cheap room. There are only twenty rooms. Help the university choose a fair rule.", de: "Viele Studierende brauchen ein günstiges Zimmer. Es gibt nur zwanzig Zimmer. Hilf der Universität mit einer fairen Regel." },
  "roleplay-investor": { en: "Your app helps sports teams plan training. Six teams tried it for free. No team has paid. Ask an investor for help with a paid test.", de: "Deine App hilft Teams bei der Trainingsplanung. Sechs Teams haben sie kostenlos getestet. Noch hat niemand bezahlt. Bitte eine Investorin um Hilfe für einen bezahlten Test." },
  "roleplay-salary": { en: "A university offers you a job: €15 an hour, twelve hours a week. Some work times are during your classes. Ask for a better plan.", de: "Eine Universität bietet dir einen Job: 15 Euro pro Stunde, zwölf Stunden pro Woche. Manchmal hast du dann Unterricht. Frage nach einer besseren Lösung." },
  "roleplay-friend": { en: "Your friend cancelled three meetings. Today you waited twenty minutes. You want to stay friends, but you need a change.", de: "Dein Freund hat drei Treffen abgesagt. Heute hast du zwanzig Minuten gewartet. Ihr sollt Freunde bleiben. Aber etwas muss anders werden." },
  "mystery-demo": { en: "A fictional case: the team's app did not work during a demo. Read three clues. Explain the problem. What do you know, and what are you only guessing?", de: "Ein fiktiver Fall: Die Team-App hat bei einer Vorführung nicht funktioniert. Lies drei Hinweise. Erkläre das Problem. Was weißt du, was vermutest du nur?" },
  "mystery-final": { en: "A fictional case: your volleyball team lost a point. Three people tell you what happened. Find the reason for the lost point.", de: "Ein fiktiver Fall: Dein Volleyballteam hat einen Punkt verloren. Drei Hinweise zeigen, was passiert ist. Finde den Grund für den Punktverlust." },
  "mystery-newsroom": { en: "A fictional case: two news reports talk about a bus plan. One says there are more buses. The other says there are fewer. Find out why both say this.", de: "Ein fiktiver Fall: Zwei Meldungen berichten über einen Busplan. Eine sagt: Es gibt mehr Busse. Die andere sagt: Es gibt weniger. Finde heraus, warum." },
};

const levelGuidance: Record<Level, MissionLocalized> = {
  A1: { en: "Use short everyday sentences, one concrete question at a time and familiar words. Accept short meaningful answers. Offer a sentence starter when needed; never require an essay or idioms.", de: "Nutze kurze Alltagssätze, eine konkrete Frage auf einmal und vertraute Wörter. Kurze sinnvolle Antworten reichen. Biete bei Bedarf einen Satzanfang an; verlange keinen Aufsatz und keine Redewendungen." },
  A2: { en: "Use clear everyday situations and short turns. Ask for a reason or simple example. Explain unfamiliar expressions briefly and offer two useful sentence starters when requested.", de: "Nutze klare Alltagssituationen und kurze Beiträge. Frage nach einem Grund oder einfachen Beispiel. Erkläre unbekannte Ausdrücke kurz und biete auf Wunsch zwei Satzanfänge an." },
  B1: { en: "Ask for a connected explanation with reasons and an example. Introduce one practical complication at a time. Help with linking ideas rather than demanding elaborate vocabulary.", de: "Erwarte eine zusammenhängende Erklärung mit Gründen und einem Beispiel. Führe jeweils eine praktische Schwierigkeit ein. Hilf beim Verknüpfen von Gedanken, statt komplizierte Wörter zu verlangen." },
  B2: { en: "Expect developed reasons, relevant evidence and appropriate register. Challenge one assumption, ask a natural follow-up and invite a concrete compromise or counterexample.", de: "Erwarte ausgeführte Gründe, passende Belege und ein angemessenes Register. Hinterfrage eine Annahme, stelle eine natürliche Rückfrage und fordere einen konkreten Kompromiss oder ein Gegenbeispiel." },
  C1: { en: "Use natural idiomatic language, implicit concerns and competing priorities. Probe qualifications and evidence limits. Ask for a precise response to the actual objection, including tactful register choices.", de: "Nutze natürliche idiomatische Sprache, unausgesprochene Bedenken und konkurrierende Ziele. Prüfe Einschränkungen und Beleggrenzen. Fordere eine präzise Antwort auf den tatsächlichen Einwand sowie ein taktvolles Register." },
  C2: { en: "Explore ambiguous information, pragmatic meaning and nuanced trade-offs. Probe a sophisticated counterargument or unexpected change of audience. Reward precise, natural, economical language rather than ornamental rare words.", de: "Untersuche mehrdeutige Informationen, pragmatische Bedeutung und differenzierte Zielkonflikte. Prüfe ein anspruchsvolles Gegenargument oder einen unerwarteten Wechsel des Publikums. Würdige präzise, natürliche, knappe Sprache statt seltener Schmuckwörter." },
};
const difficultyGuidance: Record<MissionDifficulty, MissionLocalized> = {
  1: { en: "Support mode: state the issue explicitly, give one helpful cue and avoid surprise constraints. Keep the same CEFR level; scaffolding is not a lower proficiency label.", de: "Mit Unterstützung: Benenne das Problem klar, gib einen hilfreichen Hinweis und vermeide überraschende Zusatzbedingungen. Das CEFR-Niveau bleibt gleich; Hilfe ist keine Einstufung nach unten." },
  2: { en: "Balanced challenge: react to the learner's exact point, introduce one relevant complication and allow a fair chance to address it.", de: "Ausgewogene Herausforderung: Reagiere auf den konkreten Gedanken, ergänze eine passende Schwierigkeit und gib eine faire Chance, darauf einzugehen." },
  3: { en: "Stretch mode: use a subtler objection, an implication or a register shift. Difficulty comes from reasoning and context, not simply rarer words. Never silently change the scenario's fixed facts.", de: "Mit Zusatzanspruch: Nutze einen feineren Einwand, eine Schlussfolgerung oder einen Registerwechsel. Schwierigkeit entsteht durch Denken und Kontext, nicht bloß durch seltenere Wörter. Verändere feste Szenariofakten nicht stillschweigend." },
};

export function getMissionBrief(template: MissionTemplate | string, language: Language, level: Level, difficulty: MissionDifficulty = 2): MissionBrief {
  const mission = typeof template === "string" ? getMissionTemplate(template) : template;
  if (!mission) throw new Error("Choose an available mission.");
  if (language !== "en" && language !== "de") throw new Error("Choose English or German.");
  if (!Object.hasOwn(levelGuidance, level)) throw new Error("Choose an A1–C2 level.");
  if (![1, 2, 3].includes(difficulty)) throw new Error("Choose a supported challenge difficulty.");
  const simple = level === "A1" || level === "A2";
  return {
    id: mission.id, kind: mission.kind, topic: mission.topic, title: mission.title[language], teaser: mission.teaser[language],
    brief: simple && simpleBriefs[mission.id] ? simpleBriefs[mission.id][language] : mission.brief[language],
    role: mission.role[language], opening: simple && simpleOpenings[mission.id] ? simpleOpenings[mission.id][language] : mission.opening[language],
    stakes: mission.stakes[language], registers: [...mission.registers],
    evidence: mission.evidence.map(item => ({ id: item.id, title: item.title[language], text: simple && item.simpleText ? item.simpleText[language] : item.text[language], audio: item.audio })),
    authenticSources: [...mission.authenticSources], maxRounds: mission.maxRounds, level, difficulty,
    languageInstructions: `${language === "de" ? "Conduct the character interaction in natural German. Give feedback in clear German." : "Conduct the character interaction and feedback in natural English."} ${levelGuidance[level][language]} ${difficultyGuidance[difficulty][language]}`,
  };
}

function seedHash(value: string): number {
  let hash = 2166136261;
  for (const character of value) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return hash >>> 0;
}

/** Preferences and history affect recommendations, never language-level claims. */
export function recommendMissions(language: Language, preferences: MissionPreferences, runs: MissionRun[], date = new Date().toISOString().slice(0, 10), count = 3): MissionTemplate[] {
  const preference = normaliseMissionPreferences(preferences);
  const maximum = Math.max(0, Math.min(missionTemplates.length, Math.floor(Number.isFinite(count) ? count : 3)));
  const rejected = new Set(preference.rejectedTemplateIds);
  const recent = runs.filter(run => run.language === language).sort((a, b) => b.updatedAt - a.updatedAt);
  const recency = new Map<string, number>();
  recent.forEach((run, index) => { if (!recency.has(run.templateId)) recency.set(run.templateId, index); });
  const eligible = missionTemplates.filter(mission => !preference.dislikedTopics.includes(mission.topic) && !rejected.has(mission.id));
  // If a learner has dismissed every option, respect the decision. The UI can
  // offer topic editing or an explicit reset rather than secretly ignoring it.
  if (!eligible.length || maximum === 0) return [];
  const order = [...eligible].sort((a, b) => {
    const aSeen = recency.has(a.id), bSeen = recency.has(b.id);
    if (aSeen !== bSeen) return aSeen ? 1 : -1;
    if (aSeen && bSeen && recency.get(a.id) !== recency.get(b.id)) return (recency.get(b.id) ?? 0) - (recency.get(a.id) ?? 0);
    const aLike = preference.likedTopics.includes(a.topic), bLike = preference.likedTopics.includes(b.topic);
    if (aLike !== bLike) return aLike ? -1 : 1;
    return seedHash(`${date}:${language}:${a.id}`) - seedHash(`${date}:${language}:${b.id}`);
  });
  const result: MissionTemplate[] = [];
  // Prefer different challenge kinds among equally unseen/recent candidates.
  const bestSeen = recency.has(order[0].id);
  const sameFreshness = order.filter(mission => recency.has(mission.id) === bestSeen);
  for (const mission of sameFreshness) {
    if (result.length >= maximum) break;
    if (result.some(item => item.kind === mission.kind)) continue;
    result.push(mission);
  }
  for (const mission of order) {
    if (result.length >= maximum) break;
    if (!result.some(item => item.id === mission.id)) result.push(mission);
  }
  return result;
}

export function adaptMissionDifficulty(current: MissionDifficulty, adaptation: MissionFeedback["adaptation"], learnerRating?: "easy" | "okay" | "difficult"): MissionDifficulty {
  if (learnerRating === "difficult" || adaptation === "scaffold") return Math.max(1, current - 1) as MissionDifficulty;
  if (learnerRating === "easy" || adaptation === "harder") return Math.min(3, current + 1) as MissionDifficulty;
  return current;
}

export function initialMissionDifficulty(level: Level, runs: MissionRun[], language: Language): MissionDifficulty {
  if (!Object.hasOwn(levelGuidance, level)) throw new Error("Choose an A1–C2 level.");
  const completed = runs.filter(run => run.language === language && run.status === "complete").sort((a, b) => (b.completedAt ?? b.updatedAt) - (a.completedAt ?? a.updatedAt)).slice(0, 3);
  if (!completed.length) return 2;
  const last = completed[0];
  const lastFeedback = last.turns[last.turns.length - 1]?.feedback;
  const baseline = last.difficulty;
  if (lastFeedback?.adaptation === "scaffold" || last.outcome?.state === "not_yet") return Math.max(1, baseline - 1) as MissionDifficulty;
  // Increase only after repeated evidence, not completion or a CEFR label.
  if (completed.length >= 2 && completed.slice(0, 2).every(run => run.outcome?.state === "success" && run.turns.some(turn => turn.attempt === 2 && turn.feedback.adaptation === "harder"))) return Math.min(3, baseline + 1) as MissionDifficulty;
  return baseline;
}

export function missionRetryEvidence(run: MissionRun): { original: MissionTurn; retry: MissionTurn }[] {
  const pairs: { original: MissionTurn; retry: MissionTurn }[] = [];
  for (let round = 1; round <= MISSION_MAX_ROUNDS; round++) {
    const original = run.turns.find(turn => turn.round === round && turn.attempt === 1);
    const retry = run.turns.find(turn => turn.round === round && turn.attempt === 2);
    if (original && retry) pairs.push({ original, retry });
  }
  return pairs;
}
