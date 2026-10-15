# Pokelike Save Editor

A small add-on for the browser game [Pokelike](https://pokelike2.xyz/) that lets you change your save. You can fill in your Pokédex and Shiny Dex, edit Hall of Fame runs, set stat buffs, unlock achievements and change your win stats.

The editor was made by [neol1no](https://greasyfork.org/en/scripts/575546-pokelike-save-editor). This version is continued by [virtualtear](https://github.com/virtualtear) and works on pokelike2.xyz.

## Before you start

Everything you change goes straight into your save. Most changes can be clicked back, but deleting a Hall of Fame run cannot be undone.

## How to install

You need a browser extension called Tampermonkey. It runs small scripts like this one on the websites they are made for.

1. Install [Tampermonkey](https://www.tampermonkey.net/) for your browser (Chrome, Firefox, Edge, Safari and Opera are supported).
2. **Chrome and Edge only:** open the extensions page, click "Details" on Tampermonkey and turn on "Allow User Scripts". On older versions, turn on "Developer mode" at the top right of the extensions page instead. Without this, the script will not run.
3. Click this link: [Install Pokelike Save Editor](https://raw.githubusercontent.com/virtualtear/pokelike-save-editor/main/pokelike-save-editor.user.js)
4. Tampermonkey opens a page that shows the script. Click "Install".
5. Open [pokelike2.xyz](https://pokelike2.xyz/), or reload the page if it is already open.

## How to use it

Click the ⚙️ button in the bottom right corner of the game, or press `Ctrl` + `Shift` + `E`. The editor opens on top of the game. Click the same button again, or the ✕, to close it.

The first time, the editor downloads the list of Pokémon from [PokeAPI](https://pokeapi.co/). It keeps a copy and only downloads it again once a week.

Held items and achievements come from the game itself, so new ones show up in the editor when the game adds them.

The tabs at the top of the editor:

- **Pokédex:** all Pokémon from Gen 1 to Gen 7, grouped by generation. Each generation shows how many you have caught. Click a Pokémon to mark it as caught, and click it again to remove it. "Catch all" marks a whole generation as caught, "Clear" removes it. Click a generation's name to fold it away. To find what you still need, search by name or number, pick one generation from the dropdown, or tick "Missing only".
- **Shiny Dex:** works the same way, for shiny Pokémon.
- **Hall of Fame:** your finished runs, newest first. Click a run to edit it, or click "+ Add New Run" to make a new one. You can pick Championship or Battle Tower with one of its 6 regions (Kanto to Kalos), turn Nuzlocke on or off, and add up to 6 Pokémon. Click a Pokémon in the team to change its nickname, level, shiny status or held item. Hover an item icon to see what the item does. "Delete" removes the run for good.
- **Stat Buffs:** lists the Pokémon from your Hall of Fame. Click one to give it buffs. Each stat can get 0 to 10 buffs, and each buff adds 10%. Buffs count for the whole evolution line, so buffing Charmander also buffs Charizard. You start with 10 points and get 10 more for every Battle Tower stage you have cleared, up to 50. "Cheat Mode" removes that limit. The "Battle Tower only" box hides legendary Pokémon from the list.
- **Achievements:** every achievement from the game, grouped the same way as in the game. Click an achievement to unlock it, and click it again to lock it. "Unlock all" and "Lock all" do the same for a whole group. The dropdown shows one region at a time, and "Missing only" hides the achievements you already have.
- **Settings:** change your Elite Wins, Win Streak and whether your last run was won. Click "Save Settings" when you are done.

When you have finished editing, click **Save & Reload** at the top of the editor. The page reloads and the game picks up your changes.

When the editor is running, the stage complete screen in the Battle Tower says "Save Editor Loaded". That is how you can tell it is working.

## Something is not working

- **No ⚙️ button:** check that Tampermonkey is turned on and the script is enabled in it. Make sure you are on pokelike2.xyz. For pokelike.xyz, use [the original version](https://greasyfork.org/en/scripts/575546-pokelike-save-editor). In Chrome and Edge, check step 2 of the install guide.
- **My changes don't show up in the game:** click "Save & Reload" in the editor.
- **"Couldn't load Pokémon data":** the editor could not reach PokeAPI. Check your internet connection and click "Retry".

## Updates

Tampermonkey checks for new versions of the script and installs them for you. To update right away, open the Tampermonkey menu and click "Check for userscript updates".

## Credits and license

Made by neol1no, continued by virtualtear. Pokémon names, types and evolutions come from [PokeAPI](https://pokeapi.co/). Released under the MIT license.

This is a fan project. It is not connected to Pokelike, Nintendo, Game Freak or The Pokémon Company.
