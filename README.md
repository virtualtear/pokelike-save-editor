# Pokelike Save Editor

A small add-on for the browser game [Pokelike](https://pokelike2.xyz/) that lets you change your save. You can fill in your Pokédex and Shiny Dex, edit Hall of Fame runs, set stat buffs, unlock achievements and change your win stats.

The editor was made by [neol1no](https://greasyfork.org/en/scripts/575546-pokelike-save-editor). This version is continued by [virtualtear](https://github.com/virtualtear) and works on pokelike2.xyz.

## Before you start

Everything you change goes straight into your save. Bigger changes, like clearing a generation, locking a group of achievements or deleting a Hall of Fame run, show an "Undo" button for a few seconds. Once it is gone, the change stays.

## How to install

You need a browser extension called Tampermonkey. It runs small scripts like this one on the websites they are made for.

1. Install [Tampermonkey](https://www.tampermonkey.net/) for your browser (Chrome, Firefox, Edge, Safari and Opera are supported).
2. **Chrome and Edge only:** open the extensions page, click "Details" on Tampermonkey and turn on "Allow User Scripts". On older versions, turn on "Developer mode" at the top right of the extensions page instead. Without this, the script will not run.
3. Click this link: [Install Pokelike Save Editor](https://raw.githubusercontent.com/virtualtear/pokelike-save-editor/main/pokelike-save-editor.user.js)
4. Tampermonkey opens a page that shows the script. Click "Install".
5. Open [pokelike2.xyz](https://pokelike2.xyz/), or reload the page if it is already open.

## How to use it

Click the "Editor" tab on the right edge of the game, or press `Ctrl` + `Shift` + `E`. The editor opens on top of the game. To close it, press `Esc`, click the ✕, click next to the editor, or press `Ctrl` + `Shift` + `E` again.

On a phone, the editor fills the screen. The sections are tabs at the top, and "Save & Reload" sits at the bottom.

The first time, the editor downloads the list of Pokémon from [PokeAPI](https://pokeapi.co/). It keeps a copy and only downloads it again once a week.

Held items, achievements, primal forms and bag items come from the game itself, so new ones show up in the editor when the game adds them.

The sections of the editor, each with a count next to its name:

- **Pokédex:** all Pokémon from Gen 1 to Gen 9, grouped by generation. Gen 8 (Galar) and Gen 9 (Paldea) are locked until the game adds them, and they unlock by themselves once it does. Pokémon you have not caught are shown in the green of the first Game Boy. Click a Pokémon to mark it as caught and it turns to full colour. Click it again to remove it. Use the "Normal" and "Shiny" switch at the top to change between the Pokédex and the Shiny Dex. Each generation shows how many you have caught. "Catch all" marks a whole generation as caught, "Clear" removes it. Click a generation's name to fold it away. To find what you still need, search by name or number, or click "Missing only". The bar on the right (the row of "Gen" buttons on a phone) shows how complete each generation is. Click a generation there to jump to it.
- **Hall of Fame:** your finished runs, grouped by mode and region (like "Championship Kanto" or "Battle Tower Johto"), newest first in each group. Click a group's name to fold it away. Click a run to edit it, or click "New run" to make a new one. You can pick Championship with its region (Kanto to Alola, or Kanto + Johto; Galar and Paldea unlock when the game has them) or Battle Tower with one of its 6 regions (Kanto to Kalos). For Championship you can turn Nuzlocke on or off. Without Nuzlocke you can set the difficulty: Easy, Normal or Hardcore (the Battle Tower has Normal and Hardcore). You can also pick the starter, which lists the first form of every evolution line in the team, and add up to 6 Pokémon. Click a Pokémon in the team to change its nickname, level, shiny status or held item. You can search the held items by name or effect. Hover an item icon to see what the item does. "Delete run" removes the run.
- **Stat Buffs:** lists the Pokémon from your Hall of Fame. Click one to give it buffs. Each stat can get 0 to 10 buffs, and each buff adds 10%. Click a box in the bar, drag along it, or use the − and + buttons. Buffs count for the whole evolution line, so buffing Charmander also buffs Charizard. Each evolution line can use as many points as the game allows (50 at the moment). "Cheat Mode" removes that limit. Search by name or number to find a Pokémon in the list: any Pokémon of an evolution line finds it, so "Charizard" finds Charmander. "Battle Tower only" hides legendary Pokémon from the list.
- **Achievements:** every achievement from the game, grouped the same way as in the game. Locked achievements are shown in Game Boy green. Click an achievement to unlock it, and click it again to lock it. "Unlock all" and "Lock all" do the same for a whole group. You can search by name or description, pick one region from the dropdown, or click "Missing only" to hide the achievements you already have.
- **Extras:** primal forms and your bag. Click a primal form, like Primal Kyogre, to unlock it, and click it again to lock it. "Unlock all" and "Lock all" do the same for all of them. The game normally unlocks them when you beat the special bosses in Expedition. In the bag, set how many of each vitamin (HP Up, Protein, Iron, Zinc, Carbos) you have with the − and + buttons, or type a number. In the game, use a vitamin from the bag to give a Hall of Fame Pokémon a stat buff point.
- **Settings:** change your Elite Wins, Win Streak and whether your last run was won. You can also pick the colour of the editor, like the Game Boy Color shells: Dandelion, Berry, Kiwi, Teal, Grape or Atomic Purple. If you are logged in, "Cloud save" shows your level, XP and coins, and "Check cloud save" tells you if your cloud save matches this device. Level, XP and coins are kept on the game's server, so the editor can show them but not change them. "About" shows the version of the editor and of the game.

Every change is saved right away, but the game only reads your save when the page loads. The editor counts your changes on the **Save & Reload** button, and the "Editor" tab shows the same number while the editor is closed. When you have finished editing, click **Save & Reload**. The page reloads and the game picks up your changes.

If you are logged in, Save & Reload first sends your changes to your cloud save. This matters because the game's own sync only ever adds things: anything that is still in your cloud save comes back, and stat buffs and Elite Wins keep the higher number. After sending, the editor checks that the cloud save really has your changes. If it does not, the editor tells you which part and does not reload. Always use Save & Reload instead of reloading the page yourself, or removed entries can come back.

Save & Reload also tells the game about the runs you added to the Hall of Fame. A Battle Tower run you added then unlocks the next stage. Deleting a run later does not lock a stage again.

The editor and game versions are shown at the bottom of the editor and in Settings.

Keyboard: press `/` to jump to the search field. In the Pokémon and achievement grids, use the arrow keys to move and `Enter` or `Space` to change the one you are on.

When the editor is running, the stage complete screen in the Battle Tower says "Save Editor Loaded". That is how you can tell it is working.

## Something is not working

- **No "Editor" tab:** check that Tampermonkey is turned on and the script is enabled in it. Make sure you are on pokelike2.xyz. For pokelike.xyz, use [the original version](https://greasyfork.org/en/scripts/575546-pokelike-save-editor). In Chrome and Edge, check step 2 of the install guide.
- **My changes don't show up in the game:** click "Save & Reload" in the editor.
- **Removed Pokémon, achievements or runs come back:** click "Save & Reload" in the editor, not your browser's reload button. To see if your cloud save is up to date, open Settings and click "Check cloud save".
- **"Couldn't load Pokémon data":** the editor could not reach PokeAPI. Check your internet connection and click "Retry".
- **"Couldn't read the achievements" or no held items to pick:** the game has not finished loading yet. Wait a moment and click "Retry", or open the Pokémon again. If it stays empty, the game may have changed how it stores these lists, so please open an issue.

## Updates

Tampermonkey checks for new versions of the script and installs them for you. To update right away, open the Tampermonkey menu and click "Check for userscript updates".

## Credits and license

Made by neol1no, continued by virtualtear. Pokémon names, types and evolutions come from [PokeAPI](https://pokeapi.co/). Released under the MIT license.

This is a fan project. It is not connected to Pokelike, Nintendo, Game Freak or The Pokémon Company.
