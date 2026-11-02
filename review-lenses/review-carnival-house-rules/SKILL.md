---
name: review-carnival-house-rules
description: Review a change to a carnival game for the house rules in AGENTS.md that keep every game on the midway, its scores in the shared scores module, and its drawing on the carnival's theme. Use as one lens in a code review run on changes under src/games/.
---

# Review lens: Carnival House Rules

Review changes to the games under `src/games/` against house rules 1 to 3 in the root `AGENTS.md`: what a game has to do to share the midway, the scoreboard and the look of every other booth.

## Scope

- **Registration** Whether a game can be found by the midway the way every other game is: its own folder `src/games/<game-id>/`, a `game.ts` whose default export is its `CarnivalGame`, and an `id` that matches the folder name, with nothing registering it by hand.
- **Scores** Whether a round's score reaches the shared scoreboard through `recordScore(game.id, score)` from `src/carnival`, once, when the round ends, rather than through the game's own storage, its own high score table, or a call that fires more than once or never.
- **Theme** Whether what the game draws takes its colours, fonts and sizes from `theme` and `canvasFont` in `src/carnival/theme.ts`, rather than from a hex colour, a named or `rgb()` colour, or a font string written in the game.

## Method

Read house rules 1 to 3 in the root `AGENTS.md` first, and `src/games/index.ts` for how the midway finds a game.

Start at each changed game folder. Follow every place a round can end, including restarting and leaving the game, to where its score is recorded. Follow every value handed to the canvas or the DOM as a colour, font or size back to where it is defined.

## Threshold

Report a game that does not follow house rule 1, 2 or 3 in a way that changes what a player sees or what the scoreboard holds, or that leaves the game drawing or scoring differently from every other booth.

Be accurate about the consequence. `src/games/index.ts` throws when a `game.ts` has no default export or exports an `id` that differs from its folder, so the whole midway fails to load and `src/games/index.test.ts` fails, rather than one booth going missing. Those two cases are already caught by the tests: do not report them. A game whose folder has no `game.ts` at all gets no booth, and `index.test.ts` catches that too.

Do not report:

- Code outside `src/games/`. `src/carnival/` defines the theme and the scores, and `src/midway/palette.ts` has its own scenery colours.
- Values derived from the theme, such as a colour from `theme.colors`, a size computed from `theme.canvas` or `theme.font`, or a transparent variant built from a theme colour.
- Test data in `game.test.ts`.
- Anything lint, the type-checker or the tests already enforce.
- Other quality concerns in a game, which belong to the correctness and maintainability lenses.

## Reporting

- Name the house rule, the file and line, and what the player or the scoreboard gets as a result: a booth that looks out of place, a score missing from the board, a score counted twice, scores kept where the midway never reads them.
- State the fix in the carnival's own terms: the `theme` key or `canvasFont` size to use, where `recordScore` belongs, or the folder and export the game needs.
