# Ring Toss

Land your rings on the bottle necks before you run out.

## How to play

- Three rows of bottles stand at the back of the booth.
- Move the mouse to aim, and click to throw a ring. The crosshair shows where
  the ring will land: your hand wobbles from side to side, so time your throw.
- You have 10 rings. The round ends when you have thrown them all and the last
  one has landed.
- Click again on the game over screen to play another round.

## Scoring

A ring scores when it lands on a bottle neck. Each bottle holds one ring, so a
second ring on the same bottle scores nothing. Bottles further back are smaller,
harder to ring and worth more:

| Row    | Points |
| ------ | ------ |
| Back   | 30     |
| Middle | 20     |
| Front  | 10     |

Your final score is saved to the carnival's score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `toss`, `step`, `bottleAt`,
  `wobbleAt`) and the `ringToss` entry, the default export the midway finds.
- `game.test.ts`: tests for the game logic.
