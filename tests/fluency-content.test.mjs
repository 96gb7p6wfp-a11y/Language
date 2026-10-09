import test from "node:test";
import assert from "node:assert/strict";
import { getInput, getSpeakingPrompt, getWritingPrompt, externalSources } from "../lib/fluency-content.ts";
import { foundationExercises, foundationWords } from "../lib/foundations.ts";

const languages = ["en", "de"];
const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];

test("both languages have distinct, honestly labelled input at every level", () => {
  const ids = new Set();
  for (const language of languages) for (const level of levels) {
    const entries = [0, 1, 2].map(index => getInput(language, level, index));
    assert.equal(new Set(entries.map(entry => entry.text)).size, 3);
    for (const entry of entries) {
      assert.ok(entry.id.startsWith(`${language}-${level}-input-`));
      assert.ok(!ids.has(entry.id));
      ids.add(entry.id);
      assert.match(entry.sourceLabel, /Original/i);
      assert.ok(entry.text.split(/\s+/).length >= 40);
      assert.ok(entry.expressions.length >= 4);
      assert.equal(new Set(entry.expressions.map(item => item.expression)).size, entry.expressions.length);
      assert.ok(entry.expressions.every(item => item.meaning && item.example));
      assert.ok(entry.deepNotes.length >= 2 && entry.shadowing.length >= 3);
    }
    assert.notEqual(getInput("en", level).text, getInput("de", level).text);
  }
  assert.equal(ids.size, 36);
});

test("rotation is deterministic, handles past indices and provides a week's varied output", () => {
  for (const language of languages) for (const level of levels) {
    assert.deepEqual(getInput(language, level, 0), getInput(language, level, 3));
    assert.deepEqual(getInput(language, level, -1), getInput(language, level, 2));
    assert.deepEqual(getInput(language, level, NaN), getInput(language, level));
    const speaking = Array.from({ length: 7 }, (_, index) => getSpeakingPrompt(language, level, index));
    const writing = Array.from({ length: 7 }, (_, index) => getWritingPrompt(language, level, index));
    assert.equal(new Set(speaking).size, 7);
    assert.equal(new Set(writing).size, 7);
    assert.equal(getSpeakingPrompt(language, level, 7), speaking[0]);
    assert.equal(getWritingPrompt(language, level, -1), writing[6]);
  }
});

test("advanced input teaches register, pragmatics and evidence limits", () => {
  for (const language of languages) for (const level of ["C1", "C2"]) {
    const entries = [0, 1, 2].map(index => getInput(language, level, index));
    assert.ok(entries.every(entry => entry.text.split(/\s+/).length >= 125));
    assert.ok(entries.some(entry => entry.expressions.some(expression => expression.context)));
  }
  assert.match(getInput("en", "C2", 0).text, /association|evidence/);
  assert.match(getInput("de", "C2", 0).text, /Beleg|Gewissheit/);
  assert.match(getInput("en", "C2", 1).text, /I take your point/);
  assert.match(getInput("de", "C2", 1).text, /Das überzeugt mich/);
});

test("external input offers separate listening and reading sources without copied attribution", () => {
  for (const language of languages) {
    assert.ok(externalSources[language].some(source => source.kind === "listen"));
    assert.ok(externalSources[language].some(source => source.kind === "read"));
    for (const source of externalSources[language]) {
      assert.equal(new URL(source.url).protocol, "https:");
      assert.ok(source.title);
    }
  }
});

test("A1 foundations append complete practical practice with collision-free IDs", () => {
  assert.equal(foundationWords.length, 16);
  assert.equal(foundationExercises.length, 68);
  assert.equal(new Set(foundationExercises.map(item => item.id)).size, 68);
  for (const language of languages) {
    const entries = foundationExercises.filter(item => item.language === language);
    assert.ok(entries.every(item => item.level === "A1" && item.id.startsWith(`${language}-A1-`)));
    for (const category of ["grammar", "sentences", "daily"]) {
      assert.equal(entries.filter(item => item.category === category).length, 6);
    }
    assert.equal(entries.filter(item => item.category === "vocabulary").length, 16);
  }
  for (const exercise of foundationExercises) {
    if (exercise.kind === "choice") {
      assert.equal(new Set(exercise.options).size, exercise.options.length);
      assert.equal(exercise.options.filter(answer => answer === exercise.answer).length, 1);
    }
    if (exercise.kind === "order") assert.equal(exercise.chunks.join(" "), exercise.answer);
  }
});
