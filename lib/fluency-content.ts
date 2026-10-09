import type { Language, Level } from "./curriculum";

export type InputExpression = { expression: string; meaning: string; example: string; context?: string };
export type FluencyInput = {
  id: string;
  title: string;
  sourceLabel: string;
  text: string;
  expressions: InputExpression[];
  deepNotes: string[];
  shadowing: string[];
};
type Passage = Omit<FluencyInput, "id" | "sourceLabel">;
const chunk = (expression: string, meaning: string, example: string, context?: string): InputExpression => ({ expression, meaning, example, ...(context ? { context } : {}) });

// These passages are original learning material, not quotations from the linked publications.
// Each level includes everyday, reflective and informational language; advanced levels
// develop register, pragmatic meaning and careful reasoning rather than rare-word recall.
const passages: Record<Language, Record<Level, Passage[]>> = {
  en: {
    A1: [
      {
        title: "A small café",
        text: "I go to a small café near my school. It is quiet in the morning. I sit by the window and drink tea. Today, my friend Mia is there.\n\n‘Can I sit here?’ she asks. ‘Of course,’ I say. We talk about our day. Then we walk to school together.",
        expressions: [chunk("near my school", "close to my school", "There is a park near my school."), chunk("by the window", "next to the window", "I like the seat by the window."), chunk("Can I sit here?", "a friendly question about a seat", "Excuse me, can I sit here?"), chunk("Of course", "yes; certainly", "‘Can you help me?’ ‘Of course.’")],
        deepNotes: ["‘I go’ describes a habit. ‘Today’ introduces one particular day.", "Learn ‘Can I …?’ as a complete pattern: Can I sit here? Can I have some water?"],
        shadowing: ["Can I sit here?", "Of course.", "We walk to school together."],
      },
      {
        title: "After school",
        text: "My name is Leo. I live with my family. On Tuesdays, I play volleyball after school. My friend Sam plays too. We are on the same team.\n\nThe class starts at four. I take a bottle of water. After the class, I am tired but happy. At home, I have dinner and read a little.",
        expressions: [chunk("after school", "when the school day finishes", "We meet after school."), chunk("on the same team", "in one team together", "My sister and I are on the same team."), chunk("at four", "at four o’clock", "The bus leaves at four."), chunk("a little", "a small amount", "I read a little every evening.")],
        deepNotes: ["Use ‘on’ for a day: on Tuesdays. Use ‘at’ for a time: at four.", "‘Tired but happy’ connects two feelings with a small contrast."],
        shadowing: ["I play volleyball after school.", "We are on the same team.", "I am tired but happy."],
      },
      {
        title: "A weekend walk",
        text: "It is Saturday. The weather is good, and I want to go outside. I call my friend. ‘Are you free today?’ I ask.\n\nWe meet at the park. There are trees, flowers and a small lake. We walk slowly and take photos. Then we have lunch. It is a simple day, but I like it.",
        expressions: [chunk("go outside", "leave a building and be outdoors", "Let’s go outside."), chunk("Are you free today?", "do you have time today?", "Are you free today? Let’s meet."), chunk("There are", "used to say that several things exist", "There are two cafés in this street."), chunk("take photos", "make pictures with a camera", "We take photos in the park.")],
        deepNotes: ["‘There are’ introduces plural things; ‘there is’ introduces one thing.", "‘Let’s’ is useful for a friendly suggestion: Let’s meet. Let’s walk."],
        shadowing: ["Are you free today?", "We meet at the park.", "It is a simple day, but I like it."],
      },
    ],
    A2: [
      {
        title: "The bus that never came",
        text: "Yesterday, I left home early because I had an appointment at nine. I waited at the bus stop for twenty minutes, but no bus came. Another passenger checked her phone. ‘There’s a problem on the road,’ she said.\n\nI called the office and explained that I was running late. They moved my appointment to half past nine. In the end, I walked most of the way. I arrived out of breath, but I was still on time for the new appointment.",
        expressions: [chunk("running late", "likely to arrive later than planned", "Sorry, I’m running ten minutes late."), chunk("in the end", "after everything happened", "In the end, we stayed at home."), chunk("most of the way", "for the largest part of a journey", "I walked most of the way to school."), chunk("out of breath", "breathing quickly after exercise", "I was out of breath after the stairs.")],
        deepNotes: ["Past verbs tell the main events: left, waited, called, arrived.", "‘On time’ means by the planned time. ‘In time’ means early enough for something."],
        shadowing: ["Sorry, I’m running late.", "In the end, I walked most of the way.", "I arrived out of breath."],
      },
      {
        title: "Cooking together",
        text: "My brother and I wanted to cook dinner for our parents. We chose a simple pasta recipe and wrote a shopping list. At the supermarket, we realised that we had forgotten the list. Luckily, my brother remembered most of it.\n\nBack at home, I cut the vegetables while he made the sauce. We tasted it before adding more salt. The kitchen was a mess, but the food was good. Next time, we’ll clean up as we go.",
        expressions: [chunk("a shopping list", "a list of things to buy", "I keep a shopping list on my phone."), chunk("Back at home", "after returning home", "Back at home, we put the bags away."), chunk("was a mess", "was untidy or disorganised", "My desk was a mess."), chunk("clean up as we go", "tidy during an activity, instead of only afterwards", "Let’s clean up as we go.")],
        deepNotes: ["‘While’ joins two things happening together: I cut vegetables while he made the sauce.", "‘We’ll’ means ‘we will’. Listen for the short form in natural speech."],
        shadowing: ["We wrote a shopping list.", "The kitchen was a mess, but the food was good.", "Next time, we’ll clean up as we go."],
      },
      {
        title: "A phone-free evening",
        text: "I usually check my phone when I get home. One evening, I decided to leave it in another room. At first, I didn’t know what to do. Then I picked up a book that a friend had given me.\n\nI read for half an hour and made myself some tea. Later, I called my grandmother. I still use my phone every day, but now I sometimes put it away during dinner. It helps me pay attention to the people around me.",
        expressions: [chunk("At first", "at the beginning", "At first, the new class felt strange."), chunk("picked up a book", "took a book and began to read", "I picked up a book instead of watching TV."), chunk("put it away", "place it somewhere so you stop using it", "Put your phone away for a moment."), chunk("pay attention to", "notice and focus on", "Please pay attention to the question.")],
        deepNotes: ["‘Make myself some tea’ means prepare tea for me; ‘myself’ identifies the same person as ‘I’.", "‘At first’ often prepares a change: At first … Then …"],
        shadowing: ["At first, I didn’t know what to do.", "I sometimes put it away during dinner.", "It helps me pay attention."],
      },
    ],
    B1: [
      {
        title: "What a team needs",
        text: "Our volleyball team lost a match last week, even though we had practised a lot. At first, everyone blamed the mistakes near the end. But our coach asked us to think about the whole game. We had stopped talking to each other whenever we fell behind.\n\nAt the next training session, we tried something different. After every point, we made a quick plan together. It felt awkward at first, but it helped us stay focused. We still made mistakes. The difference was that we dealt with them as a team instead of worrying about who was responsible.",
        expressions: [chunk("fell behind", "became less successful than the other team", "We fell behind in the second half."), chunk("stay focused", "keep your attention on the task", "A clear plan helps me stay focused."), chunk("deal with", "handle a situation or problem", "We need to deal with this together."), chunk("instead of", "in place of another action or thing", "Ask for help instead of giving up.")],
        deepNotes: ["‘Even though’ introduces an unexpected contrast: practise a lot, yet lose.", "Notice the move from blame to action: the writer explains what changed and why it helped."],
        shadowing: ["It felt awkward at first.", "We tried something different.", "We dealt with them as a team."],
      },
      {
        title: "Learning beyond the classroom",
        text: "When I first started learning English, I tried to translate every sentence. Reading was slow, and I often forgot the beginning before I reached the end. A teacher suggested choosing easier stories and reading a whole page before checking any words.\n\nI was surprised by how much I could understand from the context. Some details were unclear, but I could follow the story. Now I mark a few useful expressions and return to them later. I still look things up, especially when a word appears several times. But I no longer expect to understand everything on the first reading.",
        expressions: [chunk("from the context", "using the surrounding information", "I guessed the meaning from the context."), chunk("follow the story", "understand how the events connect", "The dialogue helped me follow the story."), chunk("look things up", "find information in a dictionary or other source", "I look things up after reading."), chunk("on the first reading", "the first time you read a text", "I missed that detail on the first reading.")],
        deepNotes: ["‘Used to’ would describe a former habit; here ‘when I first started’ gives a specific earlier stage.", "‘But’ marks a change in attitude without claiming that dictionaries are useless."],
        shadowing: ["I could follow the story.", "I mark a few useful expressions.", "I no longer expect to understand everything."],
      },
      {
        title: "A new neighbour",
        text: "A new family moved into our building last month. I met them while carrying my bike upstairs. Their daughter had just started at my school, so we talked about the teachers and the quickest way to get there.\n\nA few days later, she asked me to join her for lunch. We didn’t have much in common at first, but we both liked music. She showed me a singer I had never heard of. I sometimes think making friends requires a clever opening line. Usually, though, it starts with a small conversation and someone being willing to continue it.",
        expressions: [chunk("moved into", "began living in a new place", "They moved into the flat upstairs."), chunk("have much in common", "share many interests or experiences", "We have a lot in common."), chunk("had never heard of", "did not know that someone or something existed", "I had never heard of that band."), chunk("be willing to", "be ready to do something", "You have to be willing to ask questions.")],
        deepNotes: ["Past perfect looks further back: she showed me a singer I had never heard of.", "‘Usually, though’ gently contrasts the narrator’s expectation with experience."],
        shadowing: ["We didn’t have much in common at first.", "We both liked music.", "It starts with a small conversation."],
      },
    ],
    B2: [
      {
        title: "Who gets to feel at home?",
        text: "A neighbourhood can change without its residents moving anywhere. A new café opens, rents go up, and familiar shops disappear. Some people welcome the investment; others feel that a place they know is being designed for somebody else. Both reactions are understandable.\n\nCalling every change ‘progress’ overlooks the people who bear the costs. Yet treating every new business as a threat ignores the possibility of better services and safer streets. The useful question is not whether change should happen, but who has a say in it. Public meetings matter only if the decisions are still open to influence. Otherwise, participation can become an invitation to approve a plan that has already been settled.",
        expressions: [chunk("bear the costs", "experience or pay the negative consequences", "Tenants often bear the costs of rising rents."), chunk("have a say in", "be able to influence a decision", "Residents should have a say in the plans."), chunk("open to influence", "still capable of being changed by others", "The proposal remains open to influence."), chunk("has already been settled", "has already been decided", "The timetable has already been settled.")],
        deepNotes: ["The writer gives both views a fair hearing before proposing a better question.", "‘Can become’ describes a possible risk. It does not claim that all participation is meaningless."],
        shadowing: ["Both reactions are understandable.", "Who has a say in it?", "The decisions are still open to influence."],
      },
      {
        title: "A useful disagreement",
        text: "During a group project, I wanted to finish quickly and keep the presentation simple. My partner wanted more examples. I assumed she was making the task unnecessarily complicated; she assumed I wasn’t taking it seriously. Neither of us asked what the other was worried about.\n\nWhen we finally did, the argument became easier to resolve. I was concerned about the deadline. She was concerned that the audience would not understand our main point. We agreed to keep three slides and add one clear example to each. Looking back, our disagreement was partly about the plan and partly about the meaning we had attached to each other’s behaviour. Checking an assumption took less time than defending it.",
        expressions: [chunk("take it seriously", "give something proper attention and respect", "I do take your concerns seriously."), chunk("concerned about", "worried about or interested in a possible problem", "We’re concerned about the deadline."), chunk("Looking back", "thinking about an earlier event now", "Looking back, I should have asked sooner."), chunk("attach meaning to", "interpret something as having a particular significance", "We attach different meanings to silence.")],
        deepNotes: ["‘I assumed …; she assumed …’ makes the parallel misunderstanding visible.", "Try ‘What are you concerned about?’ as a neutral way to uncover a disagreement."],
        shadowing: ["I do take it seriously.", "What are you concerned about?", "Looking back, I should have asked sooner."],
      },
      {
        title: "AI as a study partner",
        text: "An AI tool can produce a fluent answer in seconds. That makes it tempting to treat the answer as the end of a learning task. But fluency is not the same as accuracy, and receiving an explanation is not the same as being able to give one.\n\nUsed carefully, the tool can still be useful. A learner might attempt a problem first, ask for a contrasting example, and then explain the result without looking at the screen. That final step reveals what they actually understand. The important distinction is between using a tool to avoid thinking and using it to create better opportunities to think. Neither the speed of the answer nor its confident tone tells us which of those has happened.",
        expressions: [chunk("makes it tempting to", "creates a strong desire to do something", "The shortcut makes it tempting to skip practice."), chunk("a contrasting example", "an example that shows a meaningful difference", "Could you give me a contrasting example?"), chunk("the important distinction", "the difference that matters most", "The important distinction is between speed and understanding."), chunk("confident tone", "a manner of expression that sounds certain", "A confident tone does not guarantee accuracy.")],
        deepNotes: ["‘Might’ proposes an approach rather than prescribing a universal method.", "‘Used carefully’ is a shortened passive condition: if the tool is used carefully."],
        shadowing: ["Fluency is not the same as accuracy.", "Could you give me a contrasting example?", "Explain it without looking at the screen."],
      },
    ],
    C1: [
      {
        title: "The promise of a fair chance",
        text: "The American Dream is often described as a promise that effort will be rewarded. Its appeal lies partly in the freedom it offers: your future need not be determined by where you started. Yet the promise becomes harder to defend when the starting points themselves shape who can take a risk, recover from failure or afford an education.\n\nThis does not make individual effort irrelevant. It means that effort operates within conditions that are unevenly distributed. A student who works after school may show extraordinary determination while having less time to study than a classmate who does not need a job. Praising determination is reasonable; using one exceptional success to dismiss the barriers faced by everyone else is less so.\n\nPerhaps the question is whether the dream remains achievable, or whether it remains achievable on terms we can reasonably call fair. The distinction matters. Possibility alone tells us little about how accessible an opportunity is.",
        expressions: [chunk("Its appeal lies partly in", "one reason it is attractive is", "Its appeal lies partly in its simplicity.", "Reflective or formal"), chunk("recover from failure", "return to a stable position after an unsuccessful attempt", "Not everyone has the resources to recover from failure."), chunk("on terms we can reasonably call fair", "under conditions that can defensibly be described as fair", "The opportunity should exist on terms we can reasonably call fair."), chunk("tells us little about", "provides little useful information on", "An average tells us little about individual experience.")],
        deepNotes: ["‘This does not make … It means …’ narrows the claim and prevents an exaggerated interpretation.", "‘Possible’, ‘achievable’ and ‘accessible’ overlap, but accessible focuses on who can realistically obtain something."],
        shadowing: ["Your future need not be determined by where you started.", "This does not make individual effort irrelevant.", "Possibility alone tells us little about how accessible an opportunity is."],
      },
      {
        title: "When feedback lands badly",
        text: "‘You need to be more confident’ is advice that sounds helpful until you try to act on it. Confidence may describe the result someone wants to see, but it does not identify the behaviour that would get you there. A quieter student might need time to formulate an answer, not a reminder to speak louder.\n\nUseful feedback separates the person from the particular moment. ‘Your example was clear, but the conclusion moved on before you explained its relevance’ gives the listener something concrete to revise. It also leaves room for a conversation: perhaps the connection was implied, or perhaps it was missing.\n\nTone matters as well. ‘I’m not quite following the link here’ sounds less final than ‘This makes no sense’, while still naming a genuine problem. Softening a criticism need not weaken it. Sometimes it makes the criticism precise enough to be heard.",
        expressions: [chunk("something concrete to revise", "a specific feature that can be improved", "Give the writer something concrete to revise."), chunk("leaves room for", "allows space or possibility for", "The wording leaves room for disagreement."), chunk("I’m not quite following", "a tactful way to say you do not yet understand", "I’m not quite following the link here.", "Natural spoken feedback"), chunk("need not weaken it", "does not necessarily make it less strong", "Acknowledging uncertainty need not weaken an argument.", "Formal; spoken equivalent: doesn’t have to weaken it")],
        deepNotes: ["‘Not quite’ and ‘here’ make the feedback local and provisional rather than a verdict on the whole person.", "Compare ‘This makes no sense’ with ‘I’m not following the link’. Both signal difficulty; they imply different attitudes toward resolving it."],
        shadowing: ["I’m not quite following the link here.", "Could you explain what you mean?", "Softening a criticism need not weaken it."],
      },
      {
        title: "Being busy and being effective",
        text: "There is a particular satisfaction in crossing things off a list. The visible evidence of work can make a busy day feel like a productive one, even when the tasks were chosen because they were easy to finish. The important work, meanwhile, stays on the list because it has no obvious starting point.\n\nThis is not an argument against small tasks. Answering an email can unblock somebody else; tidying a desk can make concentrated work easier. The difficulty arises when visible activity becomes a substitute for judgement. A useful plan asks what would make a meaningful difference today and then defines a first step small enough to take.\n\n‘Work on the essay’ is an intention rather than a clear instruction. ‘Write a paragraph that addresses the strongest objection’ gives the work a direction. Progress may still be slow, but it is easier to tell whether the effort is serving the purpose.",
        expressions: [chunk("crossing things off a list", "marking tasks as completed", "I spent the morning crossing things off a list."), chunk("a substitute for", "something used in place of another thing", "Being busy is no substitute for setting priorities."), chunk("make a meaningful difference", "have a worthwhile effect", "What would make a meaningful difference today?"), chunk("addresses the strongest objection", "responds directly to the most persuasive criticism", "The final paragraph addresses the strongest objection.", "Academic argument")],
        deepNotes: ["‘Meanwhile’ connects simultaneous but contrasting developments.", "‘Unblock somebody’ is natural workplace language. In formal prose, ‘enable somebody to proceed’ may fit better."],
        shadowing: ["What would make a meaningful difference today?", "The important work stays on the list.", "It is easier to tell whether the effort is serving the purpose."],
      },
    ],
    C2: [
      {
        title: "What a confident claim leaves out",
        text: "A claim can become more persuasive as its wording becomes less faithful to the evidence. ‘The study found an association’ turns into ‘Scientists have shown the cause’, and a limited result acquires the apparent authority of a settled fact. The problem is not merely that a detail has been lost. The reader is being invited to draw a different kind of conclusion.\n\nCareful writing preserves the scope of what is known. A result may be consistent with an explanation without establishing it, and the absence of a detected effect may reflect a study’s limitations rather than the effect’s impossibility. These qualifications are sometimes dismissed as evasive. Yet they can be the very features that make a statement useful: they tell us where confidence is warranted and where judgement remains open.\n\nRestraint should not become a ritual of adding ‘perhaps’ to every sentence. It involves choosing the strength of a claim deliberately. ‘The evidence strongly suggests’ and ‘the evidence leaves open’ do different jobs. Near-native academic writing depends less on sounding impressive than on making those differences available to the reader.",
        expressions: [chunk("faithful to the evidence", "accurately representing what the evidence supports", "The headline should remain faithful to the evidence."), chunk("preserves the scope", "keeps the limits and reach of a finding clear", "This revision preserves the scope of the original claim.", "Formal analysis"), chunk("confidence is warranted", "there is enough justification to be confident", "Confidence is warranted for this narrower conclusion."), chunk("leaves open", "does not settle or exclude a possibility", "The evidence leaves open several explanations.")],
        deepNotes: ["Distinguish association, causation and certainty; the verb determines the claim’s strength.", "‘May reflect’ names a plausible explanation without asserting it. Good hedging conveys a precise limit rather than vague hesitation."],
        shadowing: ["The reader is being invited to draw a different kind of conclusion.", "Careful writing preserves the scope of what is known.", "The evidence leaves open several explanations."],
      },
      {
        title: "The meaning between the words",
        text: "If somebody says, ‘That’s an interesting approach’, the words alone will not tell you whether they are impressed, unconvinced or politely trying to change the subject. The surrounding conversation, the emphasis on ‘interesting’ and what comes next all contribute to the meaning. Understanding a language well includes noticing what a speaker makes explicit and what they expect you to infer.\n\nInference, however, is not mind-reading. A pause may signal disagreement, but it may equally reflect distraction or the need to think. Treating every hesitation as a hidden criticism can make a conversation more difficult than it needs to be. The practical skill is to hold an interpretation lightly and check it when it matters: ‘Do you mean that as an alternative, or as a concern about the current plan?’\n\nSuch questions can sound effortless once the patterns are familiar. They also reveal why memorising synonyms has limits. ‘I take your point’ acknowledges an argument without necessarily accepting it. ‘You’ve convinced me’ makes a much stronger commitment. The choice is small in form and substantial in consequence.",
        expressions: [chunk("what they expect you to infer", "meaning a speaker assumes you will understand indirectly", "Notice what the speaker expects you to infer."), chunk("hold an interpretation lightly", "consider a meaning without treating it as certain", "I try to hold an interpretation lightly until I can check it."), chunk("I take your point", "I understand the force of your argument", "I take your point, though I’m still concerned about the cost.", "Acknowledgement; not necessarily agreement"), chunk("You’ve convinced me", "your argument has changed my view", "You’ve convinced me; let’s try the revised plan.", "Stronger agreement")],
        deepNotes: ["Pragmatic meaning depends on context and delivery. ‘Interesting’ does not have one fixed hidden meaning.", "Rephrase one response as warm agreement, cautious acknowledgement and polite disagreement. Notice how intonation and follow-up change it."],
        shadowing: ["I take your point.", "You’ve convinced me.", "Do you mean that as an alternative, or as a concern about the current plan?"],
      },
      {
        title: "An argument worth revising",
        text: "A strong argument is not one that survives by refusing every objection. It is one whose central claim remains defensible after the objections have been taken seriously. That may require narrowing the claim, distinguishing cases that were initially grouped together, or admitting that a preferred explanation accounts for only part of the evidence.\n\nImagine a proposal to make public transport free. The argument for removing fares may emphasise accessibility and reduced traffic. A critic might reasonably ask whether limited funding would be better spent on frequency and reliability. This objection does not automatically defeat the proposal; it changes what its supporters need to establish. They must explain why fares are the decisive barrier in the relevant setting, rather than assuming that a desirable outcome follows from a desirable intention.\n\nRevising a position in this way is often portrayed as retreat. It can instead be a sign that the argument is becoming accountable to the world it describes. The aim is neither endless qualification nor a theatrical display of certainty, but a judgement whose limits are clear enough for someone else to evaluate.",
        expressions: [chunk("remains defensible", "can still be reasonably supported", "The narrower claim remains defensible."), chunk("accounts for only part of", "explains only some of", "The theory accounts for only part of the evidence."), chunk("the decisive barrier", "the obstacle that has the greatest determining effect", "Cost may not be the decisive barrier."), chunk("accountable to", "required to answer to a standard or evidence", "An explanation should be accountable to the available evidence.", "Formal; used here figuratively")],
        deepNotes: ["The objection changes the burden of the argument; it is not treated as either irrelevant or a complete refutation.", "‘Desirable’ evaluates a goal. ‘Decisive’ evaluates its role in determining an outcome. These adjectives are not interchangeable."],
        shadowing: ["The central claim remains defensible.", "Cost may not be the decisive barrier.", "The judgement’s limits are clear enough for someone else to evaluate."],
      },
    ],
  },
  de: {
    A1: [
      {
        title: "Ein Platz am Fenster",
        text: "Ich gehe in ein kleines Café. Es ist nah an meiner Schule. Ich trinke Tee und sitze am Fenster. Meine Freundin Mia kommt.\n\n‘Ist der Platz frei?’, fragt sie. ‘Ja, klar’, sage ich. Wir sprechen über unseren Tag. Dann gehen wir zusammen zur Schule.",
        expressions: [chunk("am Fenster", "direkt neben dem Fenster", "Ich sitze gern am Fenster."), chunk("Ist der Platz frei?", "Kann ich hier sitzen?", "Entschuldigung, ist der Platz frei?"), chunk("Ja, klar", "Ja, natürlich", "‘Kommst du mit?’ ‘Ja, klar.’", "Informell"), chunk("zusammen zur Schule", "gemeinsam in die Schule", "Wir gehen zusammen zur Schule.")],
        deepNotes: ["Lerne ‘am Fenster’ als Gruppe: Ich sitze am Fenster.", "‘Ist der Platz frei?’ ist eine natürliche Frage im Café, Bus oder Zug."],
        shadowing: ["Ist der Platz frei?", "Ja, klar.", "Wir gehen zusammen zur Schule."],
      },
      {
        title: "Nach der Schule",
        text: "Ich heiße Leo und wohne mit meiner Familie. Am Dienstag spiele ich Volleyball. Das Training beginnt um vier Uhr. Mein Freund Sam ist auch im Team.\n\nIch nehme eine Flasche Wasser mit. Nach dem Training bin ich müde, aber glücklich. Zu Hause esse ich mit meiner Familie. Dann lese ich ein bisschen.",
        expressions: [chunk("am Dienstag", "an diesem Wochentag", "Am Dienstag habe ich Zeit."), chunk("um vier Uhr", "zu dieser Uhrzeit", "Wir treffen uns um vier Uhr."), chunk("zu Hause", "in meiner Wohnung oder meinem Haus", "Heute bleibe ich zu Hause."), chunk("ein bisschen", "eine kleine Menge", "Ich spreche ein bisschen Deutsch.")],
        deepNotes: ["Für Tage: am Dienstag. Für Uhrzeiten: um vier Uhr.", "‘Ich nehme Wasser mit’: Bei ‘mitnehmen’ steht ‘mit’ am Satzende."],
        shadowing: ["Das Training beginnt um vier Uhr.", "Ich nehme eine Flasche Wasser mit.", "Ich lese ein bisschen."],
      },
      {
        title: "Ein Spaziergang",
        text: "Heute ist Samstag. Die Sonne scheint. Ich möchte nach draußen gehen und rufe meine Freundin an. ‘Hast du heute Zeit?’, frage ich.\n\nWir treffen uns im Park. Dort gibt es viele Bäume und einen kleinen See. Wir gehen spazieren und machen Fotos. Danach essen wir etwas. Der Tag ist einfach schön.",
        expressions: [chunk("nach draußen gehen", "das Haus verlassen", "Ich möchte nach draußen gehen."), chunk("Hast du heute Zeit?", "Kannst du dich heute treffen?", "Hast du heute Zeit für einen Spaziergang?"), chunk("es gibt", "etwas ist an einem Ort vorhanden", "Im Park gibt es einen See."), chunk("spazieren gehen", "ohne Eile zu Fuß unterwegs sein", "Wir gehen am Sonntag spazieren.")],
        deepNotes: ["‘Es gibt’ bleibt auch mit mehreren Dingen gleich: Es gibt viele Bäume.", "‘Danach’ verbindet die nächsten Schritte: Wir gehen spazieren. Danach essen wir."],
        shadowing: ["Hast du heute Zeit?", "Wir treffen uns im Park.", "Der Tag ist einfach schön."],
      },
    ],
    A2: [
      {
        title: "Der Bus kommt nicht",
        text: "Gestern hatte ich um neun Uhr einen Termin. Ich bin früh aus dem Haus gegangen und habe an der Haltestelle gewartet. Nach zwanzig Minuten war der Bus immer noch nicht da. Eine Frau hat auf ihr Handy geschaut. ‘Auf der Straße gibt es ein Problem’, hat sie gesagt.\n\nIch habe im Büro angerufen und erklärt, dass ich später komme. Zum Glück konnten wir den Termin verschieben. Am Ende bin ich zu Fuß gegangen. Ich war außer Atem, aber für den neuen Termin noch pünktlich.",
        expressions: [chunk("immer noch nicht", "auch jetzt noch nicht", "Der Zug ist immer noch nicht da."), chunk("den Termin verschieben", "einen neuen Zeitpunkt für einen Termin wählen", "Können wir den Termin verschieben?"), chunk("zu Fuß gehen", "gehen, statt ein Verkehrsmittel zu nehmen", "Ich gehe heute zu Fuß zur Schule."), chunk("außer Atem", "nach Bewegung schnell atmen müssen", "Nach der Treppe war ich außer Atem.")],
        deepNotes: ["‘Ich habe gewartet’, aber ‘ich bin gegangen’: Lerne die häufigen Perfektformen als Gruppen.", "‘Zum Glück’ zeigt, dass etwas gut ausgegangen ist."],
        shadowing: ["Der Bus ist immer noch nicht da.", "Können wir den Termin verschieben?", "Am Ende bin ich zu Fuß gegangen."],
      },
      {
        title: "Zusammen kochen",
        text: "Mein Bruder und ich wollten für unsere Eltern kochen. Wir haben ein einfaches Rezept ausgesucht und eine Einkaufsliste geschrieben. Im Supermarkt haben wir gemerkt, dass die Liste noch zu Hause lag. Mein Bruder konnte sich zum Glück an fast alles erinnern.\n\nZu Hause habe ich das Gemüse geschnitten. Mein Bruder hat die Soße gemacht. Vor dem Essen haben wir kurz aufgeräumt. Das Essen war lecker, und unsere Eltern haben sich gefreut. Nächstes Mal möchten wir etwas Neues ausprobieren.",
        expressions: [chunk("ein Rezept aussuchen", "sich für ein Rezept entscheiden", "Wir suchen ein Rezept für das Wochenende aus."), chunk("sich an etwas erinnern", "etwas noch wissen", "Ich kann mich an den Namen erinnern."), chunk("kurz aufräumen", "für kurze Zeit Ordnung machen", "Vor dem Besuch räume ich kurz auf."), chunk("etwas Neues ausprobieren", "etwas zum ersten Mal machen", "Heute möchte ich etwas Neues ausprobieren.")],
        deepNotes: ["‘Sich erinnern an’: Ich erinnere mich an den Namen.", "‘Etwas Neues’: Nach ‘etwas’ wird ein als Nomen verwendetes Adjektiv großgeschrieben."],
        shadowing: ["Die Liste lag noch zu Hause.", "Ich kann mich an fast alles erinnern.", "Wir möchten etwas Neues ausprobieren."],
      },
      {
        title: "Ein Abend ohne Handy",
        text: "Normalerweise schaue ich nach der Schule sofort auf mein Handy. Gestern habe ich es in einem anderen Zimmer gelassen. Am Anfang war mir langweilig. Dann habe ich ein Buch genommen und eine halbe Stunde gelesen.\n\nSpäter habe ich mit meiner Oma telefoniert. Wir hatten viel zu erzählen. Ich benutze mein Handy natürlich weiterhin. Aber beim Abendessen lege ich es jetzt öfter weg. So höre ich besser zu und bekomme mehr vom Gespräch mit.",
        expressions: [chunk("Am Anfang", "zu Beginn", "Am Anfang war die Aufgabe schwierig."), chunk("mir war langweilig", "ich wusste nichts Interessantes zu tun", "Am Sonntag war mir langweilig."), chunk("das Handy weglegen", "das Handy zur Seite legen und nicht benutzen", "Ich lege beim Essen das Handy weg."), chunk("besser zuhören", "aufmerksamer hören, was jemand sagt", "Ohne Musik kann ich besser zuhören.")],
        deepNotes: ["‘Mir ist langweilig’ beschreibt das Gefühl. ‘Ich bin langweilig’ beschreibt die Person als uninteressant.", "‘Zuhören’ ist aktiv: Ich höre dir zu. ‘Hören’ kann einfach das Wahrnehmen eines Geräuschs sein."],
        shadowing: ["Am Anfang war mir langweilig.", "Beim Abendessen lege ich das Handy weg.", "So höre ich besser zu."],
      },
    ],
    B1: [
      {
        title: "Was ein Team braucht",
        text: "Unser Volleyballteam hat letzte Woche verloren, obwohl wir viel trainiert hatten. Zuerst haben wir nur über die Fehler am Ende gesprochen. Unser Trainer wollte aber wissen, was während des ganzen Spiels passiert war. Immer wenn wir zurücklagen, haben wir kaum noch miteinander geredet.\n\nBeim nächsten Training haben wir deshalb etwas verändert. Nach jedem Punkt haben wir uns kurz abgesprochen. Am Anfang war das ungewohnt, aber wir konnten uns besser konzentrieren. Fehler gab es weiterhin. Doch statt einen Schuldigen zu suchen, haben wir gemeinsam überlegt, wie wir weitermachen können.",
        expressions: [chunk("sich kurz absprechen", "gemeinsam eine kleine Entscheidung treffen", "Sprechen wir uns vor dem Spiel kurz ab."), chunk("sich besser konzentrieren", "mit mehr Aufmerksamkeit bei einer Sache bleiben", "Nach einer Pause kann ich mich besser konzentrieren."), chunk("einen Schuldigen suchen", "jemanden für ein Problem verantwortlich machen wollen", "Es hilft wenig, nur einen Schuldigen zu suchen."), chunk("gemeinsam überlegen", "zusammen nachdenken", "Wir sollten gemeinsam überlegen, was jetzt hilft.")],
        deepNotes: ["‘Obwohl’ und ‘wenn’ führen Nebensätze ein: Das Verb steht am Ende.", "‘Statt … zu’ zeigt eine Alternative: statt einen Schuldigen zu suchen."],
        shadowing: ["Wir sprechen uns kurz ab.", "Am Anfang war das ungewohnt.", "Wir haben gemeinsam überlegt, wie wir weitermachen können."],
      },
      {
        title: "Nicht jedes Wort nachschlagen",
        text: "Früher wollte ich beim Lesen jedes Wort verstehen. Wenn ich etwas nicht kannte, habe ich sofort im Wörterbuch gesucht. Dadurch war ich langsam und wusste manchmal nicht mehr, worum es im Text ging. Eine Lehrerin hat mir empfohlen, zuerst einen ganzen Abschnitt zu lesen.\n\nIch habe gemerkt, dass ich viele Wörter aus dem Zusammenhang verstehen kann. Einzelne Details bleiben zwar unklar, aber der Inhalt ist oft verständlich. Heute markiere ich nur einige wichtige Ausdrücke und schaue sie später nach. Vor allem achte ich auf Formulierungen, die ich selbst verwenden möchte.",
        expressions: [chunk("aus dem Zusammenhang", "mithilfe der anderen Informationen im Text", "Ich verstehe das Wort aus dem Zusammenhang."), chunk("worum es geht", "was das Thema oder der Inhalt ist", "Kannst du erklären, worum es geht?"), chunk("später nachschlagen", "die Bedeutung erst danach suchen", "Ich werde den Ausdruck später nachschlagen."), chunk("auf Formulierungen achten", "bestimmte sprachliche Ausdrücke bewusst bemerken", "Ich achte auf Formulierungen für Gespräche.")],
        deepNotes: ["‘Zwar … aber’ verbindet eine Einschränkung mit einem wichtigeren Gegenpunkt.", "Lerne nicht nur ‘achten’, sondern ‘achten auf + Akkusativ’."],
        shadowing: ["Kannst du erklären, worum es geht?", "Ich verstehe viel aus dem Zusammenhang.", "Ich achte auf Formulierungen, die ich selbst verwenden möchte."],
      },
      {
        title: "Neue Nachbarn",
        text: "Letzten Monat ist eine neue Familie in unser Haus eingezogen. Ich habe sie getroffen, als ich mein Fahrrad nach oben getragen habe. Ihre Tochter geht jetzt auf meine Schule. Wir haben über die Lehrer gesprochen und darüber, welcher Weg zur Schule am schnellsten ist.\n\nEin paar Tage später haben wir zusammen Mittag gegessen. Zuerst hatten wir scheinbar wenig gemeinsam. Dann haben wir festgestellt, dass wir beide gern Musik hören. Sie hat mir eine Band gezeigt, die ich noch nicht kannte. Neue Kontakte entstehen manchmal aus einem ganz normalen Gespräch. Man muss nicht sofort etwas besonders Kluges sagen.",
        expressions: [chunk("in ein Haus einziehen", "anfangen, in einem Haus zu wohnen", "Die Familie ist gestern in das Haus eingezogen."), chunk("wenig gemeinsam haben", "wenige gemeinsame Interessen haben", "Wir dachten, dass wir wenig gemeinsam haben."), chunk("haben wir festgestellt", "haben wir bemerkt oder herausgefunden", "Wir haben festgestellt, dass wir denselben Film mögen."), chunk("Kontakte entstehen", "Menschen lernen sich kennen", "Kontakte entstehen oft durch gemeinsame Aktivitäten.")],
        deepNotes: ["‘Als’ beschreibt hier einen einzelnen vergangenen Moment: als ich das Fahrrad getragen habe.", "‘Scheinbar’ kann einen Eindruck ausdrücken, der sich später als falsch herausstellt."],
        shadowing: ["Wir hatten zuerst wenig gemeinsam.", "Dann haben wir etwas festgestellt.", "Man muss nicht sofort etwas besonders Kluges sagen."],
      },
    ],
    B2: [
      {
        title: "Wem gehört das Viertel?",
        text: "Ein Wohnviertel kann sich verändern, ohne dass seine Bewohner umziehen. Neue Cafés eröffnen, die Mieten steigen und vertraute Geschäfte verschwinden. Manche begrüßen die Investitionen. Andere haben den Eindruck, dass ihr eigener Alltag im Viertel immer weniger Platz findet. Beide Reaktionen lassen sich nachvollziehen.\n\nWer jede Veränderung als Fortschritt bezeichnet, übersieht die Menschen, die ihre Kosten tragen. Wer dagegen jedes neue Geschäft ablehnt, übersieht mögliche Verbesserungen. Entscheidend ist deshalb auch, wer mitreden darf. Eine öffentliche Diskussion ist nur dann sinnvoll, wenn die Entscheidung tatsächlich noch beeinflusst werden kann. Sonst besteht die Gefahr, dass Beteiligung lediglich Zustimmung zu einem bereits fertigen Plan organisieren soll.",
        expressions: [chunk("lässt sich nachvollziehen", "ist verständlich, wenn man die Gründe betrachtet", "Die Sorge lässt sich nachvollziehen."), chunk("die Kosten tragen", "für Nachteile oder Ausgaben verantwortlich sein", "Die Bewohner tragen einen Teil der Kosten."), chunk("wer mitreden darf", "wer Einfluss auf eine Entscheidung nehmen kann", "Wir sollten klären, wer mitreden darf."), chunk("besteht die Gefahr", "ist ein negatives Ergebnis möglich", "Es besteht die Gefahr, dass wichtige Stimmen fehlen.")],
        deepNotes: ["‘Lässt sich nachvollziehen’ ist ein sachlicher Ausdruck für Verständnis, ohne vollständige Zustimmung.", "‘Lediglich’ grenzt eine scheinbar größere Leistung auf etwas Kleineres ein: lediglich Zustimmung."],
        shadowing: ["Beide Reaktionen lassen sich nachvollziehen.", "Entscheidend ist, wer mitreden darf.", "Die Entscheidung kann noch beeinflusst werden."],
      },
      {
        title: "Ein hilfreicher Streit",
        text: "Bei einer Gruppenarbeit wollte ich die Präsentation möglichst einfach halten. Meine Partnerin wollte mehr Beispiele einbauen. Ich dachte, sie mache alles unnötig kompliziert. Sie dachte, ich nehme die Aufgabe nicht ernst. Wir haben beide nicht gefragt, welche Sorge hinter der anderen Position steckte.\n\nAls wir darüber gesprochen haben, ließ sich der Konflikt leichter lösen. Mir ging es um den Zeitdruck. Ihr ging es darum, dass das Publikum unsere Hauptaussage verstehen konnte. Wir einigten uns auf drei Folien mit jeweils einem klaren Beispiel. Im Rückblick ging es nicht nur um den Plan, sondern auch um unsere Annahmen über die andere Person. Eine Nachfrage war hilfreicher als eine lange Verteidigung.",
        expressions: [chunk("die Aufgabe ernst nehmen", "sich sorgfältig mit der Aufgabe beschäftigen", "Ich nehme die Aufgabe durchaus ernst."), chunk("mir ging es um", "mein eigentliches Anliegen war", "Mir ging es um eine faire Lösung."), chunk("sich einigen auf", "gemeinsam eine Entscheidung treffen", "Wir haben uns auf einen Termin geeinigt."), chunk("Im Rückblick", "wenn man später auf etwas zurückschaut", "Im Rückblick hätte ich früher fragen sollen.")],
        deepNotes: ["‘Mir geht es um …’ erklärt ein Anliegen und klingt weniger vorwurfsvoll als ‘Du machst immer …’.", "‘Durchaus’ kann einer vermuteten Kritik widersprechen: Ich nehme die Aufgabe durchaus ernst."],
        shadowing: ["Ich nehme die Aufgabe durchaus ernst.", "Mir ging es um den Zeitdruck.", "Wir einigten uns auf einen klaren Plan."],
      },
      {
        title: "KI beim Lernen",
        text: "Eine KI kann in wenigen Sekunden eine flüssig formulierte Antwort liefern. Das macht es verlockend, die Antwort mit dem Ende einer Lernaufgabe gleichzusetzen. Doch eine Erklärung zu lesen bedeutet noch nicht, sie selbst geben zu können. Auch ein überzeugender Ton garantiert keine sachliche Richtigkeit.\n\nTrotzdem kann ein solches Werkzeug hilfreich sein. Man könnte zunächst selbst einen Lösungsversuch machen, dann nach einem Gegenbeispiel fragen und anschließend die Erklärung ohne Bildschirm wiedergeben. Dabei wird sichtbar, was man tatsächlich verstanden hat. Entscheidend ist, ob das Werkzeug das eigene Denken ersetzt oder neue Anlässe zum Denken schafft. Die Geschwindigkeit der Antwort allein sagt darüber wenig aus.",
        expressions: [chunk("flüssig formuliert", "sprachlich gut lesbar oder hörbar", "Die Antwort ist flüssig formuliert, aber ungenau."), chunk("mit etwas gleichsetzen", "zwei Dinge als gleich behandeln", "Schnelligkeit sollte man nicht mit Qualität gleichsetzen."), chunk("nach einem Gegenbeispiel fragen", "um ein Beispiel bitten, das einer Aussage widerspricht", "Ich frage nach einem Gegenbeispiel."), chunk("sagt darüber wenig aus", "liefert dazu wenig verlässliche Information", "Die Länge eines Textes sagt darüber wenig aus.")],
        deepNotes: ["‘Man könnte’ macht einen Vorschlag, ohne ihn als einzige richtige Methode darzustellen.", "‘Ersetzen’ und ‘unterstützen’ beschreiben unterschiedliche Rollen eines Werkzeugs."],
        shadowing: ["Ein überzeugender Ton garantiert keine Richtigkeit.", "Könnten Sie ein Gegenbeispiel nennen?", "Die Geschwindigkeit allein sagt darüber wenig aus."],
      },
    ],
    C1: [
      {
        title: "Was heißt Chancengleichheit?",
        text: "Wenn zwei Menschen dieselbe Prüfung schreiben dürfen, haben sie formal die gleiche Chance. Daraus folgt jedoch nicht, dass ihre Ausgangsbedingungen vergleichbar sind. Wer neben der Schule arbeitet, Angehörige betreut oder keinen ruhigen Arbeitsplatz hat, muss zusätzliche Hindernisse überwinden, bevor die eigentliche Leistung überhaupt sichtbar wird.\n\nDas entwertet individuelle Anstrengung keineswegs. Es macht aber deutlich, dass Anstrengung unter Bedingungen stattfindet, die ungleich verteilt sind. Einzelne Erfolgsgeschichten können Mut machen. Als Beleg dafür, dass strukturelle Hindernisse keine Rolle spielen, reichen sie nicht aus.\n\nEine differenzierte Diskussion sollte daher zwischen gleichen Regeln und tatsächlich zugänglichen Möglichkeiten unterscheiden. Vollständig gleiche Lebensbedingungen sind kaum herzustellen. Dennoch lässt sich begründet fragen, welche vermeidbaren Hürden eine Gesellschaft abbauen sollte. Chancengleichheit wird dadurch nicht zu einem einfachen Versprechen, sondern zu einer Aufgabe, deren Umsetzung immer wieder überprüft werden muss.",
        expressions: [chunk("Daraus folgt jedoch nicht", "diese Schlussfolgerung ist dadurch noch nicht begründet", "Daraus folgt jedoch nicht, dass die Maßnahme wirkungslos ist.", "Sachliche Argumentation"), chunk("keineswegs", "auf keinen Fall; hier: ausdrücklich nicht", "Das ist keineswegs selbstverständlich."), chunk("reichen sie nicht aus", "sind sie als Grundlage nicht genügend", "Einzelne Beispiele reichen als Beleg nicht aus."), chunk("vermeidbare Hürden abbauen", "Hindernisse beseitigen, die nicht notwendig sind", "Wir sollten vermeidbare Hürden abbauen.")],
        deepNotes: ["‘Keineswegs’ weist eine mögliche Überinterpretation deutlich zurück.", "Unterscheide ‘gleiche Regeln’, ‘vergleichbare Bedingungen’ und ‘zugängliche Möglichkeiten’: Sie bezeichnen verschiedene Dimensionen von Fairness."],
        shadowing: ["Daraus folgt jedoch nicht, dass die Bedingungen vergleichbar sind.", "Das entwertet individuelle Anstrengung keineswegs.", "Einzelne Beispiele reichen als Beleg nicht aus."],
      },
      {
        title: "Kritik, die weiterhilft",
        text: "‘Du musst selbstbewusster werden’ klingt zunächst nach einem hilfreichen Rat. Doch die Formulierung benennt eher einen gewünschten Eindruck als einen konkreten nächsten Schritt. Eine zurückhaltende Person braucht vielleicht mehr Zeit zum Formulieren und nicht bloß die Aufforderung, lauter zu sprechen.\n\nHilfreiche Rückmeldungen beziehen sich auf eine beobachtbare Stelle: ‘Dein Beispiel ist klar, aber der Übergang zur Schlussfolgerung bleibt für mich offen.’ Damit wird weder die ganze Arbeit abgewertet noch die Schwierigkeit verschwiegen. Zugleich entsteht Raum für eine Nachfrage. Vielleicht wurde die Verbindung vorausgesetzt; vielleicht fehlt sie tatsächlich.\n\nAuch kleine sprachliche Entscheidungen verändern den Ton. ‘Ich kann den Zusammenhang hier noch nicht ganz nachvollziehen’ lässt eher eine gemeinsame Klärung zu als ‘Das ergibt keinen Sinn’. Höflichkeit und Präzision stehen also nicht zwangsläufig im Widerspruch. Eine vorsichtige Formulierung kann Kritik erst so genau machen, dass jemand etwas damit anfangen kann.",
        expressions: [chunk("bleibt für mich offen", "ist aus meiner Sicht noch nicht geklärt", "Die Begründung bleibt für mich offen.", "Rückmeldung mit eigener Perspektive"), chunk("Raum für eine Nachfrage", "die Möglichkeit, etwas weiter zu klären", "Die Formulierung schafft Raum für eine Nachfrage."), chunk("noch nicht ganz nachvollziehen", "einen Zusammenhang bisher nicht vollständig verstehen", "Ich kann den Zusammenhang noch nicht ganz nachvollziehen."), chunk("etwas damit anfangen können", "etwas praktisch nutzen oder verstehen können", "Mit diesem Hinweis kann ich etwas anfangen.", "Natürliches Alltagsdeutsch")],
        deepNotes: ["‘Für mich’, ‘hier’ und ‘noch’ begrenzen die Kritik auf eine Perspektive, eine Stelle und einen vorläufigen Stand.", "‘Damit kann ich etwas anfangen’ ist idiomatisch und alltäglich. ‘Dieser Hinweis ist verwertbar’ passt eher in sachliche Fachsprache."],
        shadowing: ["Der Übergang bleibt für mich offen.", "Ich kann den Zusammenhang noch nicht ganz nachvollziehen.", "Mit diesem Hinweis kann ich etwas anfangen."],
      },
      {
        title: "Beschäftigt oder wirksam?",
        text: "Eine abgehakte Aufgabe vermittelt ein angenehmes Gefühl von Fortschritt. Gerade deshalb besteht die Versuchung, zuerst das zu erledigen, was sich schnell abschließen lässt. Die wichtigere Arbeit bleibt liegen, weil ihr Anfang unklar ist oder ihr Ergebnis erst später sichtbar wird.\n\nKleine Aufgaben sind deshalb nicht grundsätzlich unwichtig. Eine beantwortete Nachricht kann jemand anderem das Weiterarbeiten ermöglichen. Problematisch wird es, wenn sichtbare Aktivität die Entscheidung darüber ersetzt, was gerade wirklich zählt. Ein sinnvoller Plan verbindet ein übergeordnetes Ziel mit einem ersten Schritt, der konkret genug ist, um heute begonnen zu werden.\n\n‘Am Aufsatz arbeiten’ beschreibt eine Absicht. ‘Einen Absatz schreiben, der den stärksten Einwand aufgreift’ gibt der Arbeit eine Richtung. Nicht jede produktive Stunde fühlt sich erfolgreich an. Entscheidend ist eher, ob sich im Rückblick erkennen lässt, wozu die Anstrengung beigetragen hat.",
        expressions: [chunk("bleibt liegen", "wird nicht weiterbearbeitet oder erledigt", "Die wichtige Aufgabe bleibt seit Tagen liegen."), chunk("was gerade wirklich zählt", "was im Moment tatsächlich wichtig ist", "Wir müssen klären, was gerade wirklich zählt."), chunk("den stärksten Einwand aufgreifen", "auf die wichtigste Gegenposition eingehen", "Der Absatz greift den stärksten Einwand auf.", "Argumentation"), chunk("wozu etwas beigetragen hat", "welche Wirkung etwas unterstützt hat", "Ich möchte wissen, wozu meine Arbeit beigetragen hat.")],
        deepNotes: ["‘Grundsätzlich’ lässt Ausnahmen zu; der Text behauptet nicht, dass kleine Aufgaben immer wichtig sind.", "‘Eine Absicht beschreiben’ und ‘eine Richtung geben’ unterscheiden Wunsch und umsetzbaren nächsten Schritt."],
        shadowing: ["Die wichtigere Arbeit bleibt liegen.", "Was zählt gerade wirklich?", "Der Absatz greift den stärksten Einwand auf."],
      },
    ],
    C2: [
      {
        title: "Wie weit trägt ein Befund?",
        text: "Eine Aussage kann an Überzeugungskraft gewinnen, während sie sich zugleich von ihrer Beleggrundlage entfernt. Aus ‘Die Studie zeigt einen Zusammenhang’ wird ‘Die Ursache ist wissenschaftlich bewiesen’. Dabei geht nicht nur eine Einzelheit verloren. Der Leser soll eine Schlussfolgerung ziehen, die der ursprüngliche Befund gerade nicht rechtfertigt.\n\nPräzises Schreiben bewahrt die Reichweite einer Aussage. Ein Ergebnis kann mit einer Erklärung vereinbar sein, ohne sie eindeutig zu bestätigen. Ebenso kann ein nicht nachgewiesener Effekt auf die Grenzen einer Untersuchung zurückgehen, statt seine grundsätzliche Unmöglichkeit zu belegen. Solche Einschränkungen wirken mitunter ausweichend. Tatsächlich können sie aber erst deutlich machen, wo Vertrauen in ein Ergebnis begründet ist und wo weitere Fragen offenbleiben.\n\nSprachliche Zurückhaltung besteht nicht darin, jeden Satz mit ‘möglicherweise’ abzuschwächen. Sie verlangt, den Grad der Gewissheit bewusst zu wählen. ‘Die Befunde sprechen deutlich dafür’ erfüllt eine andere Funktion als ‘Die Befunde lassen die Frage offen’. Entscheidend ist, dass Leser erkennen können, welche Aussagekraft der Autor seinem Material tatsächlich zuschreibt.",
        expressions: [chunk("die Reichweite einer Aussage", "der Umfang dessen, was eine Aussage begründet behauptet", "Die Einschränkung bewahrt die Reichweite der Aussage.", "Wissenschaftliches Schreiben"), chunk("mit einer Erklärung vereinbar sein", "einer Erklärung nicht widersprechen, sie aber nicht unbedingt beweisen", "Der Befund ist mit mehreren Erklärungen vereinbar."), chunk("auf die Grenzen zurückgehen", "durch die begrenzten Möglichkeiten verursacht sein", "Das Ergebnis könnte auf die Grenzen der Methode zurückgehen."), chunk("Aussagekraft zuschreiben", "einschätzen, wie viel etwas belegt oder erklärt", "Man sollte dem Beispiel nicht zu viel Aussagekraft zuschreiben.")],
        deepNotes: ["‘Vereinbar sein mit’, ‘dafür sprechen’ und ‘beweisen’ markieren unterschiedliche Belegstärken.", "Achte auf ‘kann’, ‘könnte’ und ‘mitunter’: Jede Einschränkung hat eine konkrete Funktion und sollte nicht pauschal entfernt werden."],
        shadowing: ["Der Befund ist mit mehreren Erklärungen vereinbar.", "Die Befunde sprechen deutlich dafür.", "Die Befunde lassen die Frage offen."],
      },
      {
        title: "Was zwischen den Worten liegt",
        text: "‘Das ist ja ein interessanter Vorschlag’ kann ehrliches Interesse ausdrücken, aber auch zurückhaltende Skepsis oder einen höflichen Themenwechsel einleiten. Welche Lesart naheliegt, hängt vom Gesprächsverlauf, von der Betonung und von der anschließenden Reaktion ab. Sprachliches Verstehen umfasst deshalb mehr als die Bedeutung einzelner Wörter. Es verlangt ein Gespür dafür, was ausgesprochen und was nur nahegelegt wird.\n\nDieses Gespür ist allerdings keine Fähigkeit zum Gedankenlesen. Eine Pause kann Widerspruch andeuten, ebenso gut aber Nachdenken oder Ablenkung. Wer jedes Zögern als versteckte Kritik auffasst, legt sich möglicherweise zu früh auf eine Deutung fest. Hilfreicher ist es, die Interpretation zunächst offenzuhalten und bei Bedarf nachzufragen: ‘Verstehe ich das als Alternative oder als Einwand gegen den bisherigen Plan?’\n\nAuch scheinbar ähnliche Zustimmungen unterscheiden sich. ‘Ich kann deinen Punkt nachvollziehen’ erkennt die Überlegung an, ohne sie unbedingt zu übernehmen. ‘Das überzeugt mich’ geht deutlich weiter. Solche Unterschiede wirken klein, prägen aber, wie verbindlich eine Antwort verstanden wird. Sprachliche Natürlichkeit zeigt sich gerade darin, diese feinen Abstufungen passend zur Situation zu wählen.",
        expressions: [chunk("was nur nahegelegt wird", "was indirekt vermittelt, aber nicht ausdrücklich gesagt wird", "Achte darauf, was nur nahegelegt wird."), chunk("sich auf eine Deutung festlegen", "eine Interpretation als maßgeblich annehmen", "Ich möchte mich noch nicht auf eine Deutung festlegen."), chunk("Ich kann deinen Punkt nachvollziehen", "ich verstehe deine Überlegung, ohne zwingend zuzustimmen", "Ich kann deinen Punkt nachvollziehen, sehe aber noch ein Problem.", "Gesprochene Anerkennung mit möglicher Distanz"), chunk("Das überzeugt mich", "ich finde das Argument stark genug und stimme ihm zu", "Das überzeugt mich; lass uns den Plan ändern.")],
        deepNotes: ["Die Modalpartikel ‘ja’ kann Gemeinsamkeit, Überraschung oder eine besondere Haltung markieren. Ihre Bedeutung ergibt sich aus Ton und Kontext.", "Vergleiche Verständnis, Anerkennung und Zustimmung. Formuliere dieselbe Reaktion einmal warm, einmal skeptisch und einmal sachlich."],
        shadowing: ["Ich kann deinen Punkt nachvollziehen.", "Das überzeugt mich.", "Verstehe ich das als Alternative oder als Einwand gegen den bisherigen Plan?"],
      },
      {
        title: "Ein Urteil, das sich prüfen lässt",
        text: "Eine tragfähige Argumentation zeichnet sich nicht dadurch aus, dass sie jeden Einwand abwehrt. Ihre zentrale These bleibt vielmehr begründbar, nachdem die Einwände ernsthaft berücksichtigt worden sind. Dafür kann es nötig sein, den Geltungsbereich einzuschränken, zunächst zusammengefasste Fälle zu unterscheiden oder zuzugeben, dass eine Erklärung nur einen Teil der Befunde erfasst.\n\nBei einem Vorschlag für kostenlosen Nahverkehr könnten etwa Zugänglichkeit und weniger Autoverkehr im Vordergrund stehen. Ein berechtigter Einwand lautet, dass begrenzte Mittel möglicherweise mehr bewirken, wenn sie in häufigere und zuverlässigere Verbindungen fließen. Das widerlegt den Vorschlag nicht automatisch. Es verändert aber, was seine Befürworter begründen müssen: Warum sind gerade die Fahrpreise im jeweiligen Umfeld das entscheidende Hindernis? Eine wünschenswerte Absicht allein sichert noch kein entsprechendes Ergebnis.\n\nDie eigene Position daraufhin zu präzisieren, wird leicht als Rückzug verstanden. Es kann jedoch zeigen, dass eine These überprüfbar wird. Ziel ist weder eine endlose Reihe von Vorbehalten noch demonstrative Gewissheit, sondern ein Urteil, dessen Voraussetzungen und Grenzen andere nachvollziehen können.",
        expressions: [chunk("eine tragfähige Argumentation", "eine Begründung, die einer sachlichen Prüfung standhält", "Die Beispiele stützen eine tragfähige Argumentation."), chunk("den Geltungsbereich einschränken", "genauer begrenzen, für welche Fälle eine Aussage gilt", "Wir sollten den Geltungsbereich der These einschränken."), chunk("im jeweiligen Umfeld", "unter den konkreten Bedingungen des betrachteten Ortes", "Die Maßnahme muss im jeweiligen Umfeld bewertet werden."), chunk("die Position präzisieren", "die eigene Ansicht genauer und differenzierter formulieren", "Der Einwand hat mich dazu gebracht, meine Position zu präzisieren.")],
        deepNotes: ["Der Text behandelt einen Einwand als Anlass zur Prüfung, ohne ihn vorschnell als Widerlegung zu verwenden.", "‘Wünschenswert’ bewertet das Ziel; ‘wirksam’ bewertet den tatsächlichen Effekt. Eine saubere Argumentation unterscheidet beides."],
        shadowing: ["Die zentrale These bleibt begründbar.", "Wir sollten den Geltungsbereich einschränken.", "Eine wünschenswerte Absicht sichert noch kein entsprechendes Ergebnis."],
      },
    ],
  },
};

function rotate<T>(items: readonly T[], index: number): T {
  const safeIndex = Number.isFinite(index) ? Math.trunc(index) : 0;
  return items[((safeIndex % items.length) + items.length) % items.length];
}

export function getInput(language: Language, level: Level, index = 0): FluencyInput {
  const entries = passages[language][level];
  const passage = rotate(entries, index);
  return {
    ...passage,
    id: `${language}-${level}-input-${entries.indexOf(passage)}`,
    sourceLabel: language === "en" ? "Original practice passage" : "Originaler Übungstext",
  };
}

export const externalSources: Record<Language, { title: string; url: string; kind: "listen" | "read" }[]> = {
  en: [
    { title: "BBC · 6 Minute English", url: "https://www.bbc.co.uk/learningenglish/english/features/6-minute-english", kind: "listen" },
    { title: "NPR · Life Kit", url: "https://www.npr.org/lifekit", kind: "listen" },
    { title: "BBC · Future", url: "https://www.bbc.com/future", kind: "read" },
    { title: "British Council · Reading", url: "https://learnenglish.britishcouncil.org/skills/reading", kind: "read" },
  ],
  de: [
    { title: "DW · Langsam gesprochene Nachrichten", url: "https://learngerman.dw.com/de/langsam-gesprochene-nachrichten/s-60040332", kind: "listen" },
    { title: "Deutschlandfunk · Podcasts", url: "https://www.deutschlandfunk.de/podcasts", kind: "listen" },
    { title: "DW · Top-Thema", url: "https://learngerman.dw.com/de/top-thema/s-55861562", kind: "read" },
    { title: "Tagesschau · Nachrichten", url: "https://www.tagesschau.de/", kind: "read" },
  ],
};

const speaking: Record<Language, Record<Level, string[]>> = {
  en: {
    A1: ["Introduce yourself. Say where you live and what you like.", "Describe your room. What can you see?", "Talk about your day. When do you get up, eat and go to school?", "Describe a friend or someone in your family.", "Say what you like to eat and drink.", "Talk about a sport you like. When do you play?", "Describe the weather and your plans for today."],
    A2: ["What happened at school today? Tell the story in order.", "Describe your last weekend. What did you enjoy?", "Explain how to get from your home to school.", "Describe a meal you can make. What do you need?", "Talk about your volleyball training. What went well?", "Tell a friend about a book, film or song you like.", "Describe a small problem and how you solved it."],
    B1: ["Explain something you learned today. Give one example.", "Describe why today’s volleyball training went well or badly.", "Tell the story of a time your plans changed unexpectedly.", "What makes a good friend? Connect your view to an experience.", "Should students use phones at school? Explain your opinion.", "Describe a place where you feel at home and explain why.", "Talk about a habit you want to change. What would help?"],
    B2: ["Give your opinion about AI in learning. Explain a benefit and a risk.", "Is the American Dream still achievable? Explain what you mean by success.", "Explain a disagreement without making the other person sound unreasonable.", "Should cities make public transport free? Consider who benefits.", "Explain something difficult you learned today to a younger student.", "Does social media help people feel connected? Use a concrete example.", "Describe a decision you changed your mind about. What changed your view?"],
    C1: ["Is the American Dream still realistic? Distinguish possibility from a fair chance, then take a position.", "Explain a complex idea twice: first to a friend, then to an academic audience. Change the register naturally.", "Give your opinion about AI. Acknowledge the strongest objection before defending your view.", "What happened at school today? Tell it naturally, then reflect on an assumption you made.", "Explain why today’s volleyball training went well or badly without reducing it to winning or losing.", "Is being busy the same as being effective? Develop a nuanced answer using your own experience.", "Describe a social issue precisely. Separate what you know, what you infer and what you remain unsure about."],
    C2: ["Is the American Dream defensible as a promise? Define your terms, engage with a counterexample and refine your judgement.", "Explain the same controversial position to a friend and to a sceptical academic audience. Keep the meaning, change the tone.", "When does polite disagreement become unclear? Demonstrate a response that is tactful and still precise.", "Critique a claim you recently heard. Distinguish its persuasive wording from the evidence it actually offers.", "Describe an ordinary moment at school with natural detail, humour or understatement. Avoid making it sound like an essay.", "Discuss a policy you support. Identify when it might fail and whether that should change your position.", "Explain a difficult idea without jargon. Then add the nuance a specialist would need."],
  },
  de: {
    A1: ["Stell dich vor. Wo wohnst du, und was machst du gern?", "Beschreibe dein Zimmer. Was siehst du?", "Erzähle von deinem Tag. Wann stehst du auf?", "Beschreibe einen Freund oder eine Person aus deiner Familie.", "Was isst und trinkst du gern?", "Sprich über einen Sport. Wann spielst du?", "Wie ist das Wetter heute? Was möchtest du machen?"],
    A2: ["Erzähle, was heute in der Schule passiert ist.", "Beschreibe dein letztes Wochenende. Was war schön?", "Erkläre den Weg von deinem Zuhause zur Schule.", "Beschreibe ein Essen, das du kochen kannst.", "Erzähle von deinem Volleyballtraining. Was hat gut geklappt?", "Empfiehl einen Film, ein Buch oder ein Lied.", "Erzähle von einem kleinen Problem und deiner Lösung."],
    B1: ["Erkläre etwas, das du heute gelernt hast. Gib ein Beispiel.", "Warum lief dein Volleyballtraining gut oder schlecht?", "Erzähle von einem Tag, an dem deine Pläne sich geändert haben.", "Was macht eine gute Freundschaft aus? Begründe deine Meinung.", "Sollten Handys im Unterricht erlaubt sein? Erkläre deine Position.", "Beschreibe einen Ort, an dem du dich zu Hause fühlst.", "Welche Gewohnheit möchtest du ändern? Was könnte helfen?"],
    B2: ["Fasse deinen heutigen Schultag zusammen und erkläre, was dir wichtig war.", "Erkläre deine Meinung zu KI beim Lernen. Nenne einen Vorteil und ein Risiko.", "Argumentiere für oder gegen kostenlosen Nahverkehr.", "Beschreibe einen Streit so, dass beide Positionen verständlich werden.", "Erkläre einem jüngeren Schüler einen schwierigen Sachverhalt möglichst präzise.", "Verbinden soziale Medien Menschen wirklich? Nutze ein konkretes Beispiel.", "Erzähle von einer Entscheidung, bei der du deine Meinung geändert hast."],
    C1: ["Erkläre deine Meinung zu einem aktuellen gesellschaftlichen Thema. Nimm den stärksten Einwand ernst.", "Erkläre denselben schwierigen Sachverhalt zuerst einem Freund, dann in einem schulischen Vortrag. Passe das Register an.", "Argumentiere für oder gegen eine Position. Unterscheide Behauptung, Beleg und Schlussfolgerung.", "Fasse deinen heutigen Schultag natürlich zusammen und hinterfrage eine eigene Annahme.", "Erkläre, weshalb dein Volleyballtraining gelungen oder schwierig war. Vermeide einfache Schuldzuweisungen.", "Was unterscheidet Beschäftigung von wirksamer Arbeit? Begründe eine differenzierte Antwort.", "Was bedeutet Chancengleichheit? Unterscheide gleiche Regeln und vergleichbare Bedingungen."],
    C2: ["Diskutiere eine umstrittene Position und präzisiere sie nach einem berechtigten Gegenargument.", "Erkläre denselben Gedanken im Gespräch mit Freunden und vor einem skeptischen Fachpublikum. Bewahre die Nuance.", "Wann wird höflicher Widerspruch unklar? Formuliere eine natürliche, respektvolle und präzise Antwort.", "Prüfe eine Behauptung, die du kürzlich gehört hast. Welche Schlussfolgerung trägt die Beleggrundlage tatsächlich?", "Erzähle von einem alltäglichen Schulmoment mit natürlichen Details oder leiser Ironie. Vermeide einen Aufsatzton.", "Erörtere eine Maßnahme, die du befürwortest. Unter welchen Bedingungen könnte sie scheitern?", "Erkläre einen schwierigen Sachverhalt ohne Fachjargon und ergänze anschließend die nötige fachliche Differenzierung."],
  },
};

const writing: Record<Language, Record<Level, string[]>> = {
  en: {
    A1: ["Write a short introduction: your name, home and interests.", "Write five sentences about your usual day.", "Write a message inviting a friend to meet you.", "Describe your room in a few sentences.", "Write about what you like to eat and drink.", "Write a simple message saying when you are free.", "Describe your family or a close friend."],
    A2: ["Write a short message about what happened at school today.", "Describe last weekend. Use a clear order.", "Invite a friend to an activity. Include the time and place.", "Explain a small problem and ask for help politely.", "Write about a film you enjoyed and say why.", "Describe a meal and how to make it.", "Write a short plan for next weekend."],
    B1: ["Write a short argument about phones at school. Give a reason and an example.", "Describe something you learned today for a reader who knows little about it.", "Write a friendly message explaining why you need to change a plan.", "Describe a challenge in your volleyball training and what you learned from it.", "Recommend a book or film. Explain who would enjoy it.", "Write about a habit you changed. What made the change easier?", "Summarise a story in your own words, then add your reaction."],
    B2: ["Should AI be used for schoolwork? Write a short argument that considers a benefit and a risk.", "Write a balanced comment on whether success depends mainly on effort.", "Explain a disagreement fairly, then suggest a practical compromise.", "Write a concise review that separates description from judgement.", "Summarise an article without adding claims the author did not make.", "Write a formal request, then rewrite it as a natural message to a friend.", "Argue for a change at your school. Support your idea with a relevant example."],
    C1: ["Is the American Dream still realistic? Write a concise argument. Define success and address a serious objection.", "Write a paragraph explaining a complex idea. Revise it for clarity without losing nuance.", "Write the same request to a friend and to a university tutor. Adapt tone and level of directness.", "Analyse how a speaker persuades an audience. Connect a specific language choice to its effect.", "Write a balanced comment on AI in education. Distinguish plausible benefits from supported claims.", "Summarise a source faithfully, then clearly separate your evaluation from the summary.", "Describe an ordinary event naturally. Replace overly formal wording with precise everyday English."],
    C2: ["Develop a position on equal opportunity, then narrow it in response to the strongest counterargument.", "Revise an overstated academic claim. Preserve the strength of the evidence and make its limits explicit.", "Write a tactful disagreement that cannot reasonably be mistaken for agreement. Explain your wording choices.", "Analyse an ambiguous passage. Compare two plausible readings and justify which is stronger.", "Write an argument whose conclusion weighs significance rather than counting advantages and disadvantages.", "Rewrite one paragraph for a friend, a school essay and an academic discussion. Keep the underlying meaning stable.", "Write a natural personal reflection with understatement or humour. Check that the tone serves the meaning."],
  },
  de: {
    A1: ["Stell dich in wenigen Sätzen vor: Name, Wohnort und Interessen.", "Schreibe fünf Sätze über deinen normalen Tag.", "Lade einen Freund mit einer kurzen Nachricht zu einem Treffen ein.", "Beschreibe dein Zimmer in wenigen Sätzen.", "Schreibe, was du gern isst und trinkst.", "Schreibe eine kurze Nachricht: Wann hast du Zeit?", "Beschreibe deine Familie oder einen guten Freund."],
    A2: ["Schreibe eine kurze Nachricht über deinen heutigen Schultag.", "Beschreibe dein letztes Wochenende in einer klaren Reihenfolge.", "Lade jemanden zu einer Aktivität ein. Nenne Zeit und Ort.", "Beschreibe ein kleines Problem und bitte höflich um Hilfe.", "Empfiehl einen Film und erkläre kurz, warum er dir gefällt.", "Beschreibe ein einfaches Essen und seine Zubereitung.", "Schreibe, was du am nächsten Wochenende machen möchtest."],
    B1: ["Sollten Handys in der Schule erlaubt sein? Begründe deine Meinung mit einem Beispiel.", "Erkläre etwas, das du heute gelernt hast, für jemanden ohne Vorwissen.", "Schreibe eine freundliche Nachricht, weil du einen Termin verschieben musst.", "Beschreibe eine Schwierigkeit beim Volleyball und was du daraus gelernt hast.", "Empfiehl ein Buch oder einen Film. Für wen ist die Empfehlung passend?", "Erzähle von einer Gewohnheit, die du verändert hast.", "Fasse eine Geschichte mit eigenen Worten zusammen und ergänze deine Reaktion."],
    B2: ["Erörtere kurz den Einsatz von KI beim Lernen. Berücksichtige einen Vorteil und ein Risiko.", "Schreibe eine begründete Stellungnahme zur Frage, ob Erfolg vor allem von Anstrengung abhängt.", "Stelle zwei Positionen in einem Streit fair dar und schlage einen Kompromiss vor.", "Schreibe eine kurze Rezension. Trenne Beschreibung und Bewertung.", "Fasse einen Sachtext zusammen, ohne eigene Behauptungen hinzuzufügen.", "Schreibe eine formelle Bitte und anschließend eine natürliche Nachricht an einen Freund.", "Begründe einen Verbesserungsvorschlag für deine Schule mit einem konkreten Beispiel."],
    C1: ["Erörtere, was Chancengleichheit praktisch bedeutet. Unterscheide gleiche Regeln und zugängliche Möglichkeiten.", "Erkläre einen schwierigen Sachverhalt in einem klaren Absatz. Überarbeite ihn, ohne wichtige Nuancen zu verlieren.", "Formuliere dieselbe Bitte an einen Freund und an eine Lehrkraft. Passe Register und Direktheit an.", "Analysiere eine sprachliche Strategie in einem Sachtext. Verbinde Beobachtung, Beleg und Wirkung.", "Schreibe eine differenzierte Stellungnahme zu KI in der Bildung. Trenne Möglichkeiten und gesicherte Aussagen.", "Fasse eine Quelle sachlich zusammen und kennzeichne anschließend deine eigene Bewertung.", "Beschreibe ein Alltagserlebnis natürlich. Ersetze unnötig steife Wendungen durch präzises Alltagsdeutsch."],
    C2: ["Entwickle eine Position zur Chancengleichheit und präzisiere sie nach dem stärksten Gegenargument.", "Überarbeite eine überzogene wissenschaftliche Aussage. Mache Belegstärke und Geltungsgrenzen erkennbar.", "Formuliere einen höflichen Widerspruch, der eindeutig bleibt. Begründe deine sprachlichen Entscheidungen.", "Interpretiere eine mehrdeutige Textstelle. Vergleiche zwei Lesarten und gewichte ihre Belege.", "Schreibe eine Erörterung, deren Schluss die Bedeutung der Argumente abwägt, statt sie nur zu zählen.", "Formuliere einen Absatz für Freunde, eine Klausur und eine fachliche Diskussion. Bewahre die Kernaussage.", "Schreibe eine persönliche Reflexion mit feiner Ironie oder Zurückhaltung. Prüfe, ob der Ton die Aussage trägt."],
  },
};

export function getSpeakingPrompt(language: Language, level: Level, index = 0): string {
  return rotate(speaking[language][level], index);
}

export function getWritingPrompt(language: Language, level: Level, index = 0): string {
  return rotate(writing[language][level], index);
}
