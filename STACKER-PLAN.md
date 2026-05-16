# Stacker

A Telegram bot that helps you learn programming through short, focused rounds of practice questions. Pick a topic, pick a level, answer one question at a time. Get it wrong? It comes back until you nail it. Get it right? You earn XP and build a daily streak.

Stacker is built for anyone who learns better with bite-sized practice than with long tutorials — from people writing their first lines of code to engineers brushing up on language gotchas between meetings.

---

## What you do in the bot

Open Stacker, send `/play`, and you're three taps from your first question. No accounts to make, no settings to configure, no dashboards to navigate. Practice happens in the chat itself.

### Pick a topic

Six tracks to choose from, each one its own progression:

- **JavaScript** — closures, prototypes, the type-coercion gauntlet
- **TypeScript** — generics, conditional types, narrowing
- **Node.js** — event loop, streams, modules
- **Python** — comprehensions, the standard library, the data model
- **Algorithms** — complexity, data structures, common patterns
- **SQL** — joins, indexes, query planning

### Pick a level

Three levels per topic, so the same track grows with you:

- **Beginner** — fundamentals and core syntax
- **Intermediate** — common patterns and the gotchas that bite working developers
- **Advanced** — deep semantics, edge cases, performance

---

## A round of Stacker

A round is five questions. Quick enough to fit between two cups of coffee, focused enough to actually teach you something.

### Three kinds of question

**Multiple choice** — read a question, tap one of four answers. Tests recall and conceptual understanding.

**Code output** — Stacker shows you a snippet and asks what it prints. Tests how well you can run code in your head.

```
console.log([1, 2, 3].map(Number.parseInt));
```
> [1, 2, 3]    [1, NaN, NaN]    [NaN, NaN, NaN]    TypeError

**Fill in the blank** — Stacker asks a question with a specific short answer; you type it. Tests precise recall.

> What does `typeof null` return? (one word)
> _Type your answer as a reply._

### What happens when you answer

**Right answer.** Your message gets a thumbs-up reaction (or the correct option lights up green), and Stacker moves straight to the next question.

**Wrong answer.** Stacker shows the correct answer, then sends a short explanation telling you *why*. That question goes back into the queue — you'll see it again at the end of the round, and the round doesn't finish until you've answered every question correctly at least once.

This is the core of how Stacker teaches: you can't skim past what you don't know. The questions you fail are the ones you'll practice the most.

---

## The daily game loop

Stacker is meant to be a small daily habit, not a long study session. Three systems work together to make daily practice feel rewarding.

### Hearts: 3 a day

Every player starts the day with three hearts. Each wrong answer costs one heart. Run out and the current round ends — no XP, no streak update for that round. Hearts refill on a new calendar day.

Hearts make accuracy matter. If you click without thinking, you'll burn out and have to wait until tomorrow.

### XP: rewards for completing a round

Every question you finally answer correctly earns 20 XP, awarded when the round completes. Total XP accumulates across rounds. It's a simple counter — no levels, no shop, no gimmicks. Just a number that goes up when you do the work.

### Streak: keep playing daily

Your streak is the number of consecutive days you've completed at least one round. Miss a day and it resets to one. Play today *and* you played yesterday and your streak climbs.

The streak is the single most important number in Stacker. Hearts and XP recover or accumulate; a broken streak is gone for good.

---

## Daily reminders

Stacker can ping you once a day at the hour you choose, so the streak nudges you instead of the other way around. The message tells you what's at stake:

- **Streak alive:** "Your streak is 7 days — don't break it!" with a one-tap **Play now** button.
- **Streak broken:** "Your 7-day streak ended. Start a fresh one?" — no guilt, just a clean restart.
- **First time:** A simple invitation to start a round.

If you've already played today, you won't get a reminder. The bot only nudges when there's actually something to nudge about.

---

## Round summary

When you finish a round, Stacker shows you a small recap:

```
Round complete!

Correct: 5  (+100 XP)
Wrong: 1
Accuracy: 83%

Total XP: 320
Streak: 4 days (kept alive!)
Hearts: 2 / 3
```

This is the moment the daily habit pays off. You can see what you earned, how you did, and how much margin you have left for the day.

---

## Commands

- `/play` — Start a new round
- `/stop` — End the current round early
- `/start` — Welcome screen and topic picker

---

## What Stacker is not

- **Not a tutorial.** Stacker assumes you have a way to learn concepts (a book, a course, the docs). It gives you a place to practice and retain them.
- **Not a leaderboard.** No competition with other players. The only person you're competing with is yesterday's you.
- **Not endless content.** Each round is small and finite. The point is to come back tomorrow, not to grind for hours today.

---

## Who it's for

- Self-taught developers who want a low-friction way to keep skills sharp
- Bootcamp students looking for spaced practice outside lessons
- Working engineers brushing up on a language they haven't touched in months
- Anyone preparing for interviews who wants to drill gotchas without opening a separate app

If you've ever opened a tutorial, gotten distracted, and never come back — Stacker is built for you. It lives where you already are. One round a day, three taps to start, five questions to finish. That's the whole product.
