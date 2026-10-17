// ==UserScript==
// @name         Pokelike Save Editor
// @namespace    https://github.com/virtualtear/pokelike-save-editor
// @version      3.0.0
// @description  Save editor for Pokelike. Originally made by neol1no, continued by virtualtear.
// @author       neol1no (original), virtualtear (continued)
// @homepageURL  https://github.com/virtualtear/pokelike-save-editor
// @match        https://pokelike2.xyz/*
// @grant        none
// @run-at       document-idle
// @license      MIT
// @downloadURL  https://raw.githubusercontent.com/virtualtear/pokelike-save-editor/main/pokelike-save-editor.user.js
// @updateURL    https://raw.githubusercontent.com/virtualtear/pokelike-save-editor/main/pokelike-save-editor.user.js
// ==/UserScript==

(function () {
  'use strict';

  // ─── State ───────────────────────────────────────────────────────────────────
  const STATE = {
    currentView: localStorage.getItem('pse_view') || 'dex',
  };

  // ─── Save Data ───────────────────────────────────────────────────────────────
  const HOF_KEY = 'poke_hall_of_fame';
  const BUFFS_KEY = 'poke_stat_buffs';
  const ACHIEVEMENTS_KEY = 'poke_achievements';

  function readJson(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  }

  const writeJson = (key, value) => localStorage.setItem(key, JSON.stringify(value));

  // The game keeps lists like ITEM_POOL and ACHIEVEMENTS as top-level consts in its
  // scripts: code running in the page reaches them by name, but they are not window
  // properties. The game loads its scripts after the page, so a list can be missing for
  // a moment after load. Reading one that does not exist throws, so the catch covers that too
  function readGameList(read) {
    try {
      const list = read();
      if (Array.isArray(list)) return list;
    } catch {
      // Not loaded yet, or not reachable from where this script runs
    }
    return [];
  }

  // ─── Items ───────────────────────────────────────────────────────────────────
  // Pokelike gives items its own effects, so they come from the game's ITEM_POOL
  // (js/data.js), not from PokeAPI. Empty until the game has loaded its scripts
  const getItemList = () => readGameList(() => ITEM_POOL);

  // ─── Pokémon Data (PokeAPI) ──────────────────────────────────────────────────
  // The game's Pokédex stops at #1025, the end of Gen 9
  const MAX_POKEMON_ID = 1025;
  const POKEAPI_URL = 'https://graphql.pokeapi.co/v1beta2';
  const POKEAPI_CACHE_KEY = 'pse_pokeapi_cache';
  const POKEAPI_CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
  const SPRITE_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';
  const POKEAPI_QUERY = `{
    pokemonspecies(where: {id: {_lte: ${MAX_POKEMON_ID}}}, order_by: {id: asc}) {
      id name generation_id evolves_from_species_id is_legendary is_mythical
      pokemonspeciesnames(where: {language_id: {_eq: 9}}) { name }
      pokemons(where: {is_default: {_eq: true}}) { pokemontypes(order_by: {slot: asc}) { type { name } } }
    }
  }`;

  // lastId is the highest Pokédex number of each generation
  const GENERATIONS = [
    { gen: 1, region: 'Kanto', lastId: 151 }, { gen: 2, region: 'Johto', lastId: 251 },
    { gen: 3, region: 'Hoenn', lastId: 386 }, { gen: 4, region: 'Sinnoh', lastId: 493 },
    { gen: 5, region: 'Unova', lastId: 649 }, { gen: 6, region: 'Kalos', lastId: 721 },
    { gen: 7, region: 'Alola', lastId: 809 }, { gen: 8, region: 'Galar', lastId: 905 },
    { gen: 9, region: 'Paldea', lastId: 1025 },
  ];

  // The game had Gen 1-7 when this was written. A later generation stays locked in the
  // editor until the game's REGION_SPECIES_RANGE (js/data.js) lists it
  const KNOWN_GAME_GENS = 7;
  function gameHasGen(gen) {
    if (gen <= KNOWN_GAME_GENS) return true;
    try {
      return Array.isArray(REGION_SPECIES_RANGE[gen]);
    } catch {
      // Not loaded yet, or not reachable from where this script runs
      return false;
    }
  }

  // The highest Pokédex number the game knows. Generations follow each other without gaps
  const playableMaxId = () => Math.max(...GENERATIONS.filter(g => gameHasGen(g.gen)).map(g => g.lastId));

  // The game treats Ultra Beasts as legendary, PokeAPI does not flag them
  const EXTRA_LEGENDARY_IDS = [793, 794, 795, 796, 797, 798, 799, 803, 804, 805, 806];
  // PokeAPI lists a pre-evolution for these, but the game never evolves into them,
  // so stat buffs are stored under their own ID
  const OWN_LINE_IDS = new Set([292, 773, 790, 791, 792, 804, 809]);

  // Filled by loadPokemonData()
  let POKEMON_LIST = null;
  let POKEMON_BY_ID = new Map();
  let LEGENDARY_ID_SET = new Set();
  let pokemonDataRequest = null;

  const capitalize = word => word.charAt(0).toUpperCase() + word.slice(1);

  async function fetchPokemonData() {
    const res = await fetch(POKEAPI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: POKEAPI_QUERY }),
    });
    if (!res.ok) throw new Error(`PokeAPI answered with status ${res.status}`);
    const species = (await res.json())?.data?.pokemonspecies;
    if (!Array.isArray(species) || species.length === 0) throw new Error('PokeAPI sent no Pokémon');

    return species.map(s => ({
      id: s.id,
      name: s.pokemonspeciesnames[0]?.name || capitalize(s.name),
      gen: s.generation_id,
      evolvesFrom: OWN_LINE_IDS.has(s.id) ? null : s.evolves_from_species_id,
      legendary: s.is_legendary || s.is_mythical || EXTRA_LEGENDARY_IDS.includes(s.id),
      types: (s.pokemons[0]?.pokemontypes || []).map(t => capitalize(t.type.name)),
    }));
  }

  function applyPokemonData(list) {
    POKEMON_LIST = list;
    POKEMON_BY_ID = new Map(list.map(p => [p.id, p]));
    LEGENDARY_ID_SET = new Set(list.filter(p => p.legendary).map(p => p.id));
  }

  function readPokemonCache() {
    const cache = readJson(POKEAPI_CACHE_KEY, null);
    return Array.isArray(cache?.pokemon) && cache.pokemon.length ? cache : null;
  }

  // Resolves once POKEMON_LIST is filled, from the cache or from PokeAPI
  function loadPokemonData() {
    if (pokemonDataRequest) return pokemonDataRequest;

    const cache = readPokemonCache();
    // A copy saved by an older version of the editor stops before MAX_POKEMON_ID
    const complete = cache?.pokemon.some(p => p.id === MAX_POKEMON_ID);
    if (cache && complete && Date.now() - cache.fetchedAt < POKEAPI_CACHE_MAX_AGE) {
      applyPokemonData(cache.pokemon);
      pokemonDataRequest = Promise.resolve();
      return pokemonDataRequest;
    }

    pokemonDataRequest = fetchPokemonData().then(list => {
      applyPokemonData(list);
      try {
        writeJson(POKEAPI_CACHE_KEY, { fetchedAt: Date.now(), pokemon: list });
      } catch {
        // Storage full: the data still works for this visit
      }
    }, err => {
      // An outdated cache is better than nothing while PokeAPI is unreachable
      if (cache) {
        applyPokemonData(cache.pokemon);
        return;
      }
      pokemonDataRequest = null;
      throw err;
    });
    return pokemonDataRequest;
  }

  function getEvoLineRoot(speciesId) {
    let id = speciesId;
    while (POKEMON_BY_ID.get(id)?.evolvesFrom) id = POKEMON_BY_ID.get(id).evolvesFrom;
    return id;
  }

  const dexNumber = id => `#${String(id).padStart(3, '0')}`;
  const speciesName = id => POKEMON_BY_ID.get(id)?.name || dexNumber(id);
  const spriteUrl = (id, shiny = false) => `${SPRITE_BASE}${shiny ? 'shiny/' : ''}${id}.png`;

  // The game translates English Pokémon names on the page into its own language
  // (German, French), so search has to match that translated name as well
  function shownName(pokemon) {
    try {
      return window.POKE_I18N?.pokeName?.(pokemon.name) || pokemon.name;
    } catch {
      return pokemon.name;
    }
  }

  // A query like "25" or "#025" matches the Pokédex number, anything else the name
  function matchesSearch(pokemon, query) {
    const number = query.trim().match(/^#?(\d+)$/);
    if (number) return pokemon.id === Number(number[1]);
    const text = query.trim().toLowerCase();
    return pokemon.name.toLowerCase().includes(text) || shownName(pokemon).toLowerCase().includes(text);
  }

  // ─── Styles ──────────────────────────────────────────────────────────────────
  // Everything is scoped under #pse-root, so the game's global rules (it sets
  // user-select: none on every element and a pixel font on h1/h2) never reach the editor
  const style = document.createElement('style');
  style.textContent = `
    #pse-root {
      all: initial;
      display: contents;
      --font: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;

      /* Screen-off slate: the content ground */
      --bg: #141816;
      --surface: #1a1f1c;
      --surface-2: #222924;
      --surface-3: #2b332d;
      --line: #2a322d;
      --line-strong: #3a443d;
      --text: #eef1ec;
      --text-2: #b6bfb8;
      --text-3: #8c968f;

      /* The original Game Boy's four LCD shades, used for missing and locked */
      --dmg-0: #0f380f;
      --dmg-1: #306230;
      --dmg-2: #8bac0f;
      --dmg-3: #9bbc0f;

      /* The five letters of the Game Boy Color logo, one per buffable stat */
      --stat-hp: #4cbf5c;
      --stat-atk: #f0564b;
      --stat-def: #f2c230;
      --stat-spdef: #4a8cf0;
      --stat-speed: #a07cf5;

      --danger: #ff7b6e;
      --ok: #7fd88c;

      /* Dandelion shell, the default */
      --shell: #f2c230;
      --shell-ink: #1d1806;
      --shell-ink-2: rgba(29, 24, 6, 0.72);
      --shell-hover: rgba(29, 24, 6, 0.09);
      --shell-line: rgba(29, 24, 6, 0.16);
      --accent: #f2c230;
      --accent-hover: #ffd24d;
      --accent-ink: #1d1806;
      --accent-weak: rgba(242, 194, 48, 0.14);
    }
    #pse-root[data-shell="berry"] {
      --shell: #c8366f; --shell-ink: #fff4f8; --shell-ink-2: rgba(255, 244, 248, 0.78);
      --shell-hover: rgba(255, 255, 255, 0.12); --shell-line: rgba(255, 255, 255, 0.2);
      --accent: #ff78a9; --accent-hover: #ff94bb; --accent-ink: #2b0613; --accent-weak: rgba(255, 120, 169, 0.14);
    }
    #pse-root[data-shell="kiwi"] {
      --shell: #9cc43a; --shell-ink: #142008; --shell-ink-2: rgba(20, 32, 8, 0.72);
      --shell-hover: rgba(20, 32, 8, 0.09); --shell-line: rgba(20, 32, 8, 0.16);
      --accent: #b3dc4c; --accent-hover: #c4ea62; --accent-ink: #142008; --accent-weak: rgba(179, 220, 76, 0.14);
    }
    #pse-root[data-shell="teal"] {
      --shell: #19a3a1; --shell-ink: #031a1a; --shell-ink-2: rgba(3, 26, 26, 0.74);
      --shell-hover: rgba(3, 26, 26, 0.1); --shell-line: rgba(3, 26, 26, 0.18);
      --accent: #3dd2cd; --accent-hover: #5fe0dc; --accent-ink: #031a1a; --accent-weak: rgba(61, 210, 205, 0.14);
    }
    #pse-root[data-shell="grape"] {
      --shell: #6a4cc0; --shell-ink: #f6f2ff; --shell-ink-2: rgba(246, 242, 255, 0.78);
      --shell-hover: rgba(255, 255, 255, 0.12); --shell-line: rgba(255, 255, 255, 0.2);
      --accent: #ac90ff; --accent-hover: #bea7ff; --accent-ink: #160a33; --accent-weak: rgba(172, 144, 255, 0.15);
    }
    /* Atomic Purple was see-through plastic, so this shell lets the game show through */
    #pse-root[data-shell="atomic"] {
      --shell: rgba(84, 66, 148, 0.74); --shell-ink: #f3efff; --shell-ink-2: rgba(243, 239, 255, 0.8);
      --shell-hover: rgba(255, 255, 255, 0.12); --shell-line: rgba(255, 255, 255, 0.18);
      --accent: #b8a4ff; --accent-hover: #c9b9ff; --accent-ink: #170d36; --accent-weak: rgba(184, 164, 255, 0.15);
    }

    #pse-root *, #pse-root *::before, #pse-root *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-tap-highlight-color: transparent;
    }
    #pse-root input { user-select: text; -webkit-user-select: text; }
    #pse-root ::selection { background: var(--accent); color: var(--accent-ink); }
    #pse-root :focus { outline: none; }
    #pse-root :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
    #pse-root .pse-on-shell :focus-visible { outline-color: var(--shell-ink); }
    #pse-root button { font: inherit; color: inherit; background: none; border: 0; cursor: pointer; text-align: inherit; }
    #pse-root button:disabled { cursor: not-allowed; }
    #pse-root img { display: block; }
    #pse-root [hidden] { display: none !important; }
    #pse-root .pse-icon {
      width: 18px; height: 18px; flex-shrink: 0;
      fill: none; stroke: currentColor; stroke-width: 1.9; stroke-linecap: round; stroke-linejoin: round;
    }
    #pse-root .pse-icon-fill { fill: currentColor; stroke: none; }
    #pse-root .pse-defs { position: absolute; width: 0; height: 0; overflow: hidden; }
    #pse-root .pse-sr {
      position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap;
    }

    /* ── Launcher ── */
    #pse-root #pse-launcher {
      position: fixed; z-index: 999998; right: 0; top: 50%;
      display: flex; flex-direction: column; align-items: center; gap: 6px;
      width: 40px; padding: 12px 0 12px 2px;
      border-radius: 12px 0 0 12px;
      background: var(--shell); color: var(--shell-ink);
      box-shadow: -2px 6px 18px rgba(0, 0, 0, 0.35);
      font: 700 11px/1 var(--font);
      transform: translate(4px, -50%);
      transition: transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.2s;
    }
    #pse-root[data-shell="atomic"] #pse-launcher { backdrop-filter: blur(10px); }
    #pse-root #pse-launcher:hover, #pse-root #pse-launcher:focus-visible {
      transform: translate(0, -50%);
      box-shadow: -4px 10px 26px rgba(0, 0, 0, 0.45);
    }
    #pse-root #pse-launcher:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
    #pse-root #pse-launcher .pse-icon { width: 22px; height: 22px; }
    #pse-root .pse-launcher-label { writing-mode: vertical-rl; transform: rotate(180deg); letter-spacing: 0.02em; }
    #pse-root .pse-launcher-badge {
      min-width: 20px; height: 20px; padding: 0 5px; border-radius: 999px;
      display: grid; place-items: center;
      background: var(--shell-ink); color: var(--shell);
      font-variant-numeric: tabular-nums;
    }

    /* ── Dialog shell ── */
    #pse-root #pse-app {
      position: fixed; inset: 0; margin: auto;
      width: min(1120px, calc(100vw - 48px));
      height: min(840px, calc(100dvh - 48px));
      max-width: none; max-height: none;
      padding: 0; border: 0; border-radius: 18px;
      overflow: hidden;
      background: transparent;
      color: var(--text);
      font: 14px/1.45 var(--font);
      font-synthesis: none;
      box-shadow: 0 30px 80px rgba(0, 0, 0, 0.55), 0 4px 14px rgba(0, 0, 0, 0.35);
      -webkit-font-smoothing: antialiased;
    }
    #pse-root #pse-app:not([open]) { display: none; }
    #pse-root #pse-app::backdrop { background: rgba(5, 8, 22, 0.62); }
    #pse-root #pse-app[open] { animation: pse-rise 0.24s cubic-bezier(0.16, 1, 0.3, 1); }
    @keyframes pse-rise { from { opacity: 0; transform: translateY(12px) scale(0.985); } }

    #pse-root .pse-shell {
      position: relative;
      display: grid; height: 100%;
      grid-template-columns: 236px minmax(0, 1fr);
      grid-template-rows: minmax(0, 1fr) auto;
      grid-template-areas: "rail main" "commit main";
    }
    #pse-root .pse-rail, #pse-root .pse-commit { background: var(--shell); color: var(--shell-ink); }
    #pse-root[data-shell="atomic"] .pse-rail, #pse-root[data-shell="atomic"] .pse-commit { backdrop-filter: blur(16px) saturate(1.3); }
    #pse-root .pse-rail {
      grid-area: rail; min-height: 0;
      display: flex; flex-direction: column; gap: 22px;
      padding: 22px 12px 12px; overflow-y: auto; scrollbar-width: none;
    }
    #pse-root .pse-brand { padding: 0 10px; }
    #pse-root .pse-brand-name { display: block; font-size: 18px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.2; }
    #pse-root .pse-brand-sub { display: block; margin-top: 2px; font-size: 12px; font-weight: 600; color: var(--shell-ink-2); }
    #pse-root .pse-nav { display: flex; flex-direction: column; gap: 2px; }
    #pse-root .pse-nav-item {
      display: flex; align-items: center; gap: 10px;
      width: 100%; min-height: 40px; padding: 8px 10px; border-radius: 10px;
      font-size: 14px; font-weight: 650; white-space: nowrap;
      transition: background-color 0.15s, color 0.15s;
    }
    #pse-root .pse-nav-item:hover { background: var(--shell-hover); }
    #pse-root .pse-nav-item[aria-current="page"] { background: var(--shell-ink); color: var(--shell); }
    #pse-root[data-shell="atomic"] .pse-nav-item[aria-current="page"] { color: #3a2a7a; }
    #pse-root .pse-nav-count {
      margin-left: auto; font-size: 12px; font-weight: 600;
      font-variant-numeric: tabular-nums; opacity: 0.78;
    }
    #pse-root .pse-commit {
      grid-area: commit;
      display: flex; flex-direction: column; gap: 10px;
      padding: 14px 12px 14px;
      border-top: 1px solid var(--shell-line);
    }
    #pse-root .pse-commit-status { padding: 0 4px; font-size: 12px; font-weight: 600; color: var(--shell-ink-2); text-wrap: balance; }
    #pse-root .pse-commit-status b { color: var(--shell-ink); font-variant-numeric: tabular-nums; }
    #pse-root .pse-credit { padding: 0 4px; font-size: 11px; color: var(--shell-ink-2); }
    #pse-root .pse-btn-commit {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      height: 44px; border-radius: 12px;
      background: var(--shell-ink); color: var(--shell);
      font-size: 14px; font-weight: 750;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.18);
      transition: transform 0.12s, box-shadow 0.15s;
    }
    #pse-root[data-shell="atomic"] .pse-btn-commit { color: #3a2a7a; }
    #pse-root .pse-btn-commit:hover { box-shadow: 0 4px 12px rgba(0, 0, 0, 0.28); }
    #pse-root .pse-btn-commit:disabled { cursor: progress; opacity: 0.8; }
    #pse-root .pse-btn-commit:disabled .pse-icon { animation: pse-spin 0.9s linear infinite; }
    @keyframes pse-spin { to { transform: rotate(360deg); } }
    #pse-root .pse-commit-count {
      min-width: 22px; height: 22px; padding: 0 6px; border-radius: 999px;
      display: grid; place-items: center;
      background: var(--shell); color: var(--shell-ink);
      font-size: 12px; font-weight: 800; font-variant-numeric: tabular-nums;
    }
    #pse-root[data-shell="atomic"] .pse-commit-count { background: #b8a4ff; color: #170d36; }
    #pse-root .pse-btn-commit:active { transform: translateY(1px); }

    #pse-root .pse-main {
      grid-area: main; min-width: 0; min-height: 0;
      display: flex; flex-direction: column;
      background: var(--bg);
    }
    #pse-root .pse-main-head { display: flex; align-items: baseline; gap: 16px; padding: 20px 72px 14px 28px; }
    #pse-root .pse-view-title {
      font: 750 22px/1.2 var(--font); letter-spacing: -0.02em; color: var(--text);
    }
    #pse-root .pse-view-sub { font-size: 13px; font-weight: 600; color: var(--text-3); font-variant-numeric: tabular-nums; }
    #pse-root .pse-view-count { font-size: 28px; font-weight: 800; line-height: 1; letter-spacing: -0.03em; color: var(--accent); }
    #pse-root .pse-close { position: absolute; top: 16px; right: 18px; z-index: 5; }
    #pse-root .pse-view { flex: 1; min-height: 0; display: flex; flex-direction: column; }
    #pse-root .pse-scroll {
      position: relative; flex: 1; min-height: 0;
      overflow-y: auto; overscroll-behavior: contain;
      padding: 0 28px 28px;
      scrollbar-width: thin; scrollbar-color: var(--line-strong) transparent;
    }

    /* ── Controls ── */
    #pse-root .pse-btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 6px;
      height: 36px; padding: 0 14px; border-radius: 10px;
      border: 1px solid transparent;
      font-size: 13px; font-weight: 650; line-height: 1; white-space: nowrap;
      transition: background-color 0.15s, border-color 0.15s, color 0.15s, transform 0.1s;
    }
    #pse-root .pse-btn:active:not(:disabled) { transform: translateY(1px); }
    #pse-root .pse-btn .pse-icon { width: 16px; height: 16px; }
    #pse-root .pse-btn-primary { background: var(--accent); color: var(--accent-ink); }
    #pse-root .pse-btn-primary:hover { background: var(--accent-hover); }
    #pse-root .pse-btn-ghost { border-color: var(--line-strong); color: var(--text); }
    #pse-root .pse-btn-ghost:hover:not(:disabled) { background: var(--surface-2); }
    #pse-root .pse-btn-quiet { color: var(--text-2); }
    #pse-root .pse-btn-quiet:hover:not(:disabled) { background: var(--surface-2); color: var(--text); }
    #pse-root .pse-btn-danger { color: var(--danger); border-color: rgba(255, 123, 110, 0.35); }
    #pse-root .pse-btn-danger:hover:not(:disabled) { background: rgba(255, 123, 110, 0.12); }
    #pse-root .pse-btn-sm { height: 30px; padding: 0 10px; border-radius: 8px; font-size: 12px; }
    #pse-root .pse-btn:disabled { opacity: 0.4; }
    #pse-root .pse-icon-btn {
      display: grid; place-items: center;
      width: 36px; height: 36px; border-radius: 10px;
      color: var(--text-2);
      transition: background-color 0.15s, color 0.15s;
    }
    #pse-root .pse-icon-btn:hover { background: var(--surface-2); color: var(--text); }
    #pse-root .pse-icon-btn .pse-icon { width: 20px; height: 20px; }

    #pse-root .pse-toolbar {
      display: flex; flex-wrap: wrap; align-items: center; gap: 10px;
      padding: 0 28px 14px;
    }
    #pse-root .pse-search { position: relative; flex: 1 1 220px; display: flex; align-items: center; }
    #pse-root .pse-search > .pse-icon { position: absolute; left: 12px; color: var(--text-3); pointer-events: none; }
    #pse-root .pse-input, #pse-root .pse-select {
      width: 100%; height: 40px; padding: 0 12px;
      background: var(--surface); color: var(--text);
      border: 1px solid var(--line-strong); border-radius: 10px;
      font: 500 14px/1 var(--font);
      caret-color: var(--accent);
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    #pse-root .pse-input::placeholder { color: var(--text-3); opacity: 1; }
    #pse-root .pse-input:hover, #pse-root .pse-select:hover { border-color: #4a5550; }
    #pse-root .pse-input:focus-visible, #pse-root .pse-select:focus-visible {
      outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-weak);
    }
    #pse-root .pse-search .pse-input { padding-left: 38px; padding-right: 36px; }
    #pse-root .pse-search .pse-input::-webkit-search-cancel-button { display: none; }
    #pse-root .pse-search-kbd {
      position: absolute; right: 10px;
      min-width: 20px; height: 20px; border-radius: 5px;
      display: grid; place-items: center;
      border: 1px solid var(--line-strong); color: var(--text-3);
      font-size: 11px; font-weight: 600; pointer-events: none;
    }
    #pse-root .pse-search-clear { position: absolute; right: 4px; width: 32px; height: 32px; }
    #pse-root .pse-search-clear .pse-icon { width: 16px; height: 16px; }
    #pse-root .pse-select {
      width: auto; padding-right: 34px; appearance: none; cursor: pointer;
      background-image: linear-gradient(45deg, transparent 50%, var(--text-2) 50%), linear-gradient(135deg, var(--text-2) 50%, transparent 50%);
      background-position: calc(100% - 18px) 50%, calc(100% - 13px) 50%;
      background-size: 5px 5px; background-repeat: no-repeat;
    }
    #pse-root .pse-select option { background: var(--surface); color: var(--text); }
    #pse-root input[type="number"].pse-input { font-variant-numeric: tabular-nums; }

    #pse-root .pse-seg {
      display: inline-flex; gap: 2px; padding: 3px;
      background: var(--surface); border: 1px solid var(--line); border-radius: 12px;
    }
    #pse-root .pse-seg-wrap { flex-wrap: wrap; }
    #pse-root .pse-seg > button {
      display: inline-flex; align-items: center; gap: 6px;
      height: 32px; padding: 0 12px; border-radius: 9px;
      font-size: 13px; font-weight: 650; color: var(--text-2); white-space: nowrap;
      transition: background-color 0.15s, color 0.15s;
    }
    #pse-root .pse-seg > button .pse-icon { width: 15px; height: 15px; }
    #pse-root .pse-seg > button:hover { color: var(--text); background: var(--surface-2); }
    #pse-root .pse-seg > button:disabled { color: var(--text-3); background: none; opacity: 0.6; cursor: not-allowed; }
    #pse-root .pse-seg > button[aria-checked="true"] { background: var(--accent); color: var(--accent-ink); }
    #pse-root .pse-seg-count { font-size: 12px; font-weight: 600; opacity: 0.75; font-variant-numeric: tabular-nums; }

    #pse-root .pse-chip {
      display: inline-flex; align-items: center; gap: 6px;
      height: 38px; padding: 0 14px; border-radius: 999px;
      border: 1px solid var(--line-strong);
      font-size: 13px; font-weight: 650; color: var(--text-2); white-space: nowrap;
      transition: background-color 0.15s, border-color 0.15s, color 0.15s;
    }
    #pse-root .pse-chip .pse-icon { width: 15px; height: 15px; display: none; }
    #pse-root .pse-chip:hover { color: var(--text); background: var(--surface-2); }
    #pse-root .pse-chip[aria-pressed="true"] { border-color: var(--accent); background: var(--accent-weak); color: var(--text); }
    #pse-root .pse-chip[aria-pressed="true"] .pse-icon { display: block; color: var(--accent); }

    #pse-root .pse-switch {
      display: inline-flex; align-items: center; gap: 10px;
      min-height: 36px; font-size: 14px; font-weight: 600; color: var(--text); cursor: pointer;
    }
    #pse-root .pse-switch input {
      appearance: none; -webkit-appearance: none; flex-shrink: 0;
      position: relative; width: 38px; height: 22px; border-radius: 999px;
      background: var(--line-strong); cursor: pointer;
      transition: background-color 0.18s;
    }
    #pse-root .pse-switch input::before {
      content: ''; position: absolute; top: 3px; left: 3px;
      width: 16px; height: 16px; border-radius: 50%;
      background: #f4f6f3; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
      transition: transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    #pse-root .pse-switch input:checked { background: var(--accent); }
    #pse-root .pse-switch input:checked::before { transform: translateX(16px); background: var(--accent-ink); }
    #pse-root .pse-switch-danger input:checked { background: var(--danger); }
    #pse-root .pse-switch-text { display: flex; flex-direction: column; }
    #pse-root .pse-switch-hint { font-size: 12px; font-weight: 500; color: var(--text-3); }

    #pse-root .pse-meter {
      position: relative; height: 6px; border-radius: 999px; overflow: hidden;
      background: var(--dmg-0);
    }
    #pse-root .pse-meter > span {
      position: absolute; inset: 0;
      border-radius: inherit; background: var(--accent);
      clip-path: inset(0 calc(100% - var(--p, 0%)) 0 0 round 999px);
      transition: clip-path 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }

    /* ── Sections and states ── */
    #pse-root .pse-section + .pse-section { margin-top: 8px; }
    #pse-root .pse-section-head {
      position: sticky; top: 0; z-index: 2;
      display: flex; align-items: center; gap: 14px;
      padding: 12px 0 10px; background: var(--bg);
    }
    #pse-root .pse-collapse {
      display: inline-flex; align-items: center; gap: 8px; min-width: 0;
      height: 32px; padding: 0 8px 0 4px; margin-left: -4px; border-radius: 8px;
      font-size: 15px; font-weight: 750; color: var(--text); letter-spacing: -0.01em;
    }
    #pse-root .pse-collapse:hover { background: var(--surface-2); }
    #pse-root .pse-collapse .pse-icon { width: 16px; height: 16px; color: var(--text-3); transition: transform 0.2s; }
    #pse-root .pse-collapse[aria-expanded="false"] .pse-icon { transform: rotate(-90deg); }
    #pse-root .pse-section-title { font-size: 15px; font-weight: 750; color: var(--text); letter-spacing: -0.01em; }
    #pse-root .pse-dim { color: var(--text-3); font-weight: 600; }
    #pse-root .pse-count { font-size: 13px; color: var(--text-3); font-variant-numeric: tabular-nums; white-space: nowrap; }
    #pse-root .pse-count b { font-size: 15px; font-weight: 750; color: var(--text); }
    #pse-root .pse-section-head .pse-meter { flex: 0 1 140px; }
    #pse-root .pse-section-actions { margin-left: auto; display: flex; gap: 6px; }
    #pse-root .pse-section.collapsed .pse-section-body { display: none; }

    #pse-root .pse-state {
      display: flex; flex-direction: column; align-items: center; gap: 10px;
      max-width: 420px; margin: 0 auto; padding: 56px 16px; text-align: center;
    }
    #pse-root .pse-state-title { font-size: 16px; font-weight: 700; color: var(--text); }
    #pse-root .pse-state p { color: var(--text-2); }
    #pse-root .pse-state .pse-btn { margin-top: 6px; }
    #pse-root .pse-skeleton {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(84px, 1fr)); gap: 6px;
      padding: 0 28px;
    }
    #pse-root .pse-skeleton span {
      height: 108px; border-radius: 10px; background: var(--dmg-0);
      animation: pse-pulse 1.4s ease-in-out infinite;
    }
    @keyframes pse-pulse { 50% { opacity: 0.45; } }

    /* ── Dex ── */
    #pse-root .pse-dex-body { flex: 1; min-height: 0; display: flex; }
    #pse-root .pse-dex-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(88px, 1fr)); gap: 6px;
    }
    #pse-root .pse-mon {
      position: relative;
      display: flex; flex-direction: column; align-items: center;
      min-width: 0; padding: 4px 4px 8px; border-radius: 10px;
      background: var(--dmg-0);
      border: 1px solid var(--dmg-1);
      text-align: center;
      transition: background-color 0.15s, border-color 0.15s;
    }
    #pse-root .pse-mon:hover { background: #164a16; border-color: var(--dmg-2); }
    #pse-root .pse-mon img {
      width: 64px; height: 64px; image-rendering: pixelated;
      filter: url(#pse-dmg); opacity: 0.88;
    }
    #pse-root .pse-mon-no { font-size: 11px; font-weight: 600; color: var(--text-3); font-variant-numeric: tabular-nums; }
    /* Names wrap only at spaces. 11.5px (11px on phones) fits every Gen 1-7 single word,
       measured in the widest common sans, except the few the .long class shrinks. The fixed
       two-line height keeps every row of the grid the same height */
    #pse-root .pse-mon-name {
      display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden;
      max-width: 100%; min-height: 2.5em;
      font-size: 11.5px; font-weight: 600; line-height: 1.25; letter-spacing: -0.01em; color: var(--text-2);
    }
    #pse-root .pse-mon-name.long { font-size: 10.5px; letter-spacing: -0.02em; }
    #pse-root .pse-mon[aria-pressed="true"] { background: var(--surface-2); border-color: var(--line-strong); }
    #pse-root .pse-mon[aria-pressed="true"]:hover { background: var(--surface-3); border-color: #4a5550; }
    #pse-root .pse-mon[aria-pressed="true"] img { filter: none; opacity: 1; }
    #pse-root .pse-mon[aria-pressed="true"] .pse-mon-name { color: var(--text); }
    /* Caught mark: a check drawn from two borders inside the accent dot */
    #pse-root .pse-mon[aria-pressed="true"]::before {
      content: ''; position: absolute; top: 6px; right: 6px;
      width: 16px; height: 16px; border-radius: 50%; background: var(--accent);
    }
    #pse-root .pse-mon[aria-pressed="true"]::after {
      content: ''; position: absolute; top: 9px; right: 11.5px;
      width: 4px; height: 7px;
      border: solid var(--accent-ink); border-width: 0 2px 2px 0;
      transform: rotate(45deg);
    }
    #pse-root .pse-mon.pse-flip, #pse-root .pse-ach.pse-flip { animation: pse-press 0.18s cubic-bezier(0.16, 1, 0.3, 1); }
    @keyframes pse-press { from { transform: scale(0.94); } }

    #pse-root .pse-genrail {
      flex-shrink: 0; display: flex; flex-direction: column; gap: 4px;
      width: 40px; margin: 6px 20px 28px 0;
    }
    #pse-root .pse-genrail-seg {
      position: relative; min-height: 26px;
      display: flex; align-items: flex-start; justify-content: center;
      padding-top: 5px; border-radius: 8px; overflow: hidden;
      background: var(--dmg-0);
      transition: box-shadow 0.15s, opacity 0.15s;
    }
    #pse-root .pse-genrail-seg::before {
      content: ''; position: absolute; inset: 0;
      background: var(--accent);
      clip-path: inset(calc(100% - var(--p, 0%)) 0 0 0);
    }
    #pse-root .pse-genrail-seg:hover { box-shadow: inset 0 0 0 2px var(--dmg-2); }
    #pse-root .pse-genrail-seg[aria-current="true"] { box-shadow: inset 0 0 0 2px var(--text); }
    #pse-root .pse-genrail-seg.empty { opacity: 0.45; }
    /* A generation the game does not have yet: hatched, without the progress fill */
    #pse-root .pse-genrail-seg.locked {
      cursor: not-allowed; box-shadow: none;
      background: repeating-linear-gradient(135deg, var(--surface) 0 6px, var(--surface-2) 6px 12px);
    }
    #pse-root .pse-genrail-seg.locked::before { content: none; }
    #pse-root .pse-genrail-seg.locked .pse-genrail-num { color: var(--text-3); }
    #pse-root .pse-genrail-num {
      position: relative; z-index: 1;
      min-width: 22px; padding: 2px 0; border-radius: 6px;
      background: rgba(10, 14, 12, 0.72); color: var(--text);
      font-size: 12px; font-weight: 750; text-align: center; font-variant-numeric: tabular-nums;
    }
    #pse-root .pse-genchips {
      display: none; gap: 6px; overflow-x: auto; scrollbar-width: none;
      padding: 0 16px 12px;
    }
    #pse-root .pse-genchip {
      flex-shrink: 0; display: inline-flex; align-items: center; gap: 6px;
      height: 32px; padding: 0 12px; border-radius: 999px;
      background: var(--surface); border: 1px solid var(--line);
      font-size: 12px; font-weight: 700; color: var(--text-2); font-variant-numeric: tabular-nums;
    }
    #pse-root .pse-genchip[aria-current="true"] { border-color: var(--accent); color: var(--text); }
    #pse-root .pse-genchip.done { color: var(--accent); }
    #pse-root .pse-genchip.locked { color: var(--text-3); border-style: dashed; }
    #pse-root .pse-genchip .pse-icon { width: 13px; height: 13px; }
    #pse-root .pse-section-locked .pse-section-head { position: static; }
    #pse-root .pse-locked-title {
      display: inline-flex; align-items: center; gap: 8px;
      font-size: 15px; font-weight: 750; color: var(--text-3); letter-spacing: -0.01em;
    }
    #pse-root .pse-locked-title .pse-icon { width: 16px; height: 16px; }

    /* ── Split views (Hall of Fame, Stat Buffs) ── */
    #pse-root .pse-split { flex: 1; min-height: 0; display: grid; grid-template-columns: 320px minmax(0, 1fr); }
    #pse-root .pse-split-list {
      min-height: 0; display: flex; flex-direction: column;
      border-right: 1px solid var(--line);
    }
    #pse-root .pse-split-list .pse-scroll { padding: 0 16px 20px 28px; }
    #pse-root .pse-list-head { display: flex; flex-direction: column; gap: 12px; padding: 0 16px 14px 28px; }
    /* The column layout would turn the toolbar's 220px flex-basis into a height */
    #pse-root .pse-list-head .pse-search { flex: none; }
    #pse-root .pse-split-detail { min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 0 28px 32px; scrollbar-width: thin; scrollbar-color: var(--line-strong) transparent; }
    #pse-root .pse-list { display: flex; flex-direction: column; gap: 4px; list-style: none; }

    #pse-root .pse-run {
      display: flex; flex-direction: column; gap: 6px; width: 100%;
      padding: 12px; border-radius: 12px; border: 1px solid transparent;
      transition: background-color 0.15s, border-color 0.15s;
    }
    #pse-root .pse-run:hover { background: var(--surface); }
    #pse-root .pse-run[aria-current="true"] { background: var(--surface-2); border-color: var(--accent); }
    #pse-root .pse-run-top { display: flex; align-items: baseline; gap: 8px; }
    #pse-root .pse-run-name { font-size: 14px; font-weight: 750; color: var(--text); }
    #pse-root .pse-run-date { margin-left: auto; font-size: 12px; color: var(--text-3); font-variant-numeric: tabular-nums; }
    #pse-root .pse-run-mode { display: flex; flex-wrap: wrap; gap: 6px; }
    #pse-root .pse-tag {
      display: inline-flex; align-items: center; gap: 4px;
      height: 22px; padding: 0 8px; border-radius: 6px;
      background: var(--surface-3); color: var(--text-2);
      font-size: 11px; font-weight: 700; white-space: nowrap;
    }
    #pse-root .pse-tag-tower { background: rgba(74, 140, 240, 0.16); color: #9cc2ff; }
    #pse-root .pse-tag-nuz { background: rgba(240, 86, 75, 0.15); color: #ff9e95; }
    #pse-root .pse-run-team { display: flex; gap: 2px; min-height: 36px; }
    #pse-root .pse-run-team img { width: 36px; height: 36px; image-rendering: pixelated; }
    #pse-root .pse-run-empty { font-size: 12px; color: var(--text-3); line-height: 36px; }

    #pse-root .pse-detail-head { display: flex; align-items: center; gap: 12px; min-height: 40px; margin-bottom: 18px; }
    #pse-root .pse-detail-title { font: 750 18px/1.2 var(--font); letter-spacing: -0.01em; color: var(--text); }
    #pse-root .pse-detail-head .pse-btn { margin-left: auto; }
    #pse-root .pse-back { display: none; margin-left: -8px; }
    #pse-root .pse-back-row { display: none; }
    #pse-root .pse-fields { display: flex; flex-direction: column; gap: 14px; margin-bottom: 26px; }
    #pse-root .pse-field-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 16px; }
    #pse-root .pse-field-label { width: 72px; font-size: 13px; font-weight: 650; color: var(--text-3); }
    #pse-root .pse-subhead { display: flex; align-items: baseline; gap: 10px; margin-bottom: 12px; }
    #pse-root .pse-subhead-title { font-size: 15px; font-weight: 750; color: var(--text); }

    #pse-root .pse-team { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
    #pse-root .pse-slot {
      position: relative; min-width: 0;
      display: flex; align-items: center; gap: 8px;
      min-height: 84px; padding: 6px 10px 6px 6px; border-radius: 12px;
      background: var(--surface); border: 1px solid var(--line);
      text-align: left;
      transition: background-color 0.15s, border-color 0.15s;
    }
    #pse-root .pse-slot-text { display: flex; flex-direction: column; min-width: 0; }
    #pse-root .pse-slot-species { font-size: 12px; color: var(--text-3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    #pse-root button.pse-slot:hover { background: var(--surface-2); border-color: var(--line-strong); }
    #pse-root .pse-slot[aria-expanded="true"] { background: var(--surface-2); border-color: var(--accent); }
    #pse-root .pse-slot img { flex-shrink: 0; width: 64px; height: 64px; image-rendering: pixelated; }
    #pse-root .pse-slot-name {
      display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden;
      max-width: 100%; line-height: 1.25;
      font-size: 13px; font-weight: 700; color: var(--text);
    }
    #pse-root .pse-slot-level { font-size: 12px; color: var(--text-3); font-variant-numeric: tabular-nums; }
    #pse-root .pse-slot-shiny { position: absolute; top: 6px; left: 6px; color: var(--accent); }
    #pse-root .pse-slot-shiny .pse-icon { width: 16px; height: 16px; }
    #pse-root .pse-slot-add { justify-content: center; padding: 6px; border-style: dashed; border-color: var(--line-strong); background: transparent; color: var(--text-2); font-size: 13px; font-weight: 650; }
    #pse-root .pse-slot-add .pse-icon { width: 22px; height: 22px; }
    #pse-root .pse-slot-empty { background: transparent; border-style: dashed; opacity: 0.5; }
    #pse-root .pse-slot-sprite { position: relative; flex-shrink: 0; }
    #pse-root .pse-item-badge {
      position: absolute; right: -4px; bottom: -2px;
      width: 24px; height: 24px; border-radius: 7px;
      display: grid; place-items: center;
      background: var(--surface-3); box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
      font-size: 14px; line-height: 1;
    }
    #pse-root .pse-run-team .pse-item-badge { display: none; }

    #pse-root .pse-panel {
      margin-top: 14px; padding: 18px; border-radius: 14px;
      background: var(--surface); border: 1px solid var(--line-strong);
      animation: pse-open 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes pse-open { from { opacity: 0; transform: translateY(-6px); } }
    #pse-root .pse-panel-head { display: flex; align-items: center; gap: 14px; margin-bottom: 16px; }
    #pse-root .pse-panel-head img { width: 80px; height: 80px; margin: -8px 0; image-rendering: pixelated; }
    #pse-root .pse-panel-title { font-size: 16px; font-weight: 750; color: var(--text); }
    #pse-root .pse-panel-sub { font-size: 12px; color: var(--text-3); }
    #pse-root .pse-panel-head .pse-icon-btn { margin-left: auto; align-self: flex-start; }
    #pse-root .pse-form { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr) auto; align-items: end; gap: 14px; margin-bottom: 14px; }
    #pse-root .pse-field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
    #pse-root .pse-label { font-size: 12px; font-weight: 650; color: var(--text-3); }
    #pse-root .pse-panel-foot { display: flex; justify-content: flex-end; margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--line); }

    #pse-root .pse-stepper { display: flex; align-items: center; }
    #pse-root .pse-stepper .pse-input { width: 64px; text-align: center; border-radius: 0; border-left: 0; border-right: 0; padding: 0 4px; -moz-appearance: textfield; }
    #pse-root .pse-stepper .pse-input::-webkit-inner-spin-button, #pse-root .pse-stepper .pse-input::-webkit-outer-spin-button { -webkit-appearance: none; }
    #pse-root .pse-stepper > button {
      width: 36px; height: 40px; display: grid; place-items: center;
      background: var(--surface-2); border: 1px solid var(--line-strong); color: var(--text-2);
      transition: background-color 0.15s, color 0.15s;
    }
    #pse-root .pse-stepper > button:first-child { border-radius: 10px 0 0 10px; }
    #pse-root .pse-stepper > button:last-child { border-radius: 0 10px 10px 0; }
    #pse-root .pse-stepper > button:hover:not(:disabled) { background: var(--surface-3); color: var(--text); }
    #pse-root .pse-stepper > button:disabled { opacity: 0.4; }
    #pse-root .pse-stepper .pse-icon { width: 16px; height: 16px; }

    #pse-root .pse-item-current {
      display: flex; align-items: center; gap: 10px; width: 100%;
      min-height: 44px; padding: 8px 12px; border-radius: 10px;
      background: var(--bg); border: 1px solid var(--line-strong);
      transition: border-color 0.15s;
    }
    #pse-root .pse-item-current:hover { border-color: #4a5550; }
    #pse-root .pse-item-current > .pse-icon { margin-left: auto; color: var(--text-3); transition: transform 0.2s; }
    #pse-root .pse-item-current[aria-expanded="true"] > .pse-icon { transform: rotate(180deg); }
    #pse-root .pse-item-icon { width: 24px; flex-shrink: 0; font-size: 18px; line-height: 1.2; text-align: center; }
    #pse-root .pse-item-text { display: flex; flex-direction: column; min-width: 0; text-align: left; }
    #pse-root .pse-item-name { font-size: 14px; font-weight: 650; color: var(--text); }
    #pse-root .pse-item-desc { font-size: 12px; line-height: 1.4; color: var(--text-2); }
    #pse-root .pse-item-menu {
      margin-top: 6px; border-radius: 12px; overflow: hidden;
      background: var(--bg); border: 1px solid var(--line-strong);
    }
    #pse-root .pse-item-menu .pse-search { margin: 8px; }
    #pse-root .pse-item-list { max-height: 280px; overflow-y: auto; padding: 0 4px 4px; scrollbar-width: thin; scrollbar-color: var(--line-strong) transparent; }
    #pse-root .pse-item-option {
      display: flex; align-items: flex-start; gap: 10px; width: 100%;
      padding: 8px 10px; border-radius: 8px;
    }
    #pse-root .pse-item-option:hover, #pse-root .pse-item-option:focus-visible { background: var(--surface-2); outline: none; }
    #pse-root .pse-item-option[aria-selected="true"] { background: var(--accent-weak); }
    #pse-root .pse-item-option[aria-selected="true"] .pse-item-name { color: var(--accent); }
    #pse-root .pse-item-empty { padding: 14px; font-size: 13px; color: var(--text-3); text-align: center; }

    #pse-root .pse-picker-grid { margin-top: 12px; max-height: 340px; overflow-y: auto; padding: 2px; scrollbar-width: thin; scrollbar-color: var(--line-strong) transparent; }
    #pse-root .pse-picker-grid .pse-mon { background: var(--surface-2); border-color: var(--line); }
    #pse-root .pse-picker-grid .pse-mon img { filter: none; opacity: 1; }
    #pse-root .pse-picker-grid .pse-mon .pse-mon-name { color: var(--text); }
    #pse-root .pse-picker-note { margin-top: 10px; font-size: 12px; color: var(--text-3); }

    #pse-root .pse-tip {
      position: fixed; z-index: 20; max-width: 260px;
      display: flex; flex-direction: column; gap: 2px;
      padding: 8px 12px; border-radius: 10px;
      background: var(--surface-3); border: 1px solid var(--line-strong);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
      pointer-events: none; opacity: 0; transition: opacity 0.12s;
    }
    #pse-root .pse-tip.visible { opacity: 1; }

    /* ── Stat Buffs ── */
    #pse-root .pse-lines { display: grid; grid-template-columns: repeat(auto-fill, minmax(124px, 1fr)); gap: 6px; }
    #pse-root .pse-line {
      position: relative; display: flex; flex-direction: column; align-items: center; gap: 2px;
      padding: 6px 6px 10px; border-radius: 12px; border: 1px solid var(--line);
      text-align: center;
      transition: background-color 0.15s, border-color 0.15s;
    }
    #pse-root .pse-line:hover { background: var(--surface); border-color: var(--line-strong); }
    #pse-root .pse-line[aria-current="true"] { background: var(--surface-2); border-color: var(--accent); }
    #pse-root .pse-line img { width: 64px; height: 64px; image-rendering: pixelated; }
    #pse-root .pse-line-name { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; font-weight: 700; color: var(--text); }
    #pse-root .pse-line-points { font-size: 12px; color: var(--text-3); font-variant-numeric: tabular-nums; }
    #pse-root .pse-line-points.has-points { color: var(--accent); font-weight: 700; }
    #pse-root .pse-line .pse-slot-shiny { top: 6px; left: 6px; }

    #pse-root .pse-buff-head { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; }
    #pse-root .pse-buff-head img { width: 96px; height: 96px; margin: -10px -6px; image-rendering: pixelated; }
    #pse-root .pse-buff-head .pse-detail-title { margin-bottom: 4px; }
    #pse-root .pse-buff-head p { font-size: 13px; color: var(--text-3); }
    #pse-root .pse-points {
      display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 4px 18px;
      padding: 16px 18px; margin-bottom: 18px; border-radius: 14px;
      background: var(--surface); border: 1px solid var(--line);
    }
    #pse-root .pse-points-num { font-size: 34px; font-weight: 800; line-height: 1; letter-spacing: -0.03em; color: var(--text); font-variant-numeric: tabular-nums; }
    #pse-root .pse-points-num small { font-size: 15px; font-weight: 650; letter-spacing: 0; color: var(--text-3); }
    #pse-root .pse-points.full .pse-points-num { color: var(--accent); }
    #pse-root .pse-points.over .pse-points-num { color: var(--danger); }
    #pse-root .pse-points .pse-meter { height: 8px; }
    #pse-root .pse-points.over .pse-meter > span { background: var(--danger); }
    #pse-root .pse-points-hint { grid-column: 1 / -1; font-size: 12px; color: var(--text-3); }
    #pse-root .pse-points-hint.warn { color: var(--danger); }

    #pse-root .pse-stats { display: flex; flex-direction: column; gap: 6px; }
    #pse-root .pse-stat {
      display: grid; grid-template-columns: 84px minmax(0, 1fr) auto 56px; align-items: center; gap: 14px;
      padding: 8px 12px; border-radius: 12px;
    }
    #pse-root .pse-stat:hover { background: var(--surface); }
    #pse-root .pse-stat-name { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; color: var(--text); }
    #pse-root .pse-stat-name::before { content: ''; width: 10px; height: 10px; border-radius: 3px; background: var(--c); }
    #pse-root .pse-cells { position: relative; display: grid; grid-template-columns: repeat(10, 1fr); gap: 4px; height: 26px; }
    #pse-root .pse-cells > span { border-radius: 4px; background: var(--surface-3); transition: background-color 0.12s; }
    #pse-root .pse-cells > span.on { background: var(--c); }
    #pse-root .pse-cells.overflow > span.on { box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.55); }
    #pse-root .pse-cells input[type="range"] {
      position: absolute; inset: -6px 0; width: 100%; height: calc(100% + 12px);
      opacity: 0; cursor: pointer; margin: 0;
    }
    #pse-root .pse-cells:has(input:focus-visible) { outline: 2px solid var(--accent); outline-offset: 4px; border-radius: 6px; }
    #pse-root .pse-cells:hover > span:not(.on) { background: #343e37; }
    #pse-root .pse-stat .pse-stepper .pse-input { width: 56px; height: 34px; }
    #pse-root .pse-stat .pse-stepper > button { width: 32px; height: 34px; }
    #pse-root .pse-stat-pct { font-size: 14px; font-weight: 750; text-align: right; color: var(--text-2); font-variant-numeric: tabular-nums; }
    #pse-root .pse-stat-pct.on { color: var(--text); }
    #pse-root .pse-buff-note { margin-top: 14px; font-size: 12px; color: var(--text-3); }
    #pse-root .pse-buff-foot { display: flex; align-items: center; gap: 16px; margin-top: 18px; padding-top: 16px; border-top: 1px solid var(--line); }
    #pse-root .pse-buff-foot .pse-btn { margin-left: auto; }

    /* ── Achievements ── */
    #pse-root .pse-ach-summary { display: flex; align-items: baseline; gap: 10px; }
    #pse-root .pse-ach-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 6px; }
    #pse-root .pse-ach {
      position: relative; display: flex; align-items: flex-start; gap: 12px;
      min-width: 0; padding: 10px 34px 10px 10px; border-radius: 12px;
      background: var(--dmg-0); border: 1px solid var(--dmg-1);
      transition: background-color 0.15s, border-color 0.15s;
    }
    #pse-root .pse-ach:hover { background: #164a16; border-color: var(--dmg-2); }
    #pse-root .pse-ach-icon {
      flex-shrink: 0; width: 40px; height: 40px; border-radius: 10px;
      display: grid; place-items: center;
      background: rgba(0, 0, 0, 0.22); font-size: 22px; line-height: 1;
    }
    #pse-root .pse-ach-icon > span { filter: url(#pse-dmg); }
    #pse-root .pse-ach-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    #pse-root .pse-ach-name { font-size: 13px; font-weight: 700; color: var(--text-2); }
    #pse-root .pse-ach-desc { font-size: 12px; line-height: 1.4; color: var(--text-3); }
    #pse-root .pse-ach[aria-pressed="true"] { background: var(--surface-2); border-color: var(--line-strong); }
    #pse-root .pse-ach[aria-pressed="true"]:hover { background: var(--surface-3); }
    #pse-root .pse-ach[aria-pressed="true"] .pse-ach-icon { background: var(--surface-3); }
    #pse-root .pse-ach[aria-pressed="true"] .pse-ach-icon > span { filter: none; }
    #pse-root .pse-ach[aria-pressed="true"] .pse-ach-name { color: var(--text); }
    #pse-root .pse-ach[aria-pressed="true"] .pse-ach-desc { color: var(--text-2); }
    #pse-root .pse-ach[aria-pressed="true"]::before {
      content: ''; position: absolute; top: 10px; right: 10px;
      width: 16px; height: 16px; border-radius: 50%; background: var(--accent);
    }
    #pse-root .pse-ach[aria-pressed="true"]::after {
      content: ''; position: absolute; top: 13px; right: 15.5px;
      width: 4px; height: 7px;
      border: solid var(--accent-ink); border-width: 0 2px 2px 0;
      transform: rotate(45deg);
    }

    /* ── Extras ── */
    #pse-root .pse-section-note { margin: -2px 0 12px; font-size: 13px; color: var(--text-3); }
    #pse-root .pse-form .pse-ach-icon img { width: 40px; height: 40px; object-fit: contain; image-rendering: pixelated; }
    #pse-root #pse-bag { margin-top: 20px; }
    #pse-root .pse-bag-list { display: flex; flex-direction: column; gap: 6px; max-width: 720px; list-style: none; }
    #pse-root .pse-bag-row {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 12px; border-radius: 12px;
      background: var(--surface); border: 1px solid var(--line);
    }
    #pse-root .pse-bag-row .pse-item-text { flex: 1; }
    #pse-root .pse-bag-icon { width: 32px; height: 32px; flex-shrink: 0; display: grid; place-items: center; font-size: 22px; line-height: 1; }
    #pse-root .pse-bag-icon img { width: 32px; height: 32px; image-rendering: pixelated; }
    #pse-root .pse-bag-row .pse-stepper .pse-input { width: 56px; height: 34px; }
    #pse-root .pse-bag-row .pse-stepper > button { width: 32px; height: 34px; }

    /* ── Settings ── */
    #pse-root .pse-settings { display: flex; flex-direction: column; gap: 28px; max-width: 560px; }
    #pse-root .pse-group-title { margin-bottom: 4px; font-size: 15px; font-weight: 750; color: var(--text); }
    #pse-root .pse-group-sub { margin-bottom: 14px; font-size: 13px; color: var(--text-3); }
    #pse-root .pse-group-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 180px)); gap: 14px 16px; margin-bottom: 12px; }
    #pse-root .pse-saved { font-size: 12px; font-weight: 650; color: var(--ok); opacity: 0; transition: opacity 0.2s; }
    #pse-root .pse-saved.visible { opacity: 1; }
    #pse-root .pse-shells { display: flex; flex-wrap: wrap; gap: 10px; }
    #pse-root .pse-shell-opt {
      display: flex; flex-direction: column; align-items: center; gap: 6px;
      width: 76px; padding: 8px 4px; border-radius: 12px;
      font-size: 12px; font-weight: 650; color: var(--text-2);
      transition: background-color 0.15s;
    }
    #pse-root .pse-shell-opt:hover { background: var(--surface); }
    #pse-root .pse-shell-swatch {
      width: 44px; height: 44px; border-radius: 12px; background: var(--swatch);
      box-shadow: inset 0 -3px 0 rgba(0, 0, 0, 0.18), inset 0 0 0 1px rgba(255, 255, 255, 0.12);
    }
    #pse-root .pse-shell-opt[aria-checked="true"] { color: var(--text); }
    #pse-root .pse-shell-opt[aria-checked="true"] .pse-shell-swatch { outline: 2px solid var(--text); outline-offset: 3px; }
    #pse-root .pse-about { font-size: 13px; color: var(--text-3); }
    #pse-root .pse-strong { color: var(--text); font-weight: 700; }
    #pse-root .pse-facts { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
    #pse-root .pse-facts > div { min-width: 112px; padding: 10px 14px; border-radius: 12px; background: var(--surface); border: 1px solid var(--line); }
    #pse-root .pse-facts dt { font-size: 12px; font-weight: 650; color: var(--text-3); }
    #pse-root .pse-facts dd { font-size: 18px; font-weight: 750; color: var(--text); font-variant-numeric: tabular-nums; }
    #pse-root .pse-cloud-check { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 14px; }
    #pse-root .pse-cloud-result { flex: 1 1 240px; font-size: 13px; color: var(--text-2); }
    #pse-root .pse-about a { color: var(--accent); text-underline-offset: 3px; }

    /* ── Toast ── */
    #pse-root .pse-toast {
      position: absolute; z-index: 10; left: 50%; bottom: 20px;
      display: flex; align-items: center; gap: 14px;
      max-width: calc(100% - 32px); padding: 8px 8px 8px 16px; border-radius: 12px;
      background: #eef1ec; color: #141816;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
      font-size: 13px; font-weight: 650;
      transform: translate(-50%, 16px); opacity: 0; visibility: hidden;
      transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.18s, visibility 0s 0.22s;
    }
    #pse-root .pse-toast.visible { transform: translate(-50%, 0); opacity: 1; visibility: visible; transition-delay: 0s; }
    #pse-root .pse-toast-text { padding: 6px 0; }
    #pse-root .pse-toast .pse-btn { height: 32px; background: #141816; color: #eef1ec; }
    #pse-root .pse-toast .pse-btn:hover { background: #2b332d; }
    #pse-root .pse-toast .pse-btn:focus-visible { outline-color: #141816; }

    /* ── Narrow screens: full-screen sheet ── */
    @media (max-width: 760px) {
      #pse-root #pse-launcher { width: 34px; padding: 10px 0 10px 2px; }
      #pse-root .pse-launcher-label { display: none; }
      #pse-root #pse-app { width: 100vw; height: 100dvh; border-radius: 0; }
      #pse-root .pse-shell {
        grid-template-columns: minmax(0, 1fr);
        grid-template-rows: auto minmax(0, 1fr) auto;
        grid-template-areas: "rail" "main" "commit";
      }
      #pse-root .pse-rail { flex-direction: column; gap: 10px; padding: 14px 0 10px; overflow: visible; }
      #pse-root .pse-brand { display: flex; align-items: baseline; gap: 8px; padding: 2px 64px 0 16px; }
      #pse-root .pse-brand-name { font-size: 17px; }
      #pse-root .pse-nav { flex-direction: row; gap: 4px; overflow-x: auto; scrollbar-width: none; padding: 4px 12px; margin: -4px 0; scroll-padding: 0 12px; }
      #pse-root .pse-nav-item { width: auto; flex-shrink: 0; min-height: 38px; gap: 8px; padding: 6px 12px; }
      #pse-root .pse-nav-item .pse-icon { display: none; }
      #pse-root .pse-nav-count { margin-left: 2px; }
      #pse-root .pse-close { top: 8px; right: 8px; color: var(--shell-ink); }
      #pse-root .pse-close:hover { background: var(--shell-hover); color: var(--shell-ink); }
      #pse-root .pse-close:focus-visible { outline-color: var(--shell-ink); }
      #pse-root .pse-commit {
        flex-direction: row; align-items: center; gap: 12px;
        padding: 10px 12px calc(10px + env(safe-area-inset-bottom, 0px)) 16px;
      }
      #pse-root .pse-commit-status { flex: 1; padding: 0; }
      #pse-root .pse-credit { display: none; }
      #pse-root .pse-btn-commit { flex-shrink: 0; height: 44px; padding: 0 16px; }
      #pse-root .pse-toast { left: 12px; right: 12px; bottom: calc(80px + env(safe-area-inset-bottom, 0px)); max-width: none; justify-content: space-between; transform: translateY(16px); }
      #pse-root .pse-toast.visible { transform: none; }
      #pse-root .pse-main-head { display: none; }
      #pse-root .pse-view { padding-top: 14px; }
      #pse-root .pse-toolbar { padding: 0 16px 12px; gap: 8px; }
      #pse-root .pse-search { flex-basis: 100%; }
      #pse-root .pse-search-kbd { display: none; }
      #pse-root .pse-scroll { padding: 0 16px 24px; }
      #pse-root .pse-skeleton { padding: 0 16px; }
      #pse-root .pse-genrail { display: none; }
      #pse-root .pse-genchips { display: flex; }
      #pse-root .pse-dex-grid { grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); }
      #pse-root .pse-mon { padding: 4px 2px 8px; }
      #pse-root .pse-mon-name { font-size: 11px; }
      #pse-root .pse-mon-name.long { font-size: 10px; }
      #pse-root .pse-mon img { width: 56px; height: 56px; }
      #pse-root .pse-section-head { flex-wrap: wrap; gap: 6px 12px; }
      #pse-root .pse-section-head .pse-meter { order: 5; flex-basis: 100%; }

      #pse-root .pse-split { grid-template-columns: minmax(0, 1fr); }
      #pse-root .pse-split-list { border-right: 0; }
      #pse-root .pse-split.has-detail .pse-split-list { display: none; }
      #pse-root .pse-split:not(.has-detail) .pse-split-detail { display: none; }
      #pse-root .pse-split-list .pse-scroll { padding: 0 16px 24px; }
      #pse-root .pse-list-head { padding: 0 16px 12px; }
      #pse-root .pse-split-detail { padding: 0 16px 24px; }
      #pse-root .pse-back { display: grid; }
      #pse-root .pse-back-row { display: flex; margin-bottom: 4px; }
      #pse-root .pse-team { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      #pse-root .pse-slot img { width: 56px; height: 56px; }
      #pse-root .pse-form { grid-template-columns: minmax(0, 1fr) auto; }
      #pse-root .pse-form .pse-field:first-child { grid-column: 1 / -1; }
      #pse-root .pse-panel { padding: 14px; }
      #pse-root .pse-stat { grid-template-columns: minmax(0, 1fr) auto 48px; gap: 8px 10px; padding: 8px 4px; }
      #pse-root .pse-stat .pse-cells { grid-column: 1 / -1; grid-row: 2; }
      #pse-root .pse-points { grid-template-columns: auto 1fr; }
      #pse-root .pse-points .pse-switch { grid-column: 1 / -1; }
      #pse-root .pse-ach-grid { grid-template-columns: minmax(0, 1fr); }
      #pse-root .pse-group-fields { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }

    @media (prefers-reduced-motion: reduce) {
      #pse-root *, #pse-root *::before, #pse-root *::after {
        animation-duration: 0.01ms !important; transition-duration: 0.01ms !important;
      }
    }
  `;
  document.head.appendChild(style);

  // ─── Shared helpers ──────────────────────────────────────────────────────────
  // Item texts and nicknames contain quotes and ampersands, which would break HTML attributes
  const escapeHtml = text => String(text ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const plural = (count, word, many = `${word}s`) => `${count} ${count === 1 ? word : many}`;

  // Tampermonkey hands every script GM_info; the fallback has to match @version above
  const SCRIPT_VERSION = (() => {
    try {
      return GM_info.script.version;
    } catch {
      return '3.0.0';
    }
  })();

  // The version the game shows on its home screen, plus the build of its script files
  function gameVersion() {
    const shown = document.getElementById('home-version-badge')?.textContent.trim();
    const build = typeof window.__assetVersion === 'string' ? window.__assetVersion : '';
    return { shown: shown || null, build: build || null };
  }

  function versionsText() {
    const game = gameVersion();
    const gameText = game.shown ? `Game ${game.shown}` : game.build ? `Game build ${game.build}` : 'Game version unknown';
    return `Editor ${SCRIPT_VERSION} · ${gameText}`;
  }
  const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isNarrow = () => window.matchMedia('(max-width: 760px)').matches;

  function debounce(fn, wait) {
    let timer = null;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), wait);
    };
  }

  // Replays the short colour-flip animation on a cell that just changed state
  function flip(el) {
    el.classList.remove('pse-flip');
    void el.offsetWidth;
    el.classList.add('pse-flip');
  }

  // ─── Icons ───────────────────────────────────────────────────────────────────
  const ICON_PATHS = {
    close: '<path d="M18 6 6 18M6 6l12 12"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>',
    back: '<path d="m15 18-6-6 6-6"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    reload: '<path d="M21 12a9 9 0 1 1-2.64-6.36L21 8"/><path d="M21 3v5h-5"/>',
    book: '<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2zM22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>',
    trophy: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>',
    buffs: '<path d="M3 3v18h18"/><path d="M8 17v-5M13 17V8M18 17V5"/>',
    medal: '<circle cx="12" cy="8" r="6"/><path d="M15.48 12.89 17 22l-5-3-5 3 1.52-9.11"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    bag: '<path d="M4 10a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM8 10h8M8 18h8M8 22v-6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v6M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>',
    sliders: '<path d="M21 4h-7M10 4H3M21 12h-9M8 12H3M21 20h-5M12 20H3M14 2v4M8 10v4M16 18v4"/>',
    handheld: '<rect x="5" y="2" width="14" height="20" rx="2.5"/><rect x="8" y="5" width="8" height="6" rx="1"/><path d="M8.5 16.5h3M10 15v3"/><circle cx="15.5" cy="15.5" r=".6" class="pse-icon-fill"/><circle cx="14" cy="17.5" r=".6" class="pse-icon-fill"/>',
  };
  const SPARKLE_PATH = '<path d="M12 2.5l1.9 5.6a3 3 0 0 0 1.9 1.9l5.7 2-5.7 2a3 3 0 0 0-1.9 1.9L12 21.5l-1.9-5.6a3 3 0 0 0-1.9-1.9l-5.7-2 5.7-2a3 3 0 0 0 1.9-1.9z"/>';

  function icon(name) {
    if (name === 'sparkle') return `<svg class="pse-icon pse-icon-fill" viewBox="0 0 24 24" aria-hidden="true">${SPARKLE_PATH}</svg>`;
    return `<svg class="pse-icon" viewBox="0 0 24 24" aria-hidden="true">${ICON_PATHS[name]}</svg>`;
  }

  // ─── Shells ──────────────────────────────────────────────────────────────────
  // Game Boy Color shell colours. The chosen one paints the rail, launcher and accents
  const SHELLS = [
    { id: 'dandelion', name: 'Dandelion', swatch: '#f2c230' },
    { id: 'berry', name: 'Berry', swatch: '#c8366f' },
    { id: 'kiwi', name: 'Kiwi', swatch: '#9cc43a' },
    { id: 'teal', name: 'Teal', swatch: '#19a3a1' },
    { id: 'grape', name: 'Grape', swatch: '#6a4cc0' },
    { id: 'atomic', name: 'Atomic Purple', swatch: 'linear-gradient(135deg, rgba(120, 100, 200, 0.9), rgba(70, 54, 130, 0.75))' },
  ];
  const savedShell = localStorage.getItem('pse_shell');
  const currentShell = () => (SHELLS.some(s => s.id === savedShell) ? savedShell : 'dandelion');

  // ─── Views ───────────────────────────────────────────────────────────────────
  const VIEWS = {
    'dex': { title: 'Pokédex', icon: 'book', needsPokemon: true, render: container => renderDex(container) },
    'hall-of-fame': { title: 'Hall of Fame', icon: 'trophy', needsPokemon: true, render: container => renderHallOfFame(container) },
    'stat-buffs': { title: 'Stat Buffs', icon: 'buffs', needsPokemon: true, render: container => renderStatBuffs(container) },
    'achievements': { title: 'Achievements', icon: 'medal', render: container => renderAchievements(container) },
    'extras': { title: 'Extras', icon: 'bag', render: container => renderExtras(container) },
    'settings': { title: 'Settings', icon: 'sliders', render: container => renderSettings(container) },
  };
  if (!VIEWS[STATE.currentView]) STATE.currentView = 'dex';

  // ─── Root, launcher and dialog ───────────────────────────────────────────────
  const root = document.createElement('div');
  root.id = 'pse-root';
  root.dataset.shell = currentShell();
  root.innerHTML = `
    <svg class="pse-defs" aria-hidden="true" focusable="false">
      <filter id="pse-dmg" color-interpolation-filters="sRGB">
        <feColorMatrix type="matrix" values="0.3 0.59 0.11 0 0  0.3 0.59 0.11 0 0  0.3 0.59 0.11 0 0  0 0 0 1 0"/>
        <feComponentTransfer>
          <feFuncR type="discrete" tableValues="0.059 0.188 0.545 0.608"/>
          <feFuncG type="discrete" tableValues="0.22 0.384 0.675 0.737"/>
          <feFuncB type="discrete" tableValues="0.059 0.188 0.059 0.059"/>
        </feComponentTransfer>
      </filter>
    </svg>
    <button type="button" id="pse-launcher" aria-label="Open Save Editor (Ctrl+Shift+E)" title="Save Editor (Ctrl+Shift+E)">
      ${icon('handheld')}
      <span class="pse-launcher-label">Editor</span>
      <span class="pse-launcher-badge" hidden></span>
    </button>
    <dialog id="pse-app" aria-labelledby="pse-app-title">
      <div class="pse-shell">
        <div class="pse-rail pse-on-shell">
          <div class="pse-brand">
            <span class="pse-brand-name" id="pse-app-title">Save Editor</span>
            <span class="pse-brand-sub">for Pokelike</span>
          </div>
          <nav class="pse-nav" aria-label="Editor sections">
            ${Object.entries(VIEWS).map(([id, view]) => `
              <button type="button" class="pse-nav-item" data-view="${id}">
                ${icon(view.icon)}<span>${view.title}</span><span class="pse-nav-count" data-count="${id}"></span>
              </button>
            `).join('')}
          </nav>
        </div>
        <div class="pse-commit pse-on-shell">
          <p class="pse-commit-status" id="pse-pending" aria-live="polite"></p>
          <button type="button" class="pse-btn-commit" id="pse-save-reload">
            ${icon('reload')}<span class="pse-commit-label">Save & Reload</span><span class="pse-commit-count" hidden></span>
          </button>
          <p class="pse-credit" id="pse-credit"></p>
        </div>
        <main class="pse-main">
          <header class="pse-main-head">
            <h2 class="pse-view-title" id="pse-view-title"></h2>
            <p class="pse-view-sub" id="pse-view-sub"></p>
          </header>
          <div class="pse-view" id="pse-view"></div>
        </main>
        <button type="button" class="pse-icon-btn pse-close" aria-label="Close editor">${icon('close')}</button>
      </div>
      <div class="pse-toast" role="status" aria-live="polite">
        <span class="pse-toast-text"></span>
        <button type="button" class="pse-btn pse-btn-sm" hidden>${icon('undo')}Undo</button>
      </div>
      <div class="pse-tip" role="tooltip"><span class="pse-item-name"></span><span class="pse-item-desc"></span></div>
    </dialog>
  `;
  document.body.appendChild(root);

  const app = root.querySelector('#pse-app');
  const viewEl = root.querySelector('#pse-view');
  const launcher = root.querySelector('#pse-launcher');
  const launcherBadge = root.querySelector('.pse-launcher-badge');
  const viewSub = root.querySelector('#pse-view-sub');

  function openEditor() {
    if (app.open) return;
    app.showModal();
    // Keeps the game page from scrolling behind the editor
    document.documentElement.style.overflow = 'hidden';
    renderContent();
    root.querySelector('.pse-nav-item[aria-current="page"]').focus();
    root.querySelector('#pse-credit').innerHTML = `${escapeHtml(versionsText())}<br>by neol1no, continued by virtualtear`;
  }
  const closeEditor = () => app.close();
  const toggleEditor = () => (app.open ? closeEditor() : openEditor());

  launcher.addEventListener('click', openEditor);
  root.querySelector('.pse-close').addEventListener('click', closeEditor);
  // A click that lands on the dialog element itself came from the backdrop
  app.addEventListener('click', e => {
    if (e.target === app) closeEditor();
  });
  app.addEventListener('close', () => {
    hideTip();
    document.documentElement.style.removeProperty('overflow');
  });
  app.addEventListener('keydown', e => {
    if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target.closest('input, select, textarea')) return;
    const search = viewEl.querySelector('.pse-search input');
    if (!search) return;
    e.preventDefault();
    search.focus();
    search.select();
  });

  root.querySelector('.pse-nav').addEventListener('click', e => {
    const btn = e.target.closest('.pse-nav-item');
    if (!btn || btn.dataset.view === STATE.currentView) return;
    STATE.currentView = btn.dataset.view;
    localStorage.setItem('pse_view', STATE.currentView);
    renderContent();
  });

  // The game fires this once all its scripts ran. An editor opened before that is
  // missing the game's lists, so fill them in without making the player retry
  document.addEventListener('pokelike-scripts-ready', () => {
    if (!app.open) return;
    updateNavCounts();
    if (viewEl.querySelector('[data-retry-game]')) renderContent();
  });
  viewEl.addEventListener('click', e => {
    if (e.target.closest('[data-retry-game]')) renderContent();
  });

  // ─── Pending changes ─────────────────────────────────────────────────────────
  // Every edit is written to the save right away, but the game only reads it on load
  let pendingChanges = 0;
  // The last value the editor wrote to each save key, pushed to the cloud on Save & Reload
  const editorWrites = new Map();

  // An undo takes its change back off the count instead of adding one
  function noteChange(key, undo = false) {
    editorWrites.set(key, localStorage.getItem(key));
    pendingChanges = Math.max(0, pendingChanges + (undo ? -1 : 1));
    showPending();
    updateNavCounts();
  }

  function showPending() {
    root.querySelector('#pse-pending').textContent = pendingChanges
      ? 'Saved, reload to apply'
      : 'No changes yet';
    const chip = root.querySelector('.pse-commit-count');
    chip.hidden = pendingChanges === 0;
    chip.textContent = pendingChanges > 99 ? '99+' : String(pendingChanges);
    root.querySelector('#pse-save-reload').setAttribute('aria-label', pendingChanges
      ? `Save & Reload, ${plural(pendingChanges, 'change')} waiting`
      : 'Save & Reload');
    launcherBadge.hidden = pendingChanges === 0;
    launcherBadge.textContent = pendingChanges > 99 ? '99+' : String(pendingChanges);
    launcher.setAttribute('aria-label', pendingChanges
      ? `Open Save Editor, ${plural(pendingChanges, 'change')} waiting for a reload (Ctrl+Shift+E)`
      : 'Open Save Editor (Ctrl+Shift+E)');
  }

  // ─── Cloud save ──────────────────────────────────────────────────────────────
  // The game's cloud sync first merges the cloud copy into this device, and that merge
  // only ever adds: a Pokémon, achievement or run still in the cloud comes back, and
  // buffs and Elite Wins keep the higher value. So Save & Reload merges the same way,
  // puts the editor's values back on top, pushes the result and reads it back
  const SAVE_KEY_NAMES = {
    poke_dex: 'Pokédex', poke_shiny_dex: 'Shiny Dex', poke_hall_of_fame: 'Hall of Fame',
    poke_stat_buffs: 'Stat Buffs', poke_achievements: 'Achievements',
    poke_elite_wins: 'Elite Wins', poke_last_run_won: 'Last Run Won',
    poke_primal_unlocks: 'Primal Forms', poke_bag: 'Bag',
  };
  const cloudUuid = () => localStorage.getItem('poke_save_uuid');

  // The game's own cloud functions. Like ITEM_POOL they are reachable by name only
  function gameCloud() {
    try {
      if (typeof _applyCloudSave === 'function' && typeof _pushLocal === 'function') {
        return {
          apply: _applyCloudSave,
          push: _pushLocal,
          server: typeof SAVE_SERVER === 'string' ? SAVE_SERVER : '',
          keys: typeof SYNC_KEYS !== 'undefined' && Array.isArray(SYNC_KEYS) ? SYNC_KEYS : Object.keys(SAVE_KEY_NAMES),
        };
      }
    } catch {
      // Not reachable from where this script runs
    }
    return null;
  }

  async function fetchCloudSave(cloud, uuid) {
    const res = await fetch(`${cloud.server}/save/${encodeURIComponent(uuid)}`, { cache: 'no-store' });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`The cloud save answered with status ${res.status}`);
    return res.json();
  }

  // Devices list keys and set members in different orders, so compare sorted values
  function canonical(value) {
    let data;
    try {
      data = JSON.parse(value);
    } catch {
      return String(value ?? '');
    }
    const sort = v => {
      if (Array.isArray(v)) {
        const items = v.map(sort);
        return items.every(i => typeof i !== 'object') ? items.sort() : items;
      }
      if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map(k => [k, sort(v[k])]));
      return v;
    };
    return JSON.stringify(sort(data));
  }

  // Save keys whose value in the cloud copy differs from the given values
  function cloudDifferences(remote, keys, valueOf) {
    return keys.filter(key => canonical(remote?.[key] ?? null) !== canonical(valueOf(key)));
  }

  /**
   * Pushes the editor's changes to the player's cloud save and checks that they arrived.
   *
   * @returns `local` when there is no cloud save to update, `synced` when the cloud now
   * holds every change, or `kept-old` with the save keys the cloud still holds differently.
   * @throws When the cloud save cannot be reached.
   */
  async function pushEditsToCloud() {
    const uuid = cloudUuid();
    const cloud = gameCloud();
    if (!uuid || !cloud || editorWrites.size === 0) return { state: 'local', keys: [] };

    // Take in progress from other devices first, the same way the game's sync does
    const remote = await fetchCloudSave(cloud, uuid);
    if (remote) cloud.apply(remote);
    for (const [key, value] of editorWrites) {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    }
    // The merge above rewrote the index from the cloud copy
    harvestHofIndex();
    await cloud.push();

    const synced = [...editorWrites.keys()].filter(key => cloud.keys.includes(key));
    const keptOld = cloudDifferences(await fetchCloudSave(cloud, uuid), synced, key => editorWrites.get(key));
    return { state: keptOld.length ? 'kept-old' : 'synced', keys: keptOld };
  }

  // The game keeps what Hall of Fame runs unlock (cleared Tower stages, starter runs,
  // evolution lines) in poke_hof_index and only adds to it during its cloud merge, so a
  // run added here unlocks nothing until the index hears about it. The game's own
  // function only adds, which keeps unlocks from runs it has already trimmed away
  function harvestHofIndex() {
    if (!editorWrites.has(HOF_KEY)) return;
    try {
      harvestHofUnlocks(readJson(HOF_KEY, []));
    } catch {
      // Not reachable from where this script runs
    }
  }

  const saveKeyList = keys => keys.map(key => SAVE_KEY_NAMES[key] || key).join(', ');

  const commitBtn = root.querySelector('#pse-save-reload');
  function setCommitBusy(busy) {
    commitBtn.disabled = busy;
    commitBtn.querySelector('.pse-commit-label').textContent = busy ? 'Saving to cloud…' : 'Save & Reload';
  }

  commitBtn.addEventListener('click', async () => {
    const reload = { label: 'Reload anyway', icon: 'reload', run: () => location.reload() };
    harvestHofIndex();
    setCommitBusy(true);
    try {
      const result = await pushEditsToCloud();
      if (result.state === 'kept-old') {
        setCommitBusy(false);
        toast(`The cloud save still has the old ${saveKeyList(result.keys)}. After a reload, the game would bring it back.`, reload);
        return;
      }
    } catch {
      setCommitBusy(false);
      toast("Couldn't reach the cloud save. Your changes are kept on this device. Try again when you are online.", reload);
      return;
    }
    location.reload();
  });

  // ─── Toast ───────────────────────────────────────────────────────────────────
  const toastEl = root.querySelector('.pse-toast');
  const toastUndo = toastEl.querySelector('.pse-btn');
  let toastTimer = null;
  let toastUndoAction = null;

  function hideToast() {
    toastEl.classList.remove('visible');
    toastUndoAction = null;
  }

  /**
   * Shows a short message at the bottom of the editor.
   *
   * @param action - An undo function, or `{ label, icon, run }` for another button.
   */
  function toast(message, action = null) {
    const { label = 'Undo', icon: iconName = 'undo', run = null } = typeof action === 'function' ? { run: action } : action || {};
    toastEl.querySelector('.pse-toast-text').textContent = message;
    toastUndoAction = run;
    toastUndo.hidden = !run;
    toastUndo.innerHTML = `${icon(iconName)}${label}`;
    toastEl.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, run ? 9000 : 3000);
  }

  toastUndo.addEventListener('click', () => {
    const undo = toastUndoAction;
    hideToast();
    undo?.();
  });

  // ─── Render ──────────────────────────────────────────────────────────────────
  const setSubtitle = text => { viewSub.textContent = text; };
  // A large count with a small label after it, like "29 / 809 caught"
  const setHeadline = (count, label) => {
    viewSub.innerHTML = `<b class="pse-view-count">${count}</b> ${escapeHtml(label)}`;
  };

  // Stands in for a list the editor reads from the game while that list is missing
  function gameDataMissingHtml(title, text) {
    return `
      <div class="pse-state" role="alert">
        <h3 class="pse-state-title">${escapeHtml(title)}</h3>
        <p>${escapeHtml(text)} If the game is still loading, wait a moment and try again.</p>
        <button type="button" class="pse-btn pse-btn-primary" data-retry-game>${icon('reload')}Retry</button>
      </div>
    `;
  }

  function renderContent() {
    const view = VIEWS[STATE.currentView];
    root.querySelectorAll('.pse-nav-item').forEach(btn => {
      if (btn.dataset.view === STATE.currentView) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
    });
    root.querySelector('#pse-view-title').textContent = view.title;
    if (isNarrow()) root.querySelector('.pse-nav-item[aria-current="page"]').scrollIntoView({ block: 'nearest', inline: 'nearest' });
    setSubtitle('');
    hideTip();
    // Undo belongs to the view it was offered in
    hideToast();
    showPending();
    updateNavCounts();

    if (view.needsPokemon && !POKEMON_LIST) {
      renderPokemonDataLoading(viewEl);
      return;
    }
    view.render(viewEl);
  }

  function renderPokemonDataLoading(container) {
    const view = STATE.currentView;
    container.innerHTML = `
      <div class="pse-skeleton" role="status" aria-label="Loading Pokémon data">
        ${'<span></span>'.repeat(24)}
      </div>
    `;
    setSubtitle('Loading Pokémon data from PokeAPI…');

    loadPokemonData().then(() => {
      if (STATE.currentView === view && app.open) renderContent();
    }, () => {
      if (STATE.currentView !== view) return;
      setSubtitle('');
      container.innerHTML = `
        <div class="pse-state" role="alert">
          <h3 class="pse-state-title">Couldn't load Pokémon data</h3>
          <p>The editor gets Pokémon names and sprites from PokeAPI. Check your internet connection and try again.</p>
          <button type="button" class="pse-btn pse-btn-primary" id="pse-retry">${icon('reload')}Retry</button>
        </div>
      `;
      container.querySelector('#pse-retry').addEventListener('click', renderContent);
    });
  }

  // Live counts next to each view in the rail
  function updateNavCounts() {
    const set = (id, text) => { root.querySelector(`[data-count="${id}"]`).textContent = text; };
    set('dex', `${countCaught(readJson(DEX_VIEWS.pokedex.saveKey, {}))}/${playableMaxId()}`);
    set('hall-of-fame', String(readJson(HOF_KEY, []).length));
    set('stat-buffs', String(Object.keys(readJson(BUFFS_KEY, {})).length));
    const achievements = getAchievementList();
    const unlocked = new Set(readJson(ACHIEVEMENTS_KEY, []));
    set('achievements', achievements.length ? `${achievements.filter(a => unlocked.has(a.id)).length}/${achievements.length}` : '');
    const forms = getBossForms();
    const formsUnlocked = readPrimalUnlocks();
    set('extras', forms.length ? `${forms.filter(f => formsUnlocked.has(f.id)).length}/${forms.length}` : '');
  }

  // Search field markup shared by the views. The "/" key focuses it
  function searchField(id, placeholder, label) {
    return `
      <div class="pse-search">
        ${icon('search')}
        <input type="search" class="pse-input" id="${id}" placeholder="${placeholder}" aria-label="${label}" autocomplete="off" spellcheck="false">
        <span class="pse-search-kbd" aria-hidden="true">/</span>
        <button type="button" class="pse-icon-btn pse-search-clear" aria-label="Clear search" hidden>${icon('close')}</button>
      </div>
    `;
  }

  // Wires the clear button and Escape key of a search field; calls onChange on every edit
  function bindSearch(input, onChange) {
    const wrap = input.closest('.pse-search');
    const clear = wrap.querySelector('.pse-search-clear');
    const kbd = wrap.querySelector('.pse-search-kbd');
    const sync = () => {
      clear.hidden = !input.value;
      if (kbd) kbd.hidden = Boolean(input.value);
    };
    input.addEventListener('input', () => { sync(); onChange(); });
    // Escape first clears the field; only an empty field lets Escape close the editor
    input.addEventListener('keydown', e => {
      if (e.key === 'Escape' && input.value) {
        e.preventDefault();
        e.stopPropagation();
        input.value = '';
        sync();
        onChange();
      }
    });
    clear.addEventListener('click', () => {
      input.value = '';
      sync();
      onChange();
      input.focus();
    });
    sync();
  }

  // Arrow keys move focus between cells, so a grid is one Tab stop instead of hundreds
  function enableGridKeys(container, cellSelector) {
    container.addEventListener('keydown', e => {
      const cell = e.target.closest(cellSelector);
      if (!cell || !container.contains(cell)) return;
      const cells = [...container.querySelectorAll(cellSelector)].filter(c => c.offsetParent !== null);
      const index = cells.indexOf(cell);
      let next = null;

      if (e.key === 'ArrowRight') next = cells[index + 1];
      else if (e.key === 'ArrowLeft') next = cells[index - 1];
      else if (e.key === 'Home') next = cells[0];
      else if (e.key === 'End') next = cells[cells.length - 1];
      else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        // Rows can wrap differently per section, so pick the nearest cell in the next row by position
        const from = cell.getBoundingClientRect();
        const down = e.key === 'ArrowDown';
        const candidates = cells.map(c => ({ c, r: c.getBoundingClientRect() }))
          .filter(({ r }) => (down ? r.top > from.top + 4 : r.top < from.top - 4));
        if (candidates.length) {
          const rowTop = down ? Math.min(...candidates.map(x => x.r.top)) : Math.max(...candidates.map(x => x.r.top));
          const row = candidates.filter(x => Math.abs(x.r.top - rowTop) < 4);
          next = row.reduce((best, x) => (Math.abs(x.r.left - from.left) < Math.abs(best.r.left - from.left) ? x : best)).c;
        }
      } else return;

      e.preventDefault();
      if (!next) return;
      next.focus();
      next.scrollIntoView({ block: 'nearest' });
    });

    container.addEventListener('focusin', e => {
      const cell = e.target.closest(cellSelector);
      if (!cell) return;
      container.querySelectorAll(`${cellSelector}[tabindex="0"]`).forEach(c => { if (c !== cell) c.tabIndex = -1; });
      cell.tabIndex = 0;
    });
  }

  // Makes the first visible cell the grid's single Tab stop after a re-render
  function resetGridTabStop(container, cellSelector) {
    const cells = container.querySelectorAll(cellSelector);
    cells.forEach((c, i) => { c.tabIndex = i === 0 ? 0 : -1; });
  }

  // ─── Item tooltip ────────────────────────────────────────────────────────────
  // Lives inside the dialog so it stays in the dialog's top layer. Its texts are page
  // text, so the game's translator turns them into the player's language
  const tipEl = root.querySelector('.pse-tip');
  const hideTip = () => tipEl.classList.remove('visible');

  app.addEventListener('mouseover', e => {
    const badge = e.target.closest('.pse-item-badge');
    if (!badge) return;
    tipEl.querySelector('.pse-item-name').textContent = badge.dataset.name;
    tipEl.querySelector('.pse-item-desc').textContent = badge.dataset.desc;
    const rect = badge.getBoundingClientRect();
    tipEl.style.left = `${Math.max(8, Math.min(rect.left - 8, window.innerWidth - 270))}px`;
    // Below the badge, so the Pokémon stays visible. Near the bottom of the screen it
    // goes above, anchored by its bottom edge so a longer translated text grows upwards
    if (rect.bottom < window.innerHeight - 120) {
      tipEl.style.bottom = '';
      tipEl.style.top = `${rect.bottom + 6}px`;
    } else {
      tipEl.style.top = '';
      tipEl.style.bottom = `${window.innerHeight - rect.top + 6}px`;
    }
    tipEl.classList.add('visible');
  });
  app.addEventListener('mouseout', e => {
    if (e.target.closest('.pse-item-badge')) hideTip();
  });

  // ─── Pokédex & Shiny Dex ─────────────────────────────────────────────────────
  const DEX_VIEWS = {
    'pokedex': { id: 'pokedex', saveKey: 'poke_dex', shiny: false, label: 'Normal' },
    'shiny-dex': { id: 'shiny-dex', saveKey: 'poke_shiny_dex', shiny: true, label: 'Shiny' },
  };

  // The game saves caught Pokémon as { "25": 1 } and turns any older entry into 1
  // when it loads, so every entry that exists counts as caught.
  const isCaught = (dex, id) => dex[id] !== undefined && dex[id] !== null;
  const countCaught = dex => {
    const maxId = playableMaxId();
    return Object.keys(dex).filter(id => Number(id) <= maxId && isCaught(dex, id)).length;
  };

  // Single words of 11+ letters (Crabominable, Fletchinder) get a smaller size, so no
  // name ever has to break inside a word
  const nameClass = name => (name.split(' ').some(word => word.length > 10) ? ' long' : '');

  function dexCellHtml(p, caught, shiny) {
    return `
      <button type="button" class="pse-mon" data-id="${p.id}" aria-pressed="${caught}" tabindex="-1" title="${escapeHtml(p.name)}">
        <img src="${spriteUrl(p.id, shiny)}" alt="" width="64" height="64" loading="lazy" decoding="async">
        <span class="pse-mon-no">${dexNumber(p.id)}</span>
        <span class="pse-mon-name${nameClass(p.name)}">${escapeHtml(p.name)}</span>
      </button>
    `;
  }

  function renderDex(container) {
    let view = DEX_VIEWS[localStorage.getItem('pse_dex_mode')] || DEX_VIEWS.pokedex;
    const prefKey = name => `pse_${name}_${view.id}`;

    container.innerHTML = `
      <div class="pse-toolbar">
        ${searchField('pse-dex-search', 'Search by name or number', 'Search Pokémon')}
        <div class="pse-seg" role="radiogroup" aria-label="Dex">
          ${Object.values(DEX_VIEWS).map(v => `
            <button type="button" role="radio" data-dex="${v.id}">
              ${v.shiny ? icon('sparkle') : ''}${v.label}<span class="pse-seg-count" data-dex-count="${v.id}"></span>
            </button>
          `).join('')}
        </div>
        <button type="button" class="pse-chip" id="pse-dex-missing" aria-pressed="false">${icon('check')}Missing only</button>
      </div>
      <div class="pse-genchips" id="pse-genchips" aria-label="Jump to generation"></div>
      <div class="pse-dex-body">
        <div class="pse-scroll" id="pse-dex-scroll"></div>
        <nav class="pse-genrail" id="pse-genrail" aria-label="Jump to generation"></nav>
      </div>
    `;

    const scroll = container.querySelector('#pse-dex-scroll');
    const search = container.querySelector('#pse-dex-search');
    const missingBtn = container.querySelector('#pse-dex-missing');
    const rail = container.querySelector('#pse-genrail');
    const chips = container.querySelector('#pse-genchips');
    const byGen = new Map(GENERATIONS.map(g => [g.gen, POKEMON_LIST.filter(p => p.gen === g.gen)]));
    const lockedGens = new Set(GENERATIONS.filter(g => !gameHasGen(g.gen)).map(g => g.gen));

    const missingOnly = () => missingBtn.getAttribute('aria-pressed') === 'true';

    function syncControls() {
      container.querySelectorAll('[data-dex]').forEach(btn => {
        btn.setAttribute('aria-checked', String(btn.dataset.dex === view.id));
        btn.tabIndex = btn.dataset.dex === view.id ? 0 : -1;
      });
      missingBtn.setAttribute('aria-pressed', String(localStorage.getItem(prefKey('missing_only')) === 'true'));
    }

    function saveDex(dex, key = view.saveKey, undo = false) {
      writeJson(key, dex);
      noteChange(key, undo);
    }

    // Counts in the switch, the section headers, the rail and the subtitle
    function refreshCounts(dex = readJson(view.saveKey, {})) {
      for (const v of Object.values(DEX_VIEWS)) {
        container.querySelector(`[data-dex-count="${v.id}"]`).textContent =
          countCaught(v.id === view.id ? dex : readJson(v.saveKey, {}));
      }
      const total = countCaught(dex);
      setHeadline(total, `/ ${playableMaxId()} ${view.shiny ? 'shiny ' : ''}caught`);

      const segments = [];
      const chipHtml = [];
      for (const g of GENERATIONS) {
        const all = byGen.get(g.gen);
        if (lockedGens.has(g.gen)) {
          const label = `Gen ${g.gen} ${g.region}: not in the game yet`;
          segments.push(`
            <button type="button" class="pse-genrail-seg locked" data-gen="${g.gen}" style="flex: ${all.length || 1} 1 0" aria-label="${label}" title="${label}" disabled>
              <span class="pse-genrail-num">${g.gen}</span>
            </button>
          `);
          chipHtml.push(`<button type="button" class="pse-genchip locked" data-gen="${g.gen}" aria-label="${label}" disabled>${icon('lock')}Gen ${g.gen}</button>`);
          continue;
        }
        const caught = all.filter(p => isCaught(dex, p.id)).length;
        const pct = all.length ? (caught / all.length) * 100 : 0;
        const hasSection = Boolean(scroll.querySelector(`.pse-section[data-gen="${g.gen}"]`));
        const label = `Gen ${g.gen} ${g.region}: ${caught} of ${all.length} caught`;
        segments.push(`
          <button type="button" class="pse-genrail-seg${hasSection ? '' : ' empty'}" data-gen="${g.gen}"
            style="flex: ${all.length} 1 0; --p: ${pct}%" aria-label="${label}" title="${label}">
            <span class="pse-genrail-num">${g.gen}</span>
          </button>
        `);
        chipHtml.push(`
          <button type="button" class="pse-genchip${caught === all.length ? ' done' : ''}" data-gen="${g.gen}" aria-label="${label}">
            Gen ${g.gen}<span class="pse-dim">${caught}/${all.length}</span>
          </button>
        `);

        const section = scroll.querySelector(`.pse-section[data-gen="${g.gen}"]`);
        if (!section) continue;
        section.querySelector('.pse-count').innerHTML = `<b>${caught}</b> / ${all.length}`;
        section.querySelector('.pse-meter > span').style.setProperty('--p', `${pct}%`);
        section.querySelector('[data-act="catch-all"]').disabled = caught === all.length;
        section.querySelector('[data-act="clear"]').disabled = caught === 0;
      }
      rail.innerHTML = segments.join('');
      chips.innerHTML = chipHtml.join('');
      markCurrentGen();
    }

    function renderGroups() {
      const dex = readJson(view.saveKey, {});
      const collapsed = new Set(readJson(prefKey('collapsed_gens'), []));
      const query = search.value;

      const sections = GENERATIONS.map(g => {
        if (lockedGens.has(g.gen)) {
          if (query.trim() || missingOnly()) return '';
          return `
            <section class="pse-section pse-section-locked" data-gen="${g.gen}" aria-labelledby="pse-gen-title-${g.gen}">
              <header class="pse-section-head">
                <span class="pse-locked-title" id="pse-gen-title-${g.gen}">${icon('lock')}Gen ${g.gen} <span class="pse-dim">${g.region}</span></span>
                <span class="pse-count">Not in the game yet</span>
              </header>
            </section>
          `;
        }
        const all = byGen.get(g.gen);
        const shown = all.filter(p => matchesSearch(p, query) && !(missingOnly() && isCaught(dex, p.id)));
        if (shown.length === 0) return '';
        const open = !collapsed.has(g.gen);
        return `
          <section class="pse-section${open ? '' : ' collapsed'}" data-gen="${g.gen}" aria-labelledby="pse-gen-title-${g.gen}">
            <header class="pse-section-head">
              <button type="button" class="pse-collapse" data-act="collapse" aria-expanded="${open}" aria-controls="pse-gen-grid-${g.gen}">
                ${icon('chevron')}<span id="pse-gen-title-${g.gen}">Gen ${g.gen} <span class="pse-dim">${g.region}</span></span>
              </button>
              <span class="pse-count"></span>
              <div class="pse-meter" aria-hidden="true"><span></span></div>
              <div class="pse-section-actions">
                <button type="button" class="pse-btn pse-btn-quiet pse-btn-sm" data-act="catch-all">${icon('check')}Catch all</button>
                <button type="button" class="pse-btn pse-btn-quiet pse-btn-sm" data-act="clear">${icon('close')}Clear</button>
              </div>
            </header>
            <div class="pse-section-body pse-dex-grid" id="pse-gen-grid-${g.gen}">
              ${shown.map(p => dexCellHtml(p, isCaught(dex, p.id), view.shiny)).join('')}
            </div>
          </section>
        `;
      }).join('');

      if (sections) {
        scroll.innerHTML = sections;
      } else if (query.trim()) {
        scroll.innerHTML = `
          <div class="pse-state">
            <h3 class="pse-state-title">No Pokémon match “${escapeHtml(query.trim())}”</h3>
            <p>Search works with English names, the name shown in the game, or a Pokédex number like 25.</p>
            <button type="button" class="pse-btn pse-btn-ghost" data-act="clear-search">Clear search</button>
          </div>
        `;
      } else {
        scroll.innerHTML = `
          <div class="pse-state">
            <h3 class="pse-state-title">Nothing missing</h3>
            <p>Every Pokémon in the ${view.shiny ? 'Shiny Dex' : 'Pokédex'} is caught.</p>
            <button type="button" class="pse-btn pse-btn-ghost" data-act="show-all">Show all Pokémon</button>
          </div>
        `;
      }
      resetGridTabStop(scroll, '.pse-mon');
      refreshCounts(dex);
    }

    // Highlights the generation at the top of the scroll area in the rail and chips
    function markCurrentGen() {
      const sections = [...scroll.querySelectorAll('.pse-section')];
      let current = sections[0];
      for (const s of sections) if (s.offsetTop <= scroll.scrollTop + 24) current = s;
      const gen = current?.dataset.gen;
      for (const el of [...rail.children, ...chips.children]) {
        el.setAttribute('aria-current', String(el.dataset.gen === gen));
      }
    }
    let scrollFrame = 0;
    scroll.addEventListener('scroll', () => {
      cancelAnimationFrame(scrollFrame);
      scrollFrame = requestAnimationFrame(markCurrentGen);
    });

    function jumpToGen(e) {
      const btn = e.target.closest('[data-gen]');
      if (!btn) return;
      const section = scroll.querySelector(`.pse-section[data-gen="${btn.dataset.gen}"]`);
      if (!section) {
        toast(`No Gen ${btn.dataset.gen} Pokémon match the current filter`);
        return;
      }
      scroll.scrollTo({ top: section.offsetTop, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    }
    rail.addEventListener('click', jumpToGen);
    chips.addEventListener('click', jumpToGen);

    function setGenCaught(gen, caught) {
      const key = view.saveKey;
      const dex = readJson(key, {});
      const before = { ...dex };
      const ids = byGen.get(gen).map(p => p.id);
      const changed = ids.filter(id => isCaught(dex, id) !== caught).length;
      ids.forEach(id => { if (caught) dex[id] = 1; else delete dex[id]; });
      saveDex(dex);
      renderGroups();
      const region = GENERATIONS.find(g => g.gen === gen).region;
      toast(caught
        ? `Caught ${plural(changed, `Gen ${gen} Pokémon`, `Gen ${gen} Pokémon`)} (${region})`
        : `Removed ${plural(changed, `Gen ${gen} Pokémon`, `Gen ${gen} Pokémon`)} (${region})`, () => {
        saveDex(before, key, true);
        renderGroups();
      });
    }

    scroll.addEventListener('click', e => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'clear-search') {
        search.value = '';
        search.dispatchEvent(new Event('input'));
        search.focus();
        return;
      }
      if (act === 'show-all') {
        localStorage.setItem(prefKey('missing_only'), 'false');
        syncControls();
        renderGroups();
        return;
      }

      const section = e.target.closest('.pse-section');
      if (!section) return;
      const gen = Number(section.dataset.gen);

      const cell = e.target.closest('.pse-mon');
      if (cell) {
        // The cell stays in place even under "Missing only", so a misclick is easy to undo
        const dex = readJson(view.saveKey, {});
        const id = cell.dataset.id;
        const caught = !isCaught(dex, id);
        if (caught) dex[id] = 1;
        else delete dex[id];
        saveDex(dex);
        cell.setAttribute('aria-pressed', String(caught));
        flip(cell);
        refreshCounts(dex);
      } else if (act === 'catch-all') {
        setGenCaught(gen, true);
      } else if (act === 'clear') {
        setGenCaught(gen, false);
      } else if (act === 'collapse') {
        const collapsed = new Set(readJson(prefKey('collapsed_gens'), []));
        const open = collapsed.has(gen);
        if (open) collapsed.delete(gen);
        else collapsed.add(gen);
        writeJson(prefKey('collapsed_gens'), [...collapsed]);
        section.classList.toggle('collapsed', !open);
        e.target.closest('.pse-collapse').setAttribute('aria-expanded', String(open));
      }
    });

    container.querySelector('.pse-seg').addEventListener('click', e => {
      const btn = e.target.closest('[data-dex]');
      if (!btn || btn.dataset.dex === view.id) return;
      view = DEX_VIEWS[btn.dataset.dex];
      localStorage.setItem('pse_dex_mode', view.id);
      syncControls();
      renderGroups();
    });
    // Arrow keys switch between Normal and Shiny like a native radio group
    container.querySelector('.pse-seg').addEventListener('keydown', e => {
      if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      const other = container.querySelector(`[data-dex]:not([data-dex="${view.id}"])`);
      e.preventDefault();
      other.click();
      other.focus();
    });

    missingBtn.addEventListener('click', () => {
      localStorage.setItem(prefKey('missing_only'), String(!missingOnly()));
      syncControls();
      renderGroups();
    });

    bindSearch(search, debounce(renderGroups, 90));
    enableGridKeys(scroll, '.pse-mon');
    syncControls();
    renderGroups();
  }

  // ─── Hall of Fame ────────────────────────────────────────────────────────────
  const MAX_TEAM_SIZE = 6;
  // Battle Tower stages 1-6 are the regions of Gen 1-6
  const TOWER_REGIONS = GENERATIONS.slice(0, 6).map(g => g.region);
  const PICKER_LIMIT = 60;

  // The game trims saved team members to speciesId, level, nickname, isShiny
  // and heldItem, so sprites and names have to come from the species
  const teamSpriteUrl = member => spriteUrl(member.speciesId, member.isShiny);
  const memberName = member => member.nickname || speciesName(member.speciesId);

  // Prefer the game's current description over the one stored with an older save
  const itemInfo = heldItem => getItemList().find(i => i.id === heldItem.id) || heldItem;

  // Item icon on a team sprite. Hovering it shows the item tooltip
  function heldItemBadge(heldItem) {
    if (!heldItem) return '';
    const item = itemInfo(heldItem);
    return `<span class="pse-item-badge" data-name="${escapeHtml(item.name)}" data-desc="${escapeHtml(item.desc)}" aria-hidden="true">${item.icon}</span>`;
  }

  function memberLabel(member) {
    const parts = [memberName(member)];
    if (member.nickname) parts.push(speciesName(member.speciesId));
    parts.push(`level ${member.level}`);
    if (member.isShiny) parts.push('shiny');
    if (member.heldItem) parts.push(`holding ${itemInfo(member.heldItem).name}`);
    return parts.join(', ');
  }

  function slotTextHtml(member) {
    return `
      <span class="pse-slot-text">
        <span class="pse-slot-name">${escapeHtml(memberName(member))}</span>
        ${member.nickname ? `<span class="pse-slot-species">${escapeHtml(speciesName(member.speciesId))}</span>` : ''}
        <span class="pse-slot-level">Lv. ${member.level}</span>
      </span>
    `;
  }

  // The regions of the game's Championship picker. "both" plays Kanto and Johto in one run
  const CHAMPIONSHIP_REGIONS = [
    ...GENERATIONS.map(g => ({ key: String(g.gen), label: g.region })),
    { key: 'both', label: 'Kanto + Johto' },
  ];

  // A run of a later generation also needs a region flag the game reads back, or the game
  // counts the run as Kanto. Its name is guessed from gen2Mode..gen7Mode
  function championshipHasGen(gen) {
    if (gen <= KNOWN_GAME_GENS) return true;
    try {
      return gameHasGen(gen) && _hofEntryRegion({ [`gen${gen}Mode`]: true }) === String(gen);
    } catch {
      // Not loaded yet, or not reachable from where this script runs
      return false;
    }
  }

  // Same order as the game's _hofEntryRegion: a run with no region flag counts as Kanto
  function runRegion(run) {
    if (run.bothGens) return 'both';
    for (let gen = GENERATIONS.length; gen >= 2; gen--) {
      if (run[`gen${gen}Mode`]) return String(gen);
    }
    return '1';
  }

  // Sets the flags of one region. Flags the game does not read are left out of the save
  function setRunRegion(run, region) {
    for (const { gen } of GENERATIONS.slice(1)) {
      const flag = `gen${gen}Mode`;
      if (String(gen) === region) run[flag] = true;
      else if (championshipHasGen(gen)) run[flag] = false;
      else delete run[flag];
    }
    run.bothGens = region === 'both';
  }

  const runDifficulty = run => (run.hardcore ? 'hardcore' : run.easyMode ? 'easy' : 'normal');

  function runModeTags(run) {
    const tags = run.endless
      ? [`<span class="pse-tag pse-tag-tower">Battle Tower · ${TOWER_REGIONS[(run.stageNumber || 1) - 1] || 'Unknown'}</span>`]
      : [`<span class="pse-tag">Championship · ${CHAMPIONSHIP_REGIONS.find(r => r.key === runRegion(run)).label}</span>`];
    if (run.hardMode) tags.push('<span class="pse-tag pse-tag-nuz">Nuzlocke</span>');
    if (run.hardcore) tags.push('<span class="pse-tag pse-tag-nuz">Hardcore</span>');
    else if (run.easyMode) tags.push('<span class="pse-tag">Easy</span>');
    return tags.join('');
  }

  let hofSelected = null;
  // What the panel under the team shows: { type: 'member', teamIdx } or { type: 'picker' }
  let hofPanel = null;

  function renderHallOfFame(container) {
    const hof = readJson(HOF_KEY, []);
    if (hofSelected !== null && !hof[hofSelected]) {
      hofSelected = null;
      hofPanel = null;
    }
    if (hofSelected === null && hof.length && !isNarrow()) hofSelected = hof.length - 1;
    setHeadline(hof.length, `${hof.length === 1 ? 'finished run' : 'finished runs'}, newest first`);

    container.innerHTML = `
      <div class="pse-split${hofSelected !== null ? ' has-detail' : ''}">
        <div class="pse-split-list">
          <div class="pse-list-head">
            <button type="button" class="pse-btn pse-btn-primary" data-act="new-run">${icon('plus')}New run</button>
          </div>
          <div class="pse-scroll">
            ${hof.length ? `
              <ul class="pse-list" aria-label="Runs">
                ${hof.map((run, idx) => `<li>${runRowHtml(run, idx)}</li>`).reverse().join('')}
              </ul>
            ` : `
              <div class="pse-state">
                <h3 class="pse-state-title">No finished runs</h3>
                <p>Runs show up here when you beat the game. You can also add one yourself.</p>
              </div>
            `}
          </div>
        </div>
        <div class="pse-split-detail" id="pse-run-detail"></div>
      </div>
    `;

    const list = container.querySelector('.pse-split-list');
    list.addEventListener('click', e => {
      if (e.target.closest('[data-act="new-run"]')) {
        addNewHofRun(container);
        return;
      }
      const row = e.target.closest('.pse-run');
      if (!row) return;
      hofSelected = Number(row.dataset.idx);
      hofPanel = null;
      renderHallOfFame(container);
      container.querySelector('#pse-run-detail .pse-detail-title')?.focus();
    });

    renderRunDetail(container);
  }

  function runRowHtml(run, idx) {
    return `
      <button type="button" class="pse-run" data-idx="${idx}" aria-current="${idx === hofSelected}">
        <span class="pse-run-top">
          <span class="pse-run-name">Run #${run.runNumber}</span>
          <span class="pse-run-date">${escapeHtml(run.date)}</span>
        </span>
        <span class="pse-run-mode">${runModeTags(run)}</span>
        <span class="pse-run-team">
          ${run.team.length
            ? run.team.map(m => `<img src="${teamSpriteUrl(m)}" alt="" width="36" height="36" loading="lazy">`).join('')
            : '<span class="pse-run-empty">No team yet</span>'}
        </span>
        <span class="pse-sr">${run.team.map(memberLabel).join('; ')}</span>
      </button>
    `;
  }

  // Redraws one run's row in the list after an edit, without touching the rest
  function refreshRunRow(container, idx) {
    const row = container.querySelector(`.pse-run[data-idx="${idx}"]`);
    const run = readJson(HOF_KEY, [])[idx];
    if (row && run) row.outerHTML = runRowHtml(run, idx);
  }

  // Reads the save, lets fn change one run, and writes it back
  function updateRun(idx, fn, undo = false) {
    const hof = readJson(HOF_KEY, []);
    fn(hof[idx], hof);
    writeJson(HOF_KEY, hof);
    noteChange(HOF_KEY, undo);
    return hof[idx];
  }

  function addNewHofRun(container) {
    const hof = readJson(HOF_KEY, []);
    const run = {
      runNumber: hof.length + 1,
      hardMode: false,
      endless: false,
      roguelikeMode: true,
      easyMode: false,
      hardcore: false,
      starterSpeciesId: null,
      date: new Date().toLocaleDateString(),
      // The game tells runs apart by savedAt when it merges the cloud save, so an
      // edited run stays one run instead of turning into two
      savedAt: Date.now(),
      team: [],
    };
    setRunRegion(run, '1');
    hof.push(run);
    writeJson(HOF_KEY, hof);
    noteChange(HOF_KEY);
    hofSelected = hof.length - 1;
    hofPanel = { type: 'picker' };
    renderHallOfFame(container);
  }

  function deleteHofRun(container, idx) {
    const hof = readJson(HOF_KEY, []);
    const [removed] = hof.splice(idx, 1);
    writeJson(HOF_KEY, hof);
    noteChange(HOF_KEY);
    hofSelected = null;
    hofPanel = null;
    renderHallOfFame(container);
    toast(`Deleted Run #${removed.runNumber}`, () => {
      const restored = readJson(HOF_KEY, []);
      restored.splice(idx, 0, removed);
      writeJson(HOF_KEY, restored);
      noteChange(HOF_KEY, true);
      hofSelected = idx;
      renderHallOfFame(container);
    });
  }

  function renderRunDetail(container) {
    const detail = container.querySelector('#pse-run-detail');
    const idx = hofSelected;
    const run = readJson(HOF_KEY, [])[idx];
    if (!run) {
      detail.innerHTML = readJson(HOF_KEY, []).length ? `
        <div class="pse-state"><p>Pick a run to edit its mode and team.</p></div>
      ` : '';
      return;
    }

    detail.innerHTML = `
      <div class="pse-detail-head">
        <button type="button" class="pse-icon-btn pse-back" data-act="back" aria-label="Back to all runs">${icon('back')}</button>
        <h3 class="pse-detail-title" tabindex="-1">Run #${run.runNumber}</h3>
        <span class="pse-dim">${escapeHtml(run.date)}</span>
        <button type="button" class="pse-btn pse-btn-danger pse-btn-sm" data-act="delete-run">${icon('trash')}Delete run</button>
      </div>
      <div class="pse-fields" id="pse-run-fields">${runFieldsHtml(run)}</div>
      <div class="pse-subhead">
        <h4 class="pse-subhead-title">Team</h4>
        <span class="pse-count" id="pse-team-count"></span>
      </div>
      <div class="pse-team" id="pse-team"></div>
      <div id="pse-team-panel"></div>
    `;

    renderTeam(container);
    renderTeamPanel(container);

    // A change can show or hide rows, so the fields are drawn again and focus goes back
    // to the control that made the change
    const fields = detail.querySelector('#pse-run-fields');
    function changeRun(fn, focusSelector) {
      const saved = updateRun(idx, fn);
      fields.innerHTML = runFieldsHtml(saved);
      fields.querySelector(focusSelector)?.focus();
      refreshRunRow(container, idx);
    }

    detail.onclick = e => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'back') {
        hofSelected = null;
        hofPanel = null;
        renderHallOfFame(container);
      } else if (act === 'delete-run') {
        deleteHofRun(container, idx);
      }

      const radio = e.target.closest('[role="radio"]');
      if (!radio || radio.getAttribute('aria-checked') === 'true' || !fields.contains(radio)) return;
      const { mode, stage, gen, difficulty } = radio.dataset;
      if (mode) {
        changeRun(saved => {
          saved.endless = mode === 'battle-tower';
          // Tower entries carry no region flags, Nuzlocke or Easy, the same as the game writes them
          if (saved.endless) {
            saved.stageNumber = saved.stageNumber || 1;
            setRunRegion(saved, '1');
            Object.assign(saved, { hardMode: false, easyMode: false, roguelikeMode: false });
          } else {
            delete saved.stageNumber;
            saved.roguelikeMode = true;
          }
        }, `[data-mode="${mode}"]`);
      } else if (stage) {
        changeRun(saved => { saved.stageNumber = Number(stage); }, `[data-stage="${stage}"]`);
      } else if (gen) {
        changeRun(saved => setRunRegion(saved, gen), `[data-gen="${gen}"]`);
      } else if (difficulty) {
        changeRun(saved => {
          saved.easyMode = difficulty === 'easy';
          saved.hardcore = difficulty === 'hardcore';
        }, `[data-difficulty="${difficulty}"]`);
      }
    };
    detail.onkeydown = e => {
      const radio = e.target.closest('[role="radio"]');
      if (!radio || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
      const radios = [...radio.parentElement.children].filter(r => !r.disabled);
      const step = e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1;
      const next = radios[(radios.indexOf(radio) + step + radios.length) % radios.length];
      e.preventDefault();
      next.click();
      next.focus();
    };
    fields.onchange = e => {
      if (e.target.id === 'pse-nuzlocke') {
        const nuzlocke = e.target.checked;
        // The game's Nuzlocke runs have no difficulty, so Easy and Hardcore go with it
        changeRun(saved => {
          saved.hardMode = nuzlocke;
          saved.roguelikeMode = !nuzlocke;
          if (nuzlocke) Object.assign(saved, { easyMode: false, hardcore: false });
        }, '#pse-nuzlocke');
      } else if (e.target.id === 'pse-starter') {
        updateRun(idx, saved => { saved.starterSpeciesId = Number(e.target.value) || null; });
      }
    };
  }

  function radiosHtml(attr, options, current) {
    return options.map(o => {
      const checked = o.key === current;
      const locked = o.locked ? ` disabled title="${o.label} is not in the game yet"` : '';
      return `<button type="button" role="radio" data-${attr}="${o.key}" aria-checked="${checked}" tabindex="${checked ? 0 : -1}"${locked}>${o.locked ? icon('lock') : ''}${o.label}</button>`;
    }).join('');
  }

  function runFieldsHtml(run) {
    const tower = Boolean(run.endless);
    const difficulties = [
      ...(tower ? [] : [{ key: 'easy', label: 'Easy' }]),
      { key: 'normal', label: 'Normal' },
      { key: 'hardcore', label: 'Hardcore' },
    ];
    return `
      <div class="pse-field-row">
        <span class="pse-field-label" id="pse-mode-label">Mode</span>
        <div class="pse-seg" role="radiogroup" aria-labelledby="pse-mode-label">
          ${radiosHtml('mode', [{ key: 'championship', label: 'Championship' }, { key: 'battle-tower', label: 'Battle Tower' }], tower ? 'battle-tower' : 'championship')}
        </div>
      </div>
      <div class="pse-field-row">
        <span class="pse-field-label" id="pse-region-label">Region</span>
        <div class="pse-seg pse-seg-wrap" role="radiogroup" aria-labelledby="pse-region-label">
          ${tower
            ? radiosHtml('stage', TOWER_REGIONS.map((label, i) => ({ key: String(i + 1), label })), String(run.stageNumber || 1))
            : radiosHtml('gen', CHAMPIONSHIP_REGIONS.map(r => ({ ...r, locked: r.key !== 'both' && !championshipHasGen(Number(r.key)) })), runRegion(run))}
        </div>
      </div>
      ${tower ? '' : `
        <div class="pse-field-row">
          <span class="pse-field-label">Rules</span>
          <label class="pse-switch">
            <input type="checkbox" role="switch" id="pse-nuzlocke" ${run.hardMode ? 'checked' : ''}>
            <span class="pse-switch-text">Nuzlocke<span class="pse-switch-hint">Every faint is permanent</span></span>
          </label>
        </div>
      `}
      ${run.hardMode ? '' : `
        <div class="pse-field-row">
          <span class="pse-field-label" id="pse-difficulty-label">Difficulty</span>
          <div class="pse-seg" role="radiogroup" aria-labelledby="pse-difficulty-label">
            ${radiosHtml('difficulty', difficulties, runDifficulty(run))}
          </div>
        </div>
      `}
      <div class="pse-field-row">
        <label class="pse-field-label" for="pse-starter">Starter</label>
        <select class="pse-select" id="pse-starter">${starterOptionsHtml(run)}</select>
      </div>
    `;
  }

  // The game keeps the species a run started with and compares it to the root of an
  // evolution line, so the choices are the roots of the team's lines
  function starterOptionsHtml(run) {
    const roots = [...new Set(run.team.map(m => getEvoLineRoot(m.speciesId)))];
    if (run.starterSpeciesId && !roots.includes(run.starterSpeciesId)) roots.unshift(run.starterSpeciesId);
    return [
      `<option value="" ${run.starterSpeciesId ? '' : 'selected'}>Not set</option>`,
      ...roots.map(id => `<option value="${id}" ${id === run.starterSpeciesId ? 'selected' : ''}>${escapeHtml(speciesName(id))}</option>`),
    ].join('');
  }

  function setRadio(radio) {
    for (const r of radio.parentElement.children) {
      r.setAttribute('aria-checked', String(r === radio));
      r.tabIndex = r === radio ? 0 : -1;
    }
  }

  function renderTeam(container, focusSelector = null) {
    const idx = hofSelected;
    const run = readJson(HOF_KEY, [])[idx];
    const { team } = run;
    const teamEl = container.querySelector('#pse-team');
    container.querySelector('#pse-team-count').innerHTML = `<b>${team.length}</b> / ${MAX_TEAM_SIZE}`;

    const slots = [];
    for (let i = 0; i < MAX_TEAM_SIZE; i++) {
      const member = team[i];
      if (member) {
        const open = hofPanel?.type === 'member' && hofPanel.teamIdx === i;
        slots.push(`
          <button type="button" class="pse-slot" data-team-idx="${i}" aria-expanded="${open}" aria-controls="pse-team-panel" aria-label="Edit ${escapeHtml(memberLabel(member))}">
            ${member.isShiny ? `<span class="pse-slot-shiny">${icon('sparkle')}</span>` : ''}
            <span class="pse-slot-sprite">
              <img src="${teamSpriteUrl(member)}" alt="" width="64" height="64">
              ${heldItemBadge(member.heldItem)}
            </span>
            ${slotTextHtml(member)}
          </button>
        `);
      } else if (i === team.length) {
        slots.push(`
          <button type="button" class="pse-slot pse-slot-add" data-act="add-member" aria-expanded="${hofPanel?.type === 'picker'}" aria-controls="pse-team-panel">
            ${icon('plus')}<span>Add Pokémon</span>
          </button>
        `);
      } else {
        slots.push('<div class="pse-slot pse-slot-empty" aria-hidden="true"></div>');
      }
    }
    teamEl.innerHTML = slots.join('');
    // The starter choices follow the team's evolution lines
    const starter = container.querySelector('#pse-starter');
    if (starter) starter.innerHTML = starterOptionsHtml(run);

    teamEl.onclick = e => {
      const slot = e.target.closest('[data-team-idx]');
      if (slot) {
        const teamIdx = Number(slot.dataset.teamIdx);
        const isOpen = hofPanel?.type === 'member' && hofPanel.teamIdx === teamIdx;
        hofPanel = isOpen ? null : { type: 'member', teamIdx };
        renderTeam(container);
        renderTeamPanel(container);
        return;
      }
      if (e.target.closest('[data-act="add-member"]')) {
        hofPanel = hofPanel?.type === 'picker' ? null : { type: 'picker' };
        renderTeam(container);
        renderTeamPanel(container);
      }
    };

    if (focusSelector) teamEl.querySelector(focusSelector)?.focus();
  }

  function renderTeamPanel(container) {
    const panel = container.querySelector('#pse-team-panel');
    const run = readJson(HOF_KEY, [])[hofSelected];
    if (hofPanel?.type === 'picker' && run.team.length < MAX_TEAM_SIZE) {
      renderPicker(container, panel);
    } else if (hofPanel?.type === 'member' && run.team[hofPanel.teamIdx]) {
      renderMemberEditor(container, panel, hofPanel.teamIdx);
    } else {
      hofPanel = null;
      panel.innerHTML = '';
    }
  }

  function closeTeamPanel(container, focusSelector) {
    hofPanel = null;
    renderTeam(container, focusSelector);
    renderTeamPanel(container);
  }

  // ── Add Pokémon ──
  function renderPicker(container, panel) {
    panel.innerHTML = `
      <div class="pse-panel" role="region" aria-label="Add Pokémon to the team">
        <div class="pse-panel-head">
          <div>
            <h4 class="pse-panel-title">Add Pokémon</h4>
            <p class="pse-panel-sub">New team members start at level 50.</p>
          </div>
          <button type="button" class="pse-icon-btn" data-act="close-panel" aria-label="Close">${icon('close')}</button>
        </div>
        ${searchField('pse-picker-search', 'Search by name or number', 'Search Pokémon to add')}
        <div class="pse-picker-grid pse-dex-grid" id="pse-picker-grid"></div>
        <p class="pse-picker-note" id="pse-picker-note" aria-live="polite"></p>
      </div>
    `;
    const grid = panel.querySelector('#pse-picker-grid');
    const input = panel.querySelector('#pse-picker-search');
    const note = panel.querySelector('#pse-picker-note');

    function renderResults() {
      const matches = POKEMON_LIST.filter(p => gameHasGen(p.gen) && matchesSearch(p, input.value));
      grid.innerHTML = matches.slice(0, PICKER_LIMIT).map(p => `
        <button type="button" class="pse-mon" data-id="${p.id}" tabindex="-1">
          <img src="${spriteUrl(p.id)}" alt="" width="64" height="64" loading="lazy" decoding="async">
          <span class="pse-mon-no">${dexNumber(p.id)}</span>
          <span class="pse-mon-name${nameClass(p.name)}">${escapeHtml(p.name)}</span>
        </button>
      `).join('');
      resetGridTabStop(grid, '.pse-mon');
      note.textContent = matches.length === 0
        ? 'No Pokémon match. Try another name or a number like 25.'
        : matches.length > PICKER_LIMIT
          ? `Showing ${PICKER_LIMIT} of ${matches.length}. Keep typing to narrow it down.`
          : plural(matches.length, 'match', 'matches');
    }

    panel.onclick = e => {
      if (e.target.closest('[data-act="close-panel"]')) {
        closeTeamPanel(container, '[data-act="add-member"]');
        return;
      }
      const cell = e.target.closest('.pse-mon');
      if (!cell) return;
      const speciesId = Number(cell.dataset.id);
      const run = updateRun(hofSelected, saved => {
        saved.team.push({ speciesId, nickname: null, level: 50, isShiny: false, heldItem: null });
      });
      hofPanel = { type: 'member', teamIdx: run.team.length - 1 };
      renderTeam(container);
      renderTeamPanel(container);
      refreshRunRow(container, hofSelected);
      toast(`Added ${speciesName(speciesId)} to Run #${run.runNumber}`);
    };

    bindSearch(input, debounce(renderResults, 90));
    enableGridKeys(grid, '.pse-mon');
    renderResults();
    if (!isNarrow()) input.focus();
  }

  // ── Edit a team member ──
  function renderMemberEditor(container, panel, teamIdx) {
    const member = readJson(HOF_KEY, [])[hofSelected].team[teamIdx];
    const species = POKEMON_BY_ID.get(member.speciesId);
    const name = speciesName(member.speciesId);
    const items = getItemList();
    // Keep an item the game has since removed selectable, so it is not dropped
    const itemChoices = member.heldItem && !items.some(i => i.id === member.heldItem.id)
      ? [...items, member.heldItem]
      : items;

    panel.innerHTML = `
      <div class="pse-panel" role="region" aria-label="Edit ${escapeHtml(name)}">
        <div class="pse-panel-head">
          <img src="${teamSpriteUrl(member)}" alt="" width="80" height="80" id="pse-member-sprite">
          <div>
            <h4 class="pse-panel-title">${escapeHtml(name)}</h4>
            <p class="pse-panel-sub">${dexNumber(member.speciesId)}${species?.types.length ? ` · ${species.types.join(' / ')}` : ''}</p>
          </div>
          <button type="button" class="pse-icon-btn" data-act="close-panel" aria-label="Close">${icon('close')}</button>
        </div>
        <div class="pse-form">
          <label class="pse-field">
            <span class="pse-label">Nickname</span>
            <input type="text" class="pse-input" id="pse-nickname" value="${escapeHtml(member.nickname)}" placeholder="${escapeHtml(name)}" autocomplete="off" spellcheck="false">
          </label>
          <div class="pse-field">
            <label class="pse-label" for="pse-level">Level</label>
            <div class="pse-stepper">
              <button type="button" data-step="-1" aria-label="Lower level">${icon('minus')}</button>
              <input type="number" class="pse-input" id="pse-level" value="${member.level}" min="1" max="100" inputmode="numeric">
              <button type="button" data-step="1" aria-label="Raise level">${icon('plus')}</button>
            </div>
          </div>
          <label class="pse-switch">
            <input type="checkbox" role="switch" id="pse-is-shiny" ${member.isShiny ? 'checked' : ''}>
            <span class="pse-switch-text">Shiny</span>
          </label>
        </div>
        <div class="pse-field">
          <span class="pse-label" id="pse-item-label">Held item</span>
          <button type="button" class="pse-item-current" id="pse-item-current" aria-expanded="false" aria-controls="pse-item-menu" aria-labelledby="pse-item-label pse-item-current"></button>
          <div class="pse-item-menu" id="pse-item-menu" hidden>
            ${searchField('pse-item-search', 'Search items', 'Search held items')}
            <div class="pse-item-list" role="listbox" aria-labelledby="pse-item-label" id="pse-item-list"></div>
          </div>
        </div>
        <div class="pse-panel-foot">
          <button type="button" class="pse-btn pse-btn-danger pse-btn-sm" data-act="remove-member">${icon('trash')}Remove from team</button>
        </div>
      </div>
    `;

    const nickname = panel.querySelector('#pse-nickname');
    const level = panel.querySelector('#pse-level');
    const shiny = panel.querySelector('#pse-is-shiny');
    const itemCurrent = panel.querySelector('#pse-item-current');
    const itemMenu = panel.querySelector('#pse-item-menu');
    const itemList = panel.querySelector('#pse-item-list');
    const itemSearch = panel.querySelector('#pse-item-search');
    let selectedItemId = member.heldItem?.id || '';

    const saveMember = fn => {
      updateRun(hofSelected, saved => fn(saved.team[teamIdx]));
      refreshSlot();
      refreshRunRow(container, hofSelected);
    };

    // Updates the team slot in place, so focus stays in the editor while typing
    function refreshSlot() {
      const saved = readJson(HOF_KEY, [])[hofSelected].team[teamIdx];
      const slot = container.querySelector(`.pse-slot[data-team-idx="${teamIdx}"]`);
      if (!slot) return;
      slot.querySelector('.pse-slot-text').outerHTML = slotTextHtml(saved);
      slot.querySelector('img').src = teamSpriteUrl(saved);
      slot.querySelector('.pse-slot-shiny')?.remove();
      slot.querySelector('.pse-item-badge')?.remove();
      if (saved.isShiny) slot.insertAdjacentHTML('afterbegin', `<span class="pse-slot-shiny">${icon('sparkle')}</span>`);
      slot.querySelector('.pse-slot-sprite').insertAdjacentHTML('beforeend', heldItemBadge(saved.heldItem));
      slot.setAttribute('aria-label', `Edit ${memberLabel(saved)}`);
      panel.querySelector('#pse-member-sprite').src = teamSpriteUrl(saved);
    }

    nickname.addEventListener('input', debounce(() => {
      saveMember(saved => { saved.nickname = nickname.value.trim() || null; });
    }, 250));

    const setLevel = value => {
      const clamped = Math.max(1, Math.min(100, Number.isFinite(value) ? Math.round(value) : 50));
      level.value = clamped;
      panel.querySelector('[data-step="-1"]').disabled = clamped <= 1;
      panel.querySelector('[data-step="1"]').disabled = clamped >= 100;
      saveMember(saved => { saved.level = clamped; });
    };
    level.addEventListener('change', () => setLevel(parseInt(level.value, 10)));
    panel.querySelectorAll('[data-step]').forEach(btn => {
      btn.addEventListener('click', () => setLevel((parseInt(level.value, 10) || 50) + Number(btn.dataset.step)));
    });
    panel.querySelector('[data-step="-1"]').disabled = member.level <= 1;
    panel.querySelector('[data-step="1"]').disabled = member.level >= 100;

    shiny.addEventListener('change', () => saveMember(saved => { saved.isShiny = shiny.checked; }));

    function showSelectedItem() {
      const item = itemChoices.find(i => i.id === selectedItemId);
      itemCurrent.innerHTML = `
        <span class="pse-item-icon" aria-hidden="true">${item ? item.icon : ''}</span>
        <span class="pse-item-text">
          <span class="pse-item-name">${item ? escapeHtml(item.name) : 'No item'}</span>
          ${item?.desc ? `<span class="pse-item-desc">${escapeHtml(item.desc)}</span>` : ''}
        </span>
        ${icon('chevron')}
      `;
    }

    function renderItemOptions() {
      const query = itemSearch.value.trim().toLowerCase();
      const options = [null, ...itemChoices].filter(item => !query || (item
        ? `${item.name} ${item.desc}`.toLowerCase().includes(query)
        : 'no item none'.includes(query)));
      itemList.innerHTML = options.length ? options.map(item => {
        const id = item ? item.id : '';
        return `
          <button type="button" class="pse-item-option" role="option" data-id="${escapeHtml(id)}" aria-selected="${id === selectedItemId}" tabindex="-1">
            <span class="pse-item-icon" aria-hidden="true">${item ? item.icon : ''}</span>
            <span class="pse-item-text">
              <span class="pse-item-name">${item ? escapeHtml(item.name) : 'No item'}</span>
              ${item?.desc ? `<span class="pse-item-desc">${escapeHtml(item.desc)}</span>` : ''}
            </span>
          </button>
        `;
      }).join('') : '<p class="pse-item-empty">No items match.</p>';
      if (items.length === 0) itemList.insertAdjacentHTML('beforeend', '<p class="pse-item-empty">The game has not loaded its item list yet. Close this Pokémon and open it again in a moment.</p>');
    }

    function setItemMenuOpen(open) {
      itemMenu.hidden = !open;
      itemCurrent.setAttribute('aria-expanded', String(open));
      if (!open) return;
      itemSearch.value = '';
      itemSearch.dispatchEvent(new Event('input'));
      renderItemOptions();
      itemMenu.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
      // Center the current item inside the list without scrolling the panel again
      const selected = itemList.querySelector('[aria-selected="true"]');
      if (selected) itemList.scrollTop = selected.offsetTop - (itemList.clientHeight - selected.offsetHeight) / 2;
      if (!isNarrow()) itemSearch.focus();
    }

    itemCurrent.addEventListener('click', () => setItemMenuOpen(itemMenu.hidden));
    bindSearch(itemSearch, renderItemOptions);
    itemSearch.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        itemList.querySelector('.pse-item-option')?.focus();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setItemMenuOpen(false);
        itemCurrent.focus();
      }
    });
    itemList.addEventListener('keydown', e => {
      const option = e.target.closest('.pse-item-option');
      if (!option) return;
      const options = [...itemList.querySelectorAll('.pse-item-option')];
      const i = options.indexOf(option);
      if (e.key === 'ArrowDown') { e.preventDefault(); options[i + 1]?.focus(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); (options[i - 1] || itemSearch).focus(); }
      if (e.key === 'Escape') { e.preventDefault(); setItemMenuOpen(false); itemCurrent.focus(); }
    });
    itemList.addEventListener('click', e => {
      const option = e.target.closest('.pse-item-option');
      if (!option) return;
      selectedItemId = option.dataset.id;
      // A new item is copied whole, because the game draws its icon from fields like iconUrl
      saveMember(saved => {
        if (!selectedItemId) saved.heldItem = null;
        else if (selectedItemId !== saved.heldItem?.id) saved.heldItem = { ...itemChoices.find(i => i.id === selectedItemId) };
      });
      showSelectedItem();
      setItemMenuOpen(false);
      itemCurrent.focus();
    });
    showSelectedItem();

    panel.onclick = e => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'close-panel') {
        closeTeamPanel(container, `.pse-slot[data-team-idx="${teamIdx}"]`);
      } else if (act === 'remove-member') {
        const removed = readJson(HOF_KEY, [])[hofSelected].team[teamIdx];
        const runIdx = hofSelected;
        const run = updateRun(runIdx, saved => { saved.team.splice(teamIdx, 1); });
        refreshRunRow(container, runIdx);
        closeTeamPanel(container);
        toast(`Removed ${memberName(removed)} from Run #${run.runNumber}`, () => {
          updateRun(runIdx, saved => { saved.team.splice(teamIdx, 0, removed); }, true);
          if (hofSelected === runIdx && container.querySelector('#pse-team')) {
            hofPanel = { type: 'member', teamIdx };
            renderTeam(container);
            renderTeamPanel(container);
            refreshRunRow(container, runIdx);
          }
        });
      }
    };
  }

  // ─── Stat Buffs ──────────────────────────────────────────────────────────────
  const STATS = ['hp', 'atk', 'special', 'def', 'speed', 'spdef'];
  const STAT_NAMES = { hp: 'HP', atk: 'Attack', special: 'Sp. Atk', def: 'Defense', speed: 'Speed', spdef: 'Sp. Def' };
  const STAT_COLORS = { hp: 'hp', atk: 'atk', special: 'atk', def: 'def', speed: 'speed', spdef: 'spdef' };
  const MAX_STAT_BUFF = 10;
  const CHEAT_MAX_STAT_BUFF = 999;
  // Used when the game's getMaxBuffPoints() is not reachable
  const MAX_BUFF_POINTS = 50;

  // ATK and Special mirror each other in the game, so together they cost one stat's points
  const buffTotal = (buffs = {}) => (buffs.hp || 0) + Math.max(buffs.atk || 0, buffs.special || 0)
    + (buffs.def || 0) + (buffs.speed || 0) + (buffs.spdef || 0);

  // The attack stat a Pokémon does not use, judged from the base stats the game
  // caches under pkrl_poke_<id>. Null when nothing is cached: then both stay visible
  function unusedAttackStat(pokemonId) {
    const stats = readJson(`pkrl_poke_${pokemonId}`, null)?.baseStats;
    if (stats?.atk === undefined || stats.special === undefined) return null;
    return stats.special >= stats.atk ? 'atk' : 'special';
  }

  // The points one evolution line can spend, as the game counts them
  function buffPointCap() {
    try {
      const cap = getMaxBuffPoints();
      if (Number.isFinite(cap) && cap > 0) return cap;
    } catch {
      // Not reachable from where this script runs
    }
    return MAX_BUFF_POINTS;
  }

  let buffSelected = null;
  // Kept outside the view, since picking a card renders the whole view again
  let buffQuery = '';

  // Buffs count for a whole evolution line, so each line shows up once, as its base
  // form. The value is true when any member of the line was shiny
  function hallOfFameLines(hideLegendaries) {
    const lines = new Map();
    for (const run of readJson(HOF_KEY, [])) {
      for (const member of run.team || []) {
        const baseId = getEvoLineRoot(member.speciesId);
        if (hideLegendaries && LEGENDARY_ID_SET.has(baseId)) continue;
        lines.set(baseId, lines.get(baseId) || Boolean(member.isShiny));
      }
    }
    return lines;
  }

  function lineCardHtml(id, shiny, buffs) {
    const total = buffTotal(buffs);
    return `
      <button type="button" class="pse-line" data-id="${id}" aria-current="${id === buffSelected}">
        ${shiny ? `<span class="pse-slot-shiny" aria-label="Shiny">${icon('sparkle')}</span>` : ''}
        <img src="${spriteUrl(id, shiny)}" alt="" width="64" height="64" loading="lazy">
        <span class="pse-line-name">${escapeHtml(speciesName(id))}</span>
        <span class="pse-line-points${total > 0 ? ' has-points' : ''}">${total > 0 ? plural(total, 'point') : 'No buffs'}</span>
      </button>
    `;
  }

  function renderStatBuffs(container) {
    const statBuffs = readJson(BUFFS_KEY, {});
    const hideLegendaries = localStorage.getItem('pse_filter_legendaries') === 'true';
    const lines = hallOfFameLines(hideLegendaries);
    const ids = [...lines.keys()];
    const buffedFirst = [...ids.filter(id => statBuffs[id]), ...ids.filter(id => !statBuffs[id])];
    // Search matches every member of a line, so "Charizard" finds the Charmander card
    const lineMembers = new Map(ids.map(id => [id, []]));
    for (const pokemon of POKEMON_LIST) lineMembers.get(getEvoLineRoot(pokemon.id))?.push(pokemon);

    if (buffSelected !== null && !lines.has(buffSelected)) buffSelected = null;
    if (buffSelected === null && buffedFirst.length && !isNarrow()) buffSelected = buffedFirst[0];
    setHeadline(ids.length, `${ids.length === 1 ? 'evolution line' : 'evolution lines'} from your Hall of Fame`);

    const emptyState = hideLegendaries ? `
      <div class="pse-state">
        <h3 class="pse-state-title">No non-legendary Pokémon</h3>
        <p>Every Pokémon in your Hall of Fame is legendary. Turn off “Battle Tower only” to see them.</p>
      </div>
    ` : `
      <div class="pse-state">
        <h3 class="pse-state-title">No Pokémon to buff yet</h3>
        <p>Stat buffs are given to Pokémon from your Hall of Fame. Finish a run, or add one in the Hall of Fame view.</p>
      </div>
    `;

    container.innerHTML = `
      <div class="pse-split${buffSelected !== null ? ' has-detail' : ''}">
        <div class="pse-split-list">
          <div class="pse-list-head">
            ${ids.length ? searchField('pse-buff-search', 'Search by name or number', 'Search Pokémon') : ''}
            <label class="pse-switch">
              <input type="checkbox" role="switch" id="pse-filter-legendaries" ${hideLegendaries ? 'checked' : ''}>
              <span class="pse-switch-text">Battle Tower only<span class="pse-switch-hint">Hides legendary Pokémon</span></span>
            </label>
          </div>
          <div class="pse-scroll"></div>
        </div>
        <div class="pse-split-detail" id="pse-buff-detail"></div>
      </div>
    `;

    const scroll = container.querySelector('.pse-split-list .pse-scroll');
    const search = container.querySelector('#pse-buff-search');

    function renderLines() {
      // Without a search field (no lines at all) a leftover query must not hide the empty state
      const query = search ? buffQuery.trim() : '';
      const shown = query ? buffedFirst.filter(id => lineMembers.get(id).some(p => matchesSearch(p, query))) : buffedFirst;
      if (shown.length) {
        scroll.innerHTML = `<div class="pse-lines">${shown.map(id => lineCardHtml(id, lines.get(id), statBuffs[id])).join('')}</div>`;
      } else if (query) {
        scroll.innerHTML = `
          <div class="pse-state">
            <h3 class="pse-state-title">No Pokémon match “${escapeHtml(query)}”</h3>
            <p>Search works with any Pokémon of a line, by English name, the name shown in the game, or a Pokédex number like 25.</p>
            <button type="button" class="pse-btn pse-btn-ghost" data-act="clear-search">Clear search</button>
          </div>
        `;
      } else {
        scroll.innerHTML = emptyState;
      }
    }

    if (search) {
      search.value = buffQuery;
      bindSearch(search, () => {
        buffQuery = search.value;
        renderLines();
      });
    }
    renderLines();

    container.querySelector('#pse-filter-legendaries').addEventListener('change', e => {
      localStorage.setItem('pse_filter_legendaries', e.target.checked);
      renderStatBuffs(container);
    });
    scroll.addEventListener('click', e => {
      if (e.target.closest('[data-act="clear-search"]')) {
        search.value = '';
        search.dispatchEvent(new Event('input'));
        search.focus();
        return;
      }
      const card = e.target.closest('.pse-line');
      if (!card) return;
      buffSelected = Number(card.dataset.id);
      renderStatBuffs(container);
      container.querySelector('#pse-buff-detail .pse-detail-title')?.focus();
    });

    if (buffSelected !== null) renderBuffEditor(container, buffSelected, lines.get(buffSelected));
  }

  function renderBuffEditor(container, pokemonId, shiny) {
    const detail = container.querySelector('#pse-buff-detail');
    const hiddenStat = unusedAttackStat(pokemonId);
    const visibleStats = STATS.filter(stat => stat !== hiddenStat);
    const pointCap = buffPointCap();
    // Saving mirrors ATK and Special, so the hidden one only has to stay out of the total
    const values = { hp: 0, atk: 0, special: 0, def: 0, speed: 0, spdef: 0, ...readJson(BUFFS_KEY, {})[pokemonId] };
    if (hiddenStat) values[hiddenStat] = 0;
    const lineNames = POKEMON_LIST.filter(p => getEvoLineRoot(p.id) === pokemonId).map(p => p.name);
    const cheat = () => detail.querySelector('#pse-cheat-mode').checked;
    const statMax = () => (cheat() ? CHEAT_MAX_STAT_BUFF : MAX_STAT_BUFF);

    detail.innerHTML = `
      <div class="pse-detail-head pse-back-row">
        <button type="button" class="pse-icon-btn pse-back" data-act="back" aria-label="Back to all Pokémon">${icon('back')}</button>
      </div>
      <div class="pse-buff-head">
        <img src="${spriteUrl(pokemonId, shiny)}" alt="" width="96" height="96">
        <div>
          <h3 class="pse-detail-title" tabindex="-1">${escapeHtml(speciesName(pokemonId))}</h3>
          <p>Buffs apply to the whole line: ${escapeHtml(lineNames.join(', '))}</p>
        </div>
      </div>
      <div class="pse-points" id="pse-points">
        <span class="pse-points-num" id="pse-points-num"></span>
        <div class="pse-meter" aria-hidden="true"><span></span></div>
        <label class="pse-switch pse-switch-danger">
          <input type="checkbox" role="switch" id="pse-cheat-mode" ${localStorage.getItem('pse_cheat_mode') === 'true' ? 'checked' : ''}>
          <span class="pse-switch-text">Cheat Mode<span class="pse-switch-hint">No limits</span></span>
        </label>
        <p class="pse-points-hint" id="pse-points-hint" aria-live="polite"></p>
      </div>
      <div class="pse-stats">
        ${visibleStats.map(stat => `
          <div class="pse-stat" style="--c: var(--stat-${STAT_COLORS[stat]})">
            <label class="pse-stat-name" for="pse-buff-${stat}-range">${STAT_NAMES[stat]}</label>
            <div class="pse-cells" data-cells="${stat}">
              ${'<span></span>'.repeat(MAX_STAT_BUFF)}
              <input type="range" id="pse-buff-${stat}-range" data-stat="${stat}" min="0" max="${MAX_STAT_BUFF}" step="1">
            </div>
            <div class="pse-stepper">
              <button type="button" data-stat="${stat}" data-step="-1" aria-label="Lower ${STAT_NAMES[stat]}">${icon('minus')}</button>
              <input type="number" class="pse-input" data-stat="${stat}" min="0" inputmode="numeric" aria-label="${STAT_NAMES[stat]} buffs">
              <button type="button" data-stat="${stat}" data-step="1" aria-label="Raise ${STAT_NAMES[stat]}">${icon('plus')}</button>
            </div>
            <output class="pse-stat-pct" data-pct="${stat}"></output>
          </div>
        `).join('')}
      </div>
      <p class="pse-buff-note">Each buff adds 10% to the stat. ${hiddenStat
        ? `This Pokémon is a ${hiddenStat === 'atk' ? 'special' : 'physical'} attacker, so only ${STAT_NAMES[hiddenStat === 'atk' ? 'special' : 'atk']} is shown.`
        : 'Attack and Sp. Atk mirror each other and cost points once.'}</p>
      <div class="pse-buff-foot">
        <button type="button" class="pse-btn pse-btn-danger pse-btn-sm" data-act="reset">${icon('trash')}Remove all buffs</button>
      </div>
    `;

    function save(undo = false) {
      const statBuffs = readJson(BUFFS_KEY, {});
      const attack = Math.max(values.atk, values.special);
      if (buffTotal(values) === 0) delete statBuffs[pokemonId];
      else statBuffs[pokemonId] = { hp: values.hp, atk: attack, def: values.def, speed: values.speed, special: attack, spdef: values.spdef };
      writeJson(BUFFS_KEY, statBuffs);
      noteChange(BUFFS_KEY, undo);
      refreshLineCard();
    }

    function refreshLineCard() {
      const card = container.querySelector(`.pse-line[data-id="${pokemonId}"]`);
      const total = buffTotal(values);
      const points = card?.querySelector('.pse-line-points');
      if (!points) return;
      points.textContent = total > 0 ? plural(total, 'point') : 'No buffs';
      points.classList.toggle('has-points', total > 0);
    }

    function showStat(stat) {
      const value = values[stat];
      const max = statMax();
      const cells = detail.querySelector(`[data-cells="${stat}"]`);
      cells.querySelectorAll('span').forEach((cell, i) => cell.classList.toggle('on', i < value));
      cells.classList.toggle('overflow', value > MAX_STAT_BUFF);
      const range = cells.querySelector('input');
      range.value = Math.min(value, MAX_STAT_BUFF);
      range.setAttribute('aria-valuetext', `${value} buffs, plus ${value * 10}%`);
      const number = detail.querySelector(`input[type="number"][data-stat="${stat}"]`);
      number.max = max;
      if (document.activeElement !== number) number.value = value;
      detail.querySelector(`[data-stat="${stat}"][data-step="-1"]`).disabled = value <= 0;
      detail.querySelector(`[data-stat="${stat}"][data-step="1"]`).disabled = value >= max || !canRaise(stat);
      const pct = detail.querySelector(`[data-pct="${stat}"]`);
      pct.textContent = `+${value * 10}%`;
      pct.classList.toggle('on', value > 0);
    }

    const canRaise = stat => cheat() || buffTotal({ ...values, [stat]: values[stat] + 1 }) <= pointCap;

    function showTotal() {
      const total = buffTotal(values);
      const box = detail.querySelector('#pse-points');
      const capped = !cheat();
      detail.querySelector('#pse-points-num').innerHTML = capped
        ? `${total}<small> / ${pointCap} points</small>`
        : `${total}<small> points</small>`;
      box.classList.toggle('full', capped && total === pointCap);
      box.classList.toggle('over', capped && total > pointCap);
      box.querySelector('.pse-meter > span').style.setProperty('--p', `${capped ? Math.min(100, (total / pointCap) * 100) : 100}%`);

      const hint = detail.querySelector('#pse-points-hint');
      hint.classList.toggle('warn', capped && total > pointCap);
      if (!capped) hint.textContent = 'Cheat Mode is on: stats go up to 999 and there is no point cap.';
      else if (total > pointCap) hint.textContent = `${total - pointCap} over the cap. Lower a stat or turn on Cheat Mode.`;
      else hint.textContent = `The game allows up to ${pointCap} points per evolution line.`;
    }

    function showAll() {
      visibleStats.forEach(showStat);
      showTotal();
    }

    // Raising a stat stops at the point cap, lowering it always works
    function setStat(stat, requested) {
      let value = Math.max(0, Math.min(statMax(), Number.isFinite(requested) ? requested : 0));
      if (!cheat()) {
        while (value > values[stat] && buffTotal({ ...values, [stat]: value }) > pointCap) value--;
      }
      if (value === values[stat]) {
        showAll();
        return;
      }
      values[stat] = value;
      save();
      showAll();
    }

    detail.addEventListener('input', e => {
      const { stat } = e.target.dataset;
      if (stat && e.target.type === 'range') setStat(stat, parseInt(e.target.value, 10));
    });
    detail.addEventListener('change', e => {
      const { stat } = e.target.dataset;
      if (stat && e.target.type === 'number') {
        setStat(stat, parseInt(e.target.value, 10));
        e.target.value = values[stat];
      }
    });
    detail.addEventListener('click', e => {
      const step = e.target.closest('[data-step]');
      if (step) {
        setStat(step.dataset.stat, values[step.dataset.stat] + Number(step.dataset.step));
        return;
      }
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'back') {
        buffSelected = null;
        renderStatBuffs(container);
      } else if (act === 'reset') {
        const before = { ...values };
        if (buffTotal(before) === 0) return;
        visibleStats.forEach(stat => { values[stat] = 0; });
        save();
        showAll();
        toast(`Removed all buffs from ${speciesName(pokemonId)}`, () => {
          if (!detail.isConnected) return;
          Object.assign(values, before);
          save(true);
          showAll();
        });
      }
    });
    detail.querySelector('#pse-cheat-mode').addEventListener('change', e => {
      localStorage.setItem('pse_cheat_mode', e.target.checked);
      showAll();
    });

    showAll();
  }
  // ─── Achievements Data ───────────────────────────────────────────────────────
  // Labels are copied word for word from the game's achievements screen, em dashes
  // included, because the game's translator only translates text it knows exactly
  const ACHIEVEMENT_CATEGORIES = [
    { key: 'normal', label: 'Gen 1 — Classic', group: 'g1' },
    { key: 'gen1_nuz', label: 'Gen 1 — Nuzlocke', group: 'g1' },
    { key: 'gen1_chal', label: 'Gen 1 — Challenges', group: 'g1' },
    { key: 'gen2_norm', label: 'Gen 2 — Normal', group: 'g2' },
    { key: 'gen2_nuz', label: 'Gen 2 — Nuzlocke', group: 'g2' },
    { key: 'gen2_chal', label: 'Gen 2 — Challenges', group: 'g2' },
    { key: 'gen3_norm', label: 'Gen 3 — Normal', group: 'g3' },
    { key: 'gen3_nuz', label: 'Gen 3 — Nuzlocke', group: 'g3' },
    { key: 'gen4_norm', label: 'Gen 4 — Normal', group: 'g4' },
    { key: 'gen4_nuz', label: 'Gen 4 — Nuzlocke', group: 'g4' },
    { key: 'gen5_norm', label: 'Gen 5 — Normal', group: 'g5' },
    { key: 'gen5_nuz', label: 'Gen 5 — Nuzlocke', group: 'g5' },
    { key: 'gen6_norm', label: 'Gen 6 — Normal', group: 'g6' },
    { key: 'gen6_nuz', label: 'Gen 6 — Nuzlocke', group: 'g6' },
    { key: 'gen7_norm', label: 'Gen 7 — Normal', group: 'g7' },
    { key: 'gen7_nuz', label: 'Gen 7 — Nuzlocke', group: 'g7' },
    { key: 'tower', label: 'Battle Tower', group: 'tower' },
    { key: 'general', label: 'General', group: 'general' },
  ];

  const ACHIEVEMENT_GROUPS = [
    { key: 'all', label: 'All regions' }, { key: 'g1', label: 'Kanto' }, { key: 'g2', label: 'Johto' },
    { key: 'g3', label: 'Hoenn' }, { key: 'g4', label: 'Sinnoh' }, { key: 'g5', label: 'Unova' },
    { key: 'g6', label: 'Kalos' }, { key: 'g7', label: 'Alola' }, { key: 'tower', label: 'Battle Tower' },
    { key: 'general', label: 'General' },
  ];

  // The game's ACHIEVEMENTS (js/data.js). Empty until the game has loaded its scripts
  const getAchievementList = () => readGameList(() => ACHIEVEMENTS);

  // A category for a generation the game adds later, like gen8_norm, takes its label from
  // the same kind of category of an earlier generation, so the wording matches the game's
  function achievementCategory(key) {
    const match = /^gen(\d+)_(\w+)$/.exec(key);
    const model = match && ACHIEVEMENT_CATEGORIES.find(c => c.key.endsWith(`_${match[2]}`));
    if (!model) return { key, label: key, group: 'general' };
    return { key, label: model.label.replace(/\d+/, match[1]), group: `g${match[1]}` };
  }

  // ─── Achievements ────────────────────────────────────────────────────────────
  function achievementTileHtml(achievement, isUnlocked) {
    return `
      <button type="button" class="pse-ach" data-id="${escapeHtml(achievement.id)}" aria-pressed="${isUnlocked}" tabindex="-1">
        <span class="pse-ach-icon" aria-hidden="true"><span>${achievement.icon}</span></span>
        <span class="pse-ach-text">
          <span class="pse-ach-name">${escapeHtml(achievement.name)}</span>
          <span class="pse-ach-desc">${escapeHtml(achievement.desc)}</span>
        </span>
      </button>
    `;
  }

  function renderAchievements(container) {
    const list = getAchievementList();
    if (list.length === 0) {
      container.innerHTML = gameDataMissingHtml("Couldn't read the achievements", 'The editor takes the achievement list from the game.');
      return;
    }

    const categories = [...ACHIEVEMENT_CATEGORIES];
    for (const a of list) {
      if (categories.some(c => c.key === a.category)) continue;
      const category = achievementCategory(a.category);
      // A later generation goes before the Battle Tower, like the earlier ones
      categories.splice(category.group === 'general' ? categories.length : categories.findIndex(c => c.key === 'tower'), 0, category);
    }
    // Regions only get into the filter once the game has achievements for them
    const groups = [...ACHIEVEMENT_GROUPS];
    for (const g of GENERATIONS) {
      const key = `g${g.gen}`;
      if (groups.some(x => x.key === key) || !categories.some(c => c.group === key)) continue;
      groups.splice(groups.findIndex(x => x.key === 'tower'), 0, { key, label: g.region });
    }

    container.innerHTML = `
      <div class="pse-toolbar">
        ${searchField('pse-ach-search', 'Search achievements', 'Search achievements')}
        <select class="pse-select" id="pse-ach-group" aria-label="Region">
          ${groups.map(g => `<option value="${g.key}">${g.label}</option>`).join('')}
        </select>
        <button type="button" class="pse-chip" id="pse-ach-missing" aria-pressed="false">${icon('check')}Missing only</button>
      </div>
      <div class="pse-scroll" id="pse-ach-sections"></div>
    `;

    const sections = container.querySelector('#pse-ach-sections');
    const search = container.querySelector('#pse-ach-search');
    const groupSelect = container.querySelector('#pse-ach-group');
    const missingBtn = container.querySelector('#pse-ach-missing');
    groupSelect.value = localStorage.getItem('pse_ach_group') || 'all';
    if (!groupSelect.value) groupSelect.value = 'all';
    missingBtn.setAttribute('aria-pressed', String(localStorage.getItem('pse_ach_missing_only') === 'true'));
    const missingOnly = () => missingBtn.getAttribute('aria-pressed') === 'true';

    function saveUnlocked(unlocked, undo = false) {
      writeJson(ACHIEVEMENTS_KEY, [...unlocked]);
      noteChange(ACHIEVEMENTS_KEY, undo);
    }

    const matches = (a, query) => !query || `${a.name} ${a.desc}`.toLowerCase().includes(query);

    function refreshCounts(unlocked = new Set(readJson(ACHIEVEMENTS_KEY, []))) {
      setHeadline(list.filter(a => unlocked.has(a.id)).length, `/ ${list.length} unlocked`);
      for (const section of sections.querySelectorAll('.pse-section')) {
        const items = list.filter(a => a.category === section.dataset.category);
        const done = items.filter(a => unlocked.has(a.id)).length;
        section.querySelector('.pse-count').innerHTML = `<b>${done}</b> / ${items.length}`;
        section.querySelector('.pse-meter > span').style.setProperty('--p', `${items.length ? (done / items.length) * 100 : 0}%`);
        section.querySelector('[data-act="unlock-all"]').disabled = done === items.length;
        section.querySelector('[data-act="lock-all"]').disabled = done === 0;
      }
    }

    function renderSections() {
      const unlocked = new Set(readJson(ACHIEVEMENTS_KEY, []));
      const query = search.value.trim().toLowerCase();

      const html = categories
        .filter(c => groupSelect.value === 'all' || c.group === groupSelect.value)
        .map(c => {
          const items = list.filter(a => a.category === c.key);
          const shown = items.filter(a => matches(a, query) && !(missingOnly() && unlocked.has(a.id)));
          if (shown.length === 0) return '';
          return `
            <section class="pse-section" data-category="${escapeHtml(c.key)}">
              <header class="pse-section-head">
                <h3 class="pse-section-title">${escapeHtml(c.label)}</h3>
                <span class="pse-count"></span>
                <div class="pse-meter" aria-hidden="true"><span></span></div>
                <div class="pse-section-actions">
                  <button type="button" class="pse-btn pse-btn-quiet pse-btn-sm" data-act="unlock-all">${icon('check')}Unlock all</button>
                  <button type="button" class="pse-btn pse-btn-quiet pse-btn-sm" data-act="lock-all">${icon('close')}Lock all</button>
                </div>
              </header>
              <div class="pse-ach-grid">
                ${shown.map(a => achievementTileHtml(a, unlocked.has(a.id))).join('')}
              </div>
            </section>
          `;
        }).join('');

      sections.innerHTML = html || (query ? `
        <div class="pse-state">
          <h3 class="pse-state-title">No achievements match “${escapeHtml(search.value.trim())}”</h3>
          <p>Search looks at achievement names and descriptions.</p>
          <button type="button" class="pse-btn pse-btn-ghost" data-act="clear-search">Clear search</button>
        </div>
      ` : `
        <div class="pse-state">
          <h3 class="pse-state-title">Nothing missing here</h3>
          <p>Every achievement in this region is unlocked.</p>
          <button type="button" class="pse-btn pse-btn-ghost" data-act="show-all">Show all achievements</button>
        </div>
      `);
      resetGridTabStop(sections, '.pse-ach');
      refreshCounts(unlocked);
    }

    function setCategoryUnlocked(category, unlock) {
      const unlocked = new Set(readJson(ACHIEVEMENTS_KEY, []));
      const before = [...unlocked];
      const ids = list.filter(a => a.category === category.key).map(a => a.id);
      const changed = ids.filter(id => unlocked.has(id) !== unlock).length;
      ids.forEach(id => (unlock ? unlocked.add(id) : unlocked.delete(id)));
      saveUnlocked(unlocked);
      renderSections();
      toast(`${unlock ? 'Unlocked' : 'Locked'} ${plural(changed, 'achievement')} in ${category.label}`, () => {
        saveUnlocked(new Set(before), true);
        if (sections.isConnected) renderSections();
      });
    }

    sections.addEventListener('click', e => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'clear-search') {
        search.value = '';
        search.dispatchEvent(new Event('input'));
        search.focus();
        return;
      }
      if (act === 'show-all') {
        missingBtn.click();
        return;
      }
      const section = e.target.closest('.pse-section');
      if (!section) return;
      const category = categories.find(c => c.key === section.dataset.category);

      const tile = e.target.closest('.pse-ach');
      if (tile) {
        const unlocked = new Set(readJson(ACHIEVEMENTS_KEY, []));
        const unlock = !unlocked.has(tile.dataset.id);
        if (unlock) unlocked.add(tile.dataset.id);
        else unlocked.delete(tile.dataset.id);
        saveUnlocked(unlocked);
        tile.setAttribute('aria-pressed', String(unlock));
        flip(tile);
        refreshCounts(unlocked);
      } else if (act === 'unlock-all') {
        setCategoryUnlocked(category, true);
      } else if (act === 'lock-all') {
        setCategoryUnlocked(category, false);
      }
    });

    groupSelect.addEventListener('change', () => {
      localStorage.setItem('pse_ach_group', groupSelect.value);
      sections.scrollTop = 0;
      renderSections();
    });
    missingBtn.addEventListener('click', () => {
      missingBtn.setAttribute('aria-pressed', String(!missingOnly()));
      localStorage.setItem('pse_ach_missing_only', missingOnly());
      renderSections();
    });

    bindSearch(search, debounce(renderSections, 90));
    enableGridKeys(sections, '.pse-ach');
    renderSections();
  }

  // ─── Extras Data ─────────────────────────────────────────────────────────────
  const PRIMAL_KEY = 'poke_primal_unlocks';
  const BAG_KEY = 'poke_bag';
  const MAX_BAG_QTY = 999;

  // The forms from the game's BOSS_FORMS (js/primal.js), which also takes in the forms
  // the server adds. Empty until the game has loaded its scripts
  function getBossForms() {
    try {
      return Object.keys(BOSS_FORMS).map(Number).filter(id => id > 0).sort((a, b) => a - b).map(id => ({
        id,
        name: bossName(id),
        types: BOSS_FORMS[id].types || [],
        sprite: bossSpriteUrl(id),
      }));
    } catch {
      return [];
    }
  }

  const readPrimalUnlocks = () => new Set(readJson(PRIMAL_KEY, []).map(Number).filter(id => id > 0));

  // The vitamins from the game's BAG_ITEM_POOL (js/bag.js), then anything else the bag
  // holds, described the way the game's own bag describes it
  function getBagItemList(bag) {
    const pool = readGameList(() => BAG_ITEM_POOL);
    const describe = typeof bagItemDef === 'function' ? bagItemDef : id => ({ id, name: id, desc: '', icon: '🎁' });
    const extra = Object.keys(bag).filter(id => !pool.some(item => item.id === id)).map(id => describe(id));
    return pool.length ? [...pool, ...extra] : [];
  }

  // ─── Extras ──────────────────────────────────────────────────────────────────
  function renderExtras(container) {
    setSubtitle('Primal forms and your bag');
    container.innerHTML = `
      <div class="pse-scroll" id="pse-extras">
        <section class="pse-section" id="pse-forms" aria-labelledby="pse-forms-title"></section>
        <section class="pse-section" id="pse-bag" aria-labelledby="pse-bag-title"></section>
      </div>
    `;
    const formsEl = container.querySelector('#pse-forms');
    const bagEl = container.querySelector('#pse-bag');

    const forms = getBossForms();
    function saveForms(unlocked, undo = false) {
      writeJson(PRIMAL_KEY, [...unlocked].sort((a, b) => a - b));
      noteChange(PRIMAL_KEY, undo);
    }

    function refreshFormCounts(unlocked = readPrimalUnlocks()) {
      const done = forms.filter(f => unlocked.has(f.id)).length;
      formsEl.querySelector('.pse-count').innerHTML = `<b>${done}</b> / ${forms.length}`;
      formsEl.querySelector('.pse-meter > span').style.setProperty('--p', `${forms.length ? (done / forms.length) * 100 : 0}%`);
      formsEl.querySelector('[data-act="unlock-all"]').disabled = done === forms.length;
      formsEl.querySelector('[data-act="lock-all"]').disabled = done === 0;
    }

    function renderForms() {
      if (!forms.length) {
        formsEl.innerHTML = gameDataMissingHtml("Couldn't read the primal forms", 'The editor takes the primal and boss forms from the game.');
        return;
      }
      const unlocked = readPrimalUnlocks();
      formsEl.innerHTML = `
        <header class="pse-section-head">
          <h3 class="pse-section-title" id="pse-forms-title">Primal forms</h3>
          <span class="pse-count"></span>
          <div class="pse-meter" aria-hidden="true"><span></span></div>
          <div class="pse-section-actions">
            <button type="button" class="pse-btn pse-btn-quiet pse-btn-sm" data-act="unlock-all">${icon('check')}Unlock all</button>
            <button type="button" class="pse-btn pse-btn-quiet pse-btn-sm" data-act="lock-all">${icon('close')}Lock all</button>
          </div>
        </header>
        <p class="pse-section-note">The game unlocks these when you beat the special bosses in Expedition.</p>
        <div class="pse-ach-grid">
          ${forms.map(f => `
            <button type="button" class="pse-ach pse-form" data-id="${f.id}" aria-pressed="${unlocked.has(f.id)}" tabindex="-1">
              <span class="pse-ach-icon" aria-hidden="true"><span><img src="${escapeHtml(f.sprite)}" alt="" width="40" height="40" loading="lazy"></span></span>
              <span class="pse-ach-text">
                <span class="pse-ach-name">${escapeHtml(f.name)}</span>
                <span class="pse-ach-desc">${escapeHtml(f.types.join(' / '))}</span>
              </span>
            </button>
          `).join('')}
        </div>
      `;
      resetGridTabStop(formsEl, '.pse-ach');
      refreshFormCounts(unlocked);
    }

    function setAllForms(unlock) {
      const unlocked = readPrimalUnlocks();
      const before = [...unlocked];
      const changed = forms.filter(f => unlocked.has(f.id) !== unlock).length;
      forms.forEach(f => (unlock ? unlocked.add(f.id) : unlocked.delete(f.id)));
      saveForms(unlocked);
      renderForms();
      toast(`${unlock ? 'Unlocked' : 'Locked'} ${plural(changed, 'primal form')}`, () => {
        saveForms(new Set(before), true);
        if (formsEl.isConnected) renderForms();
      });
    }

    formsEl.addEventListener('click', e => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'unlock-all' || act === 'lock-all') {
        setAllForms(act === 'unlock-all');
        return;
      }
      const tile = e.target.closest('.pse-ach');
      if (!tile) return;
      const id = Number(tile.dataset.id);
      const unlocked = readPrimalUnlocks();
      const unlock = !unlocked.has(id);
      if (unlock) unlocked.add(id);
      else unlocked.delete(id);
      saveForms(unlocked);
      tile.setAttribute('aria-pressed', String(unlock));
      flip(tile);
      refreshFormCounts(unlocked);
    });

    function renderBag() {
      const bag = readJson(BAG_KEY, {});
      const items = getBagItemList(bag);
      if (!items.length) {
        bagEl.innerHTML = gameDataMissingHtml("Couldn't read the bag items", 'The editor takes the bag items from the game.');
        return;
      }
      bagEl.innerHTML = `
        <header class="pse-section-head">
          <h3 class="pse-section-title" id="pse-bag-title">Bag</h3>
          <span class="pse-count" id="pse-bag-count"></span>
        </header>
        <p class="pse-section-note">Vitamins add stat buff points to a Hall of Fame Pokémon when you use them from the bag in the game.</p>
        <ul class="pse-bag-list">
          ${items.map(item => {
            const qty = Math.max(0, bag[item.id] | 0);
            const name = escapeHtml(item.name || item.id);
            return `
              <li class="pse-bag-row" data-id="${escapeHtml(item.id)}">
                <span class="pse-bag-icon" aria-hidden="true">${item.iconUrl ? `<img src="${escapeHtml(item.iconUrl)}" alt="" width="32" height="32" loading="lazy">` : item.icon || ''}</span>
                <span class="pse-item-text">
                  <span class="pse-item-name">${name}</span>
                  ${item.desc ? `<span class="pse-item-desc">${escapeHtml(item.desc)}</span>` : ''}
                </span>
                <div class="pse-stepper">
                  <button type="button" data-step="-1" aria-label="One ${name} less" ${qty <= 0 ? 'disabled' : ''}>${icon('minus')}</button>
                  <input type="number" class="pse-input" value="${qty}" min="0" max="${MAX_BAG_QTY}" inputmode="numeric" aria-label="${name} in the bag">
                  <button type="button" data-step="1" aria-label="One ${name} more" ${qty >= MAX_BAG_QTY ? 'disabled' : ''}>${icon('plus')}</button>
                </div>
              </li>
            `;
          }).join('')}
        </ul>
      `;
      refreshBagCount(bag);
    }

    function refreshBagCount(bag) {
      const total = Object.values(bag).reduce((sum, qty) => sum + Math.max(0, qty | 0), 0);
      bagEl.querySelector('#pse-bag-count').innerHTML = `<b>${total}</b> ${total === 1 ? 'item' : 'items'}`;
    }

    // The game drops an item from the bag when its count reaches 0, so the editor does too
    function setBagQty(row, value) {
      const qty = Math.max(0, Math.min(MAX_BAG_QTY, Number.isFinite(value) ? Math.round(value) : 0));
      const bag = readJson(BAG_KEY, {});
      if (qty > 0) bag[row.dataset.id] = qty;
      else delete bag[row.dataset.id];
      writeJson(BAG_KEY, bag);
      noteChange(BAG_KEY);
      row.querySelector('.pse-input').value = qty;
      row.querySelector('[data-step="-1"]').disabled = qty <= 0;
      row.querySelector('[data-step="1"]').disabled = qty >= MAX_BAG_QTY;
      refreshBagCount(bag);
    }

    bagEl.addEventListener('click', e => {
      const step = e.target.closest('[data-step]');
      if (!step) return;
      const row = step.closest('.pse-bag-row');
      setBagQty(row, (parseInt(row.querySelector('.pse-input').value, 10) || 0) + Number(step.dataset.step));
    });
    bagEl.addEventListener('change', e => {
      const row = e.target.closest('.pse-bag-row');
      if (row) setBagQty(row, parseInt(e.target.value, 10));
    });

    enableGridKeys(formsEl, '.pse-ach');
    renderForms();
    renderBag();
  }

  // ─── Settings ────────────────────────────────────────────────────────────────
  function renderSettings(container) {
    const eliteWins = localStorage.getItem('poke_elite_wins') || '0';
    const winStreak = localStorage.getItem('poke_win_streak') || '0';
    const lastRunWon = localStorage.getItem('poke_last_run_won') === 'true';
    setSubtitle('Win stats and how the editor looks');

    container.innerHTML = `
      <div class="pse-scroll">
        <div class="pse-settings">
          <section>
            <h3 class="pse-group-title">Win stats</h3>
            <p class="pse-group-sub">Saved as soon as you change a value.</p>
            <div class="pse-group-fields">
              <label class="pse-field">
                <span class="pse-label">Elite Wins</span>
                <input type="number" class="pse-input" id="pse-elite-wins" value="${escapeHtml(eliteWins)}" min="0" inputmode="numeric">
              </label>
              <label class="pse-field">
                <span class="pse-label">Win Streak</span>
                <input type="number" class="pse-input" id="pse-win-streak" value="${escapeHtml(winStreak)}" min="0" inputmode="numeric">
              </label>
            </div>
            <label class="pse-switch">
              <input type="checkbox" role="switch" id="pse-last-run-won" ${lastRunWon ? 'checked' : ''}>
              <span class="pse-switch-text">Last Run Won</span>
            </label>
            <p class="pse-saved" id="pse-saved" aria-live="polite">Saved</p>
          </section>
          <section>
            <h3 class="pse-group-title" id="pse-shell-title">Shell colour</h3>
            <p class="pse-group-sub">Pick the Game Boy Color you had. Only changes how the editor looks.</p>
            <div class="pse-shells" role="radiogroup" aria-labelledby="pse-shell-title">
              ${SHELLS.map(s => `
                <button type="button" class="pse-shell-opt" role="radio" data-shell="${s.id}" aria-checked="${s.id === root.dataset.shell}" tabindex="${s.id === root.dataset.shell ? 0 : -1}">
                  <span class="pse-shell-swatch" style="--swatch: ${s.swatch}"></span>${s.name}
                </button>
              `).join('')}
            </div>
          </section>
          <section>
            <h3 class="pse-group-title">Cloud save</h3>
            <div id="pse-cloud"></div>
          </section>
          <section>
            <h3 class="pse-group-title">About</h3>
            <dl class="pse-facts">
              <div><dt>Editor</dt><dd>${escapeHtml(SCRIPT_VERSION)}</dd></div>
              <div><dt>Game</dt><dd>${escapeHtml(gameVersion().shown || 'Unknown')}</dd></div>
              <div><dt>Game build</dt><dd>${escapeHtml(gameVersion().build || 'Unknown')}</dd></div>
            </dl>
            <p class="pse-about">
              Made by neol1no, continued by virtualtear. Pokémon data from PokeAPI.
              <a href="https://github.com/virtualtear/pokelike-save-editor" target="_blank" rel="noopener">Project page and updates</a>
            </p>
          </section>
        </div>
      </div>
    `;

    const saved = container.querySelector('#pse-saved');
    let savedTimer = null;
    const flashSaved = () => {
      saved.classList.add('visible');
      clearTimeout(savedTimer);
      savedTimer = setTimeout(() => saved.classList.remove('visible'), 1600);
    };

    for (const [id, key] of [['pse-elite-wins', 'poke_elite_wins'], ['pse-win-streak', 'poke_win_streak']]) {
      const input = container.querySelector(`#${id}`);
      input.addEventListener('change', () => {
        const value = Math.max(0, parseInt(input.value, 10) || 0);
        input.value = value;
        localStorage.setItem(key, String(value));
        noteChange(key);
        flashSaved();
      });
    }
    container.querySelector('#pse-last-run-won').addEventListener('change', e => {
      localStorage.setItem('poke_last_run_won', e.target.checked ? 'true' : 'false');
      noteChange('poke_last_run_won');
      flashSaved();
    });

    renderCloudSection(container.querySelector('#pse-cloud'));

    const shells = container.querySelector('.pse-shells');
    const pickShell = btn => {
      root.dataset.shell = btn.dataset.shell;
      localStorage.setItem('pse_shell', btn.dataset.shell);
      for (const opt of shells.children) {
        opt.setAttribute('aria-checked', String(opt === btn));
        opt.tabIndex = opt === btn ? 0 : -1;
      }
    };
    shells.addEventListener('click', e => {
      const btn = e.target.closest('[data-shell]');
      if (btn) pickShell(btn);
    });
    shells.addEventListener('keydown', e => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
      const opts = [...shells.children];
      const current = opts.indexOf(e.target.closest('[data-shell]'));
      const step = e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1;
      const next = opts[(current + step + opts.length) % opts.length];
      e.preventDefault();
      pickShell(next);
      next.focus();
    });
  }

  // Account facts and a check that compares this device's save with the cloud copy
  function renderCloudSection(el) {
    const uuid = cloudUuid();
    const cloud = gameCloud();
    if (!uuid) {
      el.innerHTML = `
        <p class="pse-group-sub">You are not logged in, so your save only lives on this device. Changes stay after a reload.</p>
      `;
      return;
    }
    el.innerHTML = `
      <p class="pse-group-sub">Logged in as <b class="pse-strong">${escapeHtml(localStorage.getItem('poke_username') || 'unknown')}</b>. Save & Reload also updates your cloud save, so removed entries stay removed on every device.</p>
      <dl class="pse-facts" id="pse-profile" aria-live="polite">
        <div><dt>Level</dt><dd>…</dd></div><div><dt>XP</dt><dd>…</dd></div><div><dt>Coins</dt><dd>…</dd></div>
      </dl>
      <p class="pse-group-sub">Level, XP and coins are kept on the game's server, so the editor can show them but not change them.</p>
      <div class="pse-cloud-check">
        <button type="button" class="pse-btn pse-btn-ghost" id="pse-cloud-check" ${cloud ? '' : 'disabled'}>${icon('reload')}Check cloud save</button>
        <p class="pse-cloud-result" id="pse-cloud-result" aria-live="polite">${cloud ? '' : "The game's cloud functions are not reachable from the editor."}</p>
      </div>
    `;

    const profile = el.querySelector('#pse-profile');
    fetch(`/api/profile/${encodeURIComponent(uuid)}`, { cache: 'no-store' })
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (!profile.isConnected) return;
        const num = v => (Number.isFinite(Number(v)) ? Number(v).toLocaleString() : 'Unknown');
        const coins = data?.coins ?? localStorage.getItem('poke_coins');
        profile.innerHTML = `
          <div><dt>Level</dt><dd>${num(data?.level)}</dd></div>
          <div><dt>XP</dt><dd>${num(data?.xp)}</dd></div>
          <div><dt>Coins</dt><dd>${num(coins)}</dd></div>
        `;
      })
      .catch(() => {
        if (profile.isConnected) profile.innerHTML = '<div><dt>Profile</dt><dd>Could not be loaded</dd></div>';
      });

    const check = el.querySelector('#pse-cloud-check');
    const result = el.querySelector('#pse-cloud-result');
    check?.addEventListener('click', async () => {
      check.disabled = true;
      result.textContent = 'Checking…';
      try {
        const remote = await fetchCloudSave(cloud, uuid);
        const keys = Object.keys(SAVE_KEY_NAMES).filter(key => cloud.keys.includes(key));
        const size = value => {
          try {
            const data = JSON.parse(value);
            return Array.isArray(data) ? data.length : data && typeof data === 'object' ? Object.keys(data).length : null;
          } catch {
            return null;
          }
        };
        const differ = cloudDifferences(remote, keys, key => localStorage.getItem(key));
        if (!remote) result.textContent = 'There is no cloud save yet. Save & Reload creates it.';
        else if (!differ.length) result.textContent = 'The cloud save matches this device.';
        else {
          result.innerHTML = `Different in the cloud: ${differ.map(key => {
            const cloudSize = size(remote[key]);
            const localSize = size(localStorage.getItem(key));
            const counts = cloudSize !== null && localSize !== null ? ` (cloud ${cloudSize}, here ${localSize})` : '';
            return `<b class="pse-strong">${escapeHtml(SAVE_KEY_NAMES[key])}</b>${counts}`;
          }).join(', ')}. ${editorWrites.size ? 'Save & Reload sends your changes.' : 'The game merges both on its next sync.'}`;
        }
      } catch {
        result.textContent = "Couldn't reach the cloud save. Check your internet connection.";
      }
      check.disabled = false;
    });
  }

  // ─── Keyboard shortcut ────────────────────────────────────────────────────────
  document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.shiftKey && (e.key === 'E' || e.key === 'e')) {
      e.preventDefault();
      toggleEditor();
    }
  });

  // ─── Init ─────────────────────────────────────────────────────────────────────
  showPending();
  // Start the PokeAPI download early, so the dex is ready when the editor opens
  loadPokemonData().catch(() => {});

  // ─── Stage Complete Message Modifier ──────────────────────────────────────────
  const observer = new MutationObserver(() => {
    const stageCompleteScreen = document.getElementById('endless-stage-complete');
    if (stageCompleteScreen && stageCompleteScreen.classList.contains('active')) {
      const msgEl = document.getElementById('stage-complete-msg');
      const unlockEl = document.getElementById('stage-complete-unlock');

      if (msgEl && !msgEl.textContent.includes('- Save Editor Loaded')) {
        msgEl.textContent = msgEl.textContent.replace('Complete!', 'Complete! - Save Editor Loaded');
      }

      if (unlockEl && unlockEl.textContent && !unlockEl.textContent.includes('- Save Editor Loaded')) {
        unlockEl.textContent = unlockEl.textContent.replace('unlocked!', 'unlocked! - Save Editor Loaded');
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
})();
