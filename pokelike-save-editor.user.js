// ==UserScript==
// @name         Pokelike Save Editor
// @namespace    https://github.com/virtualtear/pokelike-save-editor
// @version      2.7.0
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
    currentView: 'pokedex',
  };

  // ─── Save Data ───────────────────────────────────────────────────────────────
  const HOF_KEY = 'poke_hall_of_fame';
  const BUFFS_KEY = 'poke_stat_buffs';

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
  // properties. Reading one that does not exist throws, so the catch covers that too
  function readGameList(read, fallback) {
    try {
      const list = read();
      if (Array.isArray(list) && list.length) return list;
    } catch {
      // Not reachable from where this script runs
    }
    return fallback;
  }

  // ─── Items ───────────────────────────────────────────────────────────────────
  // Pokelike gives items its own effects, so they come from the game, not from PokeAPI.
  // Copy of the game's ITEM_POOL (js/data.js), used when the game's list is not reachable
  const BUILTIN_ITEMS = [
    { id: 'lucky_egg', name: 'Lucky Egg', icon: '🥚', desc: '30% chance: holder gains +1 extra level after each battle', minMap: 4 },
    { id: 'life_orb', name: 'Life Orb', icon: '🔮', desc: '+30% damage; holder loses 10% max HP per hit' },
    { id: 'choice_band', name: 'Choice Band', icon: '🎀', desc: '+40% physical damage, -20% DEF' },
    { id: 'choice_specs', name: 'Choice Specs', icon: '👓', desc: '+30% special damage' },
    { id: 'metronome', name: 'Metronome', icon: '🎵', desc: 'Dual-type holder uses its OTHER type for attacks; +20% damage on all moves' },
    { id: 'scope_lens', name: 'Scope Lens', icon: '🔭', desc: '20% crit chance (+50% damage on crit)' },
    { id: 'rocky_helmet', name: 'Rocky Helmet', icon: '⛑️', desc: 'Attacker takes 12% of their max HP on each hit' },
    { id: 'shell_bell', name: 'Shell Bell', icon: '🐚', desc: 'Heal 15% of damage dealt' },
    { id: 'eviolite', name: 'Eviolite', icon: '💎', desc: 'stops evolutions, if the pokemon is not the final stage it gets +50% DEF & +50% Sp. DEF' },
    { id: 'sharp_beak', name: 'Sharp Beak', icon: '🦅', desc: '+50% Flying move damage' },
    { id: 'charcoal', name: 'Charcoal', icon: '🔥', desc: '+50% Fire move damage' },
    { id: 'mystic_water', name: 'Mystic Water', icon: '💧', desc: '+50% Water move damage' },
    { id: 'magnet', name: 'Magnet', icon: '🧲', desc: '+50% Electric move damage', minMap: 4 },
    { id: 'miracle_seed', name: 'Miracle Seed', icon: '🌱', desc: '+50% Grass move damage' },
    { id: 'twisted_spoon', name: 'Twisted Spoon', icon: '🥄', desc: '+50% Psychic move damage', minMap: 4 },
    { id: 'black_belt', name: 'Black Belt', icon: '🥋', desc: '+50% Fighting move damage' },
    { id: 'soft_sand', name: 'Soft Sand', icon: '🏖️', desc: '+50% Ground move damage', minMap: 4 },
    { id: 'silver_powder', name: 'Silver Powder', icon: '🐛', desc: '+50% Bug move damage' },
    { id: 'hard_stone', name: 'Hard Stone', icon: '🪨', desc: '+50% Rock move damage', minMap: 4 },
    { id: 'dragon_fang', name: 'Dragon Fang', icon: '🐉', desc: '+50% Dragon move damage', minMap: 6 },
    { id: 'poison_barb', name: 'Poison Barb', icon: '☠️', desc: '+50% Poison move damage', minMap: 4 },
    { id: 'spell_tag', name: 'Spell Tag', icon: '👻', desc: '+50% Ghost move damage', minMap: 4 },
    { id: 'silk_scarf', name: 'Silk Scarf', icon: '🤍', desc: '+50% Normal move damage' },
    { id: 'metal_coat', name: 'Metal Coat', icon: '🔩', desc: '+50% Steel move damage', minMap: 4 },
    { id: 'black_glasses', name: 'Black Glasses', icon: '🕶️', desc: '+50% Dark move damage', minMap: 4 },
    { id: 'pixie_plate', name: 'Pixie Plate', icon: '🧚', desc: '+50% Fairy move damage', minMap: 4 },
    { id: 'never_melt_ice', name: 'Never-Melt Ice', icon: '❄️', desc: '+50% Ice move damage', minMap: 4 },
    { id: 'assault_vest', name: 'Assault Vest', icon: '🦺', desc: '+50% Sp.Def' },
    { id: 'choice_scarf', name: 'Choice Scarf', icon: '🧣', desc: '+50% Speed' },
    { id: 'leftovers', name: 'Leftovers', icon: '🍃', desc: 'Restore 10% max HP each round' },
    { id: 'expert_belt', name: 'Expert Belt', icon: '🥊', desc: '+100% damage on super effective hits' },
    { id: 'focus_sash', name: 'Focus Sash', icon: '🎗️', desc: 'If at full HP, guaranteed to survive any hit with 1 HP' },
    { id: 'wide_lens', name: 'Wide Lens', icon: '🔎', desc: '+20% damage on all moves' },
    { id: 'quick_claw', name: 'Quick Claw', icon: '🪝', desc: '50% chance to attack first regardless of speed' },
    { id: 'kings_rock', name: "King's Rock", icon: '👑', desc: '30% chance to flinch the target on a hit' },
    { id: 'lagging_tail', name: 'Lagging Tail', icon: '🐌', desc: 'Always moves last, but +100% move damage' },
    { id: 'adrenaline_orb', name: 'Adrenaline Orb', icon: '⚡', desc: 'When YOU land a SUPER-EFFECTIVE hit (×2+): +1 ATK / +1 Sp.Atk this battle' },
    { id: 'red_card', name: 'Red Card', icon: '🟥', desc: 'Take 50% less damage from super-effective hits' },
    { id: 'loaded_dice', name: 'Loaded Dice', icon: '🎲', desc: 'Start of each battle: 37% chance for +2 to ATK/DEF/Sp.Atk/Sp.Def/Speed, else -1', iconUrl: 'https://api.pokelike2.xyz/sprites/items/loaded_dice.png', gen2Only: true },
  ];

  // Held items the game can hand out
  const getItemList = () => readGameList(() => ITEM_POOL, BUILTIN_ITEMS);

  // ─── Pokémon Data (PokeAPI) ──────────────────────────────────────────────────
  // The game's Pokédex stops at #809, the end of Gen 7
  const MAX_POKEMON_ID = 809;
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

  const GENERATIONS = [
    { gen: 1, region: 'Kanto' }, { gen: 2, region: 'Johto' }, { gen: 3, region: 'Hoenn' },
    { gen: 4, region: 'Sinnoh' }, { gen: 5, region: 'Unova' }, { gen: 6, region: 'Kalos' },
    { gen: 7, region: 'Alola' },
  ];

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
    if (cache && Date.now() - cache.fetchedAt < POKEAPI_CACHE_MAX_AGE) {
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
  const style = document.createElement('style');
  style.textContent = `
    * { box-sizing: border-box; }

    #pse-gui {
      position: fixed !important; top: 20px !important; right: 20px !important;
      width: 900px !important; height: 90vh !important; max-height: 800px !important;
      background: rgba(18, 18, 24, 0.98) !important;
      backdrop-filter: blur(40px) !important;
      border: 0.5px solid rgba(255, 255, 255, 0.1) !important;
      border-radius: 20px !important;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6) !important;
      z-index: 999999 !important;
      display: flex !important;
      flex-direction: column !important;
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif !important;
      color: rgba(235, 235, 245, 0.9) !important;
      overflow: hidden !important;
    }
    #pse-gui.hidden { display: none !important; }

    #pse-toggle-btn {
      position: fixed !important;
      bottom: 20px !important;
      right: 20px !important;
      width: 50px !important;
      height: 50px !important;
      background: rgba(139, 92, 246, 0.95) !important;
      backdrop-filter: blur(10px) !important;
      border: 0.5px solid rgba(255, 255, 255, 0.2) !important;
      border-radius: 999px !important;
      box-shadow: 0 8px 24px rgba(139, 92, 246, 0.4) !important;
      z-index: 999998 !important;
      cursor: pointer !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-size: 24px !important;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
      color: white !important;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif !important;
    }
    #pse-toggle-btn:hover {
      transform: scale(1.1) !important;
      box-shadow: 0 12px 32px rgba(139, 92, 246, 0.6) !important;
      background: rgba(139, 92, 246, 1) !important;
    }
    #pse-toggle-btn:active {
      transform: scale(0.95) !important;
    }

    .pse-header {
      padding: 16px 20px;
      border-bottom: 0.5px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }
    .pse-title {
      font-size: 16px;
      font-weight: 600;
      color: rgba(139, 92, 246, 1);
    }
    .pse-close {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: rgba(255, 95, 87, 0.2);
      border: none;
      color: #ff5f57;
      cursor: pointer;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .pse-close:hover {
      background: rgba(255, 95, 87, 0.3);
    }

    .pse-nav {
      display: flex;
      gap: 4px;
      padding: 12px 20px;
      border-bottom: 0.5px solid rgba(255, 255, 255, 0.08);
      flex-shrink: 0;
    }
    .pse-nav-btn {
      padding: 8px 16px;
      border-radius: 8px;
      border: none;
      background: transparent;
      color: rgba(235, 235, 245, 0.6);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }
    .pse-nav-btn:hover {
      background: rgba(255, 255, 255, 0.05);
      color: rgba(235, 235, 245, 0.9);
    }
    .pse-nav-btn.active {
      background: rgba(139, 92, 246, 0.15);
      color: rgba(139, 92, 246, 1);
    }

    .pse-content {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
    }
    .pse-content::-webkit-scrollbar { width: 6px; }
    .pse-content::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 10px;
    }

    .pse-search {
      width: 100%;
      padding: 10px 16px;
      background: rgba(255, 255, 255, 0.04);
      border: 0.5px solid rgba(255, 255, 255, 0.1);
      border-radius: 999px;
      color: rgba(235, 235, 245, 0.9);
      font-size: 14px;
      outline: none;
      margin-bottom: 16px;
    }
    .pse-search:focus {
      border-color: rgba(139, 92, 246, 0.5);
      box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
    }

    .pse-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 12px;
    }

    .pse-dex-toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px;
      margin-bottom: 8px;
    }
    .pse-dex-toolbar .pse-search {
      flex: 1 1 200px;
      margin-bottom: 0;
    }
    .pse-select {
      padding: 10px 14px;
      background: rgba(255, 255, 255, 0.04);
      border: 0.5px solid rgba(255, 255, 255, 0.1);
      border-radius: 999px;
      color: rgba(235, 235, 245, 0.9);
      font-size: 13px;
      outline: none;
    }
    .pse-select option {
      background: #1c1c1e;
    }
    .pse-checkbox {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: rgba(235, 235, 245, 0.7);
      cursor: pointer;
      white-space: nowrap;
    }
    .pse-gen-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 20px 0 12px;
    }
    .pse-gen-title {
      flex: 1;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      user-select: none;
    }
    .pse-ach-title {
      flex: 1;
      font-size: 14px;
      font-weight: 600;
    }
    .pse-gen-arrow {
      display: inline-block;
      transition: transform 0.2s;
    }
    .pse-gen-section.collapsed .pse-gen-arrow {
      transform: rotate(-90deg);
    }
    .pse-gen-section.collapsed .pse-grid {
      display: none;
    }
    .pse-gen-count {
      margin-left: 6px;
      font-weight: 400;
      color: rgba(235, 235, 245, 0.5);
    }
    .pse-gen-header .pse-btn {
      padding: 6px 12px;
      font-size: 12px;
    }
    .pse-loading,
    .pse-error,
    .pse-empty {
      grid-column: 1 / -1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 40px 16px;
      text-align: center;
      color: rgba(235, 235, 245, 0.6);
      font-size: 14px;
    }

    .pse-card {
      background: rgba(255, 255, 255, 0.03);
      border: 0.5px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 12px;
      cursor: pointer;
      transition: all 0.2s;
      text-align: center;
    }
    .pse-card:hover {
      background: rgba(255, 255, 255, 0.06);
      border-color: rgba(139, 92, 246, 0.3);
      transform: translateY(-2px);
    }
    .pse-card.owned {
      border-color: rgba(139, 92, 246, 0.5);
      background: rgba(139, 92, 246, 0.08);
    }
    .pse-card img {
      width: 80px;
      height: 80px;
      image-rendering: pixelated;
    }
    .pse-card-name {
      font-size: 12px;
      margin-top: 8px;
      color: rgba(235, 235, 245, 0.8);
    }
    .pse-card-number {
      font-size: 11px;
      margin-top: 8px;
      color: rgba(235, 235, 245, 0.45);
      font-variant-numeric: tabular-nums;
    }
    .pse-card-number + .pse-card-name {
      margin-top: 2px;
    }

    .pse-modal {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(8px);
      z-index: 9999999;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .pse-modal-box {
      background: rgba(18, 18, 24, 0.98);
      border: 0.5px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 24px;
      width: 600px;
      max-width: 90vw;
      max-height: 80vh;
      overflow-y: auto;
    }
    .pse-modal-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 20px;
      color: rgba(235, 235, 245, 0.95);
    }
    .pse-modal-actions {
      display: flex;
      gap: 8px;
      margin-top: 20px;
      justify-content: flex-end;
    }

    .pse-btn {
      padding: 10px 20px;
      border-radius: 999px;
      border: none;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .pse-btn-primary {
      background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
      color: #fff;
    }
    .pse-btn-primary:hover {
      box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
    }
    .pse-btn-secondary {
      background: rgba(255, 255, 255, 0.04);
      border: 0.5px solid rgba(255, 255, 255, 0.1);
      color: rgba(235, 235, 245, 0.7);
    }
    .pse-btn-danger {
      background: rgba(239, 68, 68, 0.15);
      color: #ef4444;
      border: 0.5px solid rgba(239, 68, 68, 0.3);
    }

    .pse-hof-item {
      background: rgba(255, 255, 255, 0.03);
      border: 0.5px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .pse-hof-item:hover {
      background: rgba(255, 255, 255, 0.06);
      border-color: rgba(139, 92, 246, 0.3);
    }
    .pse-hof-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .pse-hof-title {
      font-size: 14px;
      font-weight: 600;
    }
    .pse-hof-team {
      display: flex;
      gap: 8px;
    }
    .pse-hof-team img {
      width: 48px;
      height: 48px;
      image-rendering: pixelated;
    }
    .pse-hof-mon {
      position: relative;
      display: inline-block;
    }

    .pse-item-badge {
      position: absolute;
      bottom: 2px;
      right: 2px;
      font-size: 14px;
      line-height: 1;
      cursor: help;
    }
    .pse-item-tip {
      position: fixed;
      z-index: 10000000;
      display: flex;
      flex-direction: column;
      max-width: 240px;
      padding: 8px 12px;
      background: rgba(28, 28, 36, 0.98);
      border: 0.5px solid rgba(139, 92, 246, 0.4);
      border-radius: 10px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.12s;
    }
    .pse-item-tip.visible {
      opacity: 1;
    }
    .pse-item-name {
      font-size: 13px;
      font-weight: 600;
      color: rgba(235, 235, 245, 0.95);
    }
    .pse-item-desc {
      display: block;
      margin-top: 2px;
      font-size: 12px;
      line-height: 1.4;
      color: rgba(235, 235, 245, 0.55);
    }
    .pse-item-icon {
      flex-shrink: 0;
      width: 22px;
      font-size: 18px;
      line-height: 1.2;
      text-align: center;
    }

    .pse-item-picker {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px;
      background: rgba(255, 255, 255, 0.04);
      border: 0.5px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      font: inherit;
      text-align: left;
      cursor: pointer;
    }
    .pse-item-picker .pse-item-name {
      flex: 1;
      font-size: 14px;
      font-weight: 500;
    }
    .pse-item-arrow {
      color: rgba(235, 235, 245, 0.5);
      transition: transform 0.2s;
    }
    .pse-item-picker[aria-expanded="true"] .pse-item-arrow {
      transform: rotate(180deg);
    }
    .pse-item-list {
      position: relative;
      margin-top: 6px;
      max-height: 280px;
      overflow-y: auto;
      background: rgba(255, 255, 255, 0.02);
      border: 0.5px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
    }
    .pse-item-option {
      width: 100%;
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 8px 10px;
      background: none;
      border: none;
      border-bottom: 0.5px solid rgba(255, 255, 255, 0.05);
      border-radius: 0;
      font: inherit;
      text-align: left;
      cursor: pointer;
    }
    .pse-item-option:last-child {
      border-bottom: none;
    }
    .pse-item-option:hover,
    .pse-item-option:focus-visible {
      background: rgba(255, 255, 255, 0.06);
      outline: none;
    }
    .pse-item-option.selected {
      background: rgba(139, 92, 246, 0.18);
    }
    .pse-item-option.selected::after {
      content: '✓';
      color: #a78bfa;
      font-weight: 600;
    }
    .pse-item-text {
      flex: 1;
      min-width: 0;
    }

    .pse-field {
      margin-bottom: 16px;
    }
    .pse-label {
      display: block;
      margin-bottom: 8px;
      font-size: 13px;
      color: rgba(235, 235, 245, 0.7);
    }
    .pse-input {
      width: 100%;
      padding: 10px;
      background: rgba(255, 255, 255, 0.04);
      border: 0.5px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      color: rgba(235, 235, 245, 0.9);
      font-size: 14px;
    }
    .pse-checkbox input {
      width: 16px;
      height: 16px;
      cursor: pointer;
      accent-color: rgba(139, 92, 246, 1);
    }
    .pse-checkbox-danger {
      font-size: 11px;
      color: rgba(255, 100, 100, 1);
    }
    .pse-checkbox-danger input {
      accent-color: rgba(255, 100, 100, 1);
    }
    .pse-sprite-lg {
      display: block;
      width: 96px;
      height: 96px;
      margin: 0 auto 20px;
      image-rendering: pixelated;
    }

    .pse-team-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 12px;
    }
    .pse-team-tile {
      position: relative;
      cursor: pointer;
    }
    .pse-team-tile img {
      width: 64px;
      height: 64px;
      image-rendering: pixelated;
    }
    .pse-shiny-mark {
      position: absolute;
      top: 2px;
      left: 2px;
      font-size: 16px;
    }

    .pse-info-box {
      margin-bottom: 16px;
      padding: 12px;
      background: rgba(139, 92, 246, 0.1);
      border: 0.5px solid rgba(139, 92, 246, 0.3);
      border-radius: 8px;
    }
    .pse-info-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }
    .pse-hint {
      margin-top: 4px;
      font-size: 11px;
      color: rgba(235, 235, 245, 0.6);
    }
    .pse-hint-warn {
      color: rgba(255, 180, 0, 0.8);
    }
    .pse-hint-danger {
      color: rgba(255, 100, 100, 0.8);
    }
    .pse-buff-points {
      margin-top: 4px;
      font-size: 11px;
      color: rgba(139, 92, 246, 1);
    }
    .pse-buff-used {
      font-size: 13px;
      font-weight: 600;
      color: rgba(235, 235, 245, 0.9);
    }
    #pse-buff-total.full {
      color: rgba(255, 215, 0, 1);
    }
    #pse-buff-total.over {
      color: rgba(255, 100, 100, 1);
    }
    .pse-buff-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .pse-buff-row input[type="range"] {
      flex: 1;
      accent-color: rgba(139, 92, 246, 1);
    }
    .pse-buff-row .pse-input {
      width: 60px;
      padding: 6px;
      border-radius: 6px;
      font-size: 13px;
      text-align: center;
    }

    .pse-ach-grid {
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    }
    .pse-achievement-card {
      padding: 16px;
      background: rgba(255, 255, 255, 0.02);
      border: 0.5px solid rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      text-align: center;
      opacity: 0.5;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .pse-achievement-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
    }
    .pse-achievement-card.unlocked {
      background: rgba(139, 92, 246, 0.1);
      border-color: rgba(139, 92, 246, 0.3);
      opacity: 1;
    }
    .pse-ach-icon {
      margin-bottom: 8px;
      font-size: 32px;
    }
    .pse-ach-name {
      margin-bottom: 4px;
      font-size: 13px;
      font-weight: 600;
      color: rgba(235, 235, 245, 0.7);
    }
    .pse-achievement-card.unlocked .pse-ach-name {
      color: rgba(139, 92, 246, 1);
    }
    .pse-ach-desc {
      font-size: 11px;
      line-height: 1.4;
      color: rgba(235, 235, 245, 0.5);
    }
    .pse-ach-check {
      margin-top: 8px;
      font-size: 16px;
    }
  `;
  document.head.appendChild(style);

  // ─── GUI ─────────────────────────────────────────────────────────────────────
  const gui = document.createElement('div');
  gui.id = 'pse-gui';
  gui.className = 'hidden';
  gui.innerHTML = `
    <div class="pse-header">
      <div class="pse-title">Save Editor - by neol1no, continued by virtualtear</div>
      <div style="display: flex; gap: 8px; align-items: center;">
        <button class="pse-btn pse-btn-primary" id="pse-save-reload" style="padding: 8px 16px; font-size: 12px;">Save & Reload</button>
        <button class="pse-close">✕</button>
      </div>
    </div>
    <div class="pse-nav">
      <button class="pse-nav-btn active" data-view="pokedex">Pokédex</button>
      <button class="pse-nav-btn" data-view="shiny-dex">Shiny Dex</button>
      <button class="pse-nav-btn" data-view="hall-of-fame">Hall of Fame</button>
      <button class="pse-nav-btn" data-view="stat-buffs">Stat Buffs</button>
      <button class="pse-nav-btn" data-view="achievements">Achievements</button>
      <button class="pse-nav-btn" data-view="settings">Settings</button>
    </div>
    <div class="pse-content" id="pse-content"></div>
  `;
  document.body.appendChild(gui);
  gui.querySelector('.pse-close').addEventListener('click', () => gui.classList.add('hidden'));

  function toggleGui() {
    gui.classList.toggle('hidden');
    if (!gui.classList.contains('hidden')) renderContent();
  }

  function openModal(html) {
    const modal = document.createElement('div');
    modal.className = 'pse-modal';
    modal.innerHTML = `<div class="pse-modal-box">${html}</div>`;
    modal.addEventListener('click', e => {
      if (e.target === modal) modal.remove();
    });
    document.body.appendChild(modal);
    return modal;
  }

  // ─── Toggle Button ───────────────────────────────────────────────────────────
  const toggleBtn = document.createElement('div');
  toggleBtn.id = 'pse-toggle-btn';
  toggleBtn.textContent = '⚙️';
  toggleBtn.title = 'Toggle Save Editor (Ctrl+Shift+E)';
  toggleBtn.addEventListener('click', toggleGui);
  document.body.appendChild(toggleBtn);

  // ─── Navigation ──────────────────────────────────────────────────────────────
  document.querySelectorAll('.pse-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pse-nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      STATE.currentView = btn.dataset.view;
      renderContent();
    });
  });

  // ─── Render Content ──────────────────────────────────────────────────────────
  const VIEWS_NEEDING_POKEMON = new Set(['pokedex', 'shiny-dex', 'hall-of-fame', 'stat-buffs']);

  const VIEW_RENDERERS = {
    'pokedex': container => renderDex(container, DEX_VIEWS.pokedex),
    'shiny-dex': container => renderDex(container, DEX_VIEWS['shiny-dex']),
    'hall-of-fame': renderHallOfFame,
    'stat-buffs': renderStatBuffs,
    'achievements': renderAchievements,
    'settings': renderSettings,
  };

  function renderContent() {
    const content = document.getElementById('pse-content');

    if (VIEWS_NEEDING_POKEMON.has(STATE.currentView) && !POKEMON_LIST) {
      renderPokemonDataLoading(content);
      return;
    }

    VIEW_RENDERERS[STATE.currentView](content);
  }

  function renderPokemonDataLoading(container) {
    const view = STATE.currentView;
    container.innerHTML = '<div class="pse-loading">Loading Pokémon data...</div>';

    loadPokemonData().then(() => {
      if (STATE.currentView === view) renderContent();
    }, () => {
      if (STATE.currentView !== view) return;
      container.innerHTML = `
        <div class="pse-error">
          <div>Couldn't load Pokémon data. Check your internet connection and try again.</div>
          <button class="pse-btn pse-btn-primary" id="pse-retry">Retry</button>
        </div>
      `;
      document.getElementById('pse-retry').addEventListener('click', renderContent);
    });
  }

  // ─── Pokédex & Shiny Dex ─────────────────────────────────────────────────────
  const DEX_VIEWS = {
    'pokedex': { id: 'pokedex', saveKey: 'poke_dex', shiny: false },
    'shiny-dex': { id: 'shiny-dex', saveKey: 'poke_shiny_dex', shiny: true },
  };

  // The game saves caught Pokémon as { "25": 1 } and turns any older entry into 1
  // when it loads, so every entry that exists counts as caught.
  const isCaught = (dex, id) => dex[id] !== undefined && dex[id] !== null;

  function renderDex(container, view) {
    const prefKey = name => `pse_${name}_${view.id}`;
    const genOptions = GENERATIONS.map(g => `<option value="${g.gen}">Gen ${g.gen} - ${g.region}</option>`).join('');

    container.innerHTML = `
      <div class="pse-dex-toolbar">
        <input type="text" class="pse-search" placeholder="Search Pokémon..." id="pse-search">
        <select class="pse-select" id="pse-gen-select">
          <option value="all">All generations</option>
          ${genOptions}
        </select>
        <label class="pse-checkbox">
          <input type="checkbox" id="pse-missing-only"> Missing only
        </label>
      </div>
      <div id="pse-dex-groups"></div>
    `;

    const groups = document.getElementById('pse-dex-groups');
    const search = document.getElementById('pse-search');
    const genSelect = document.getElementById('pse-gen-select');
    const missingOnly = document.getElementById('pse-missing-only');

    genSelect.value = localStorage.getItem(prefKey('gen')) || 'all';
    missingOnly.checked = localStorage.getItem(prefKey('missing_only')) === 'true';

    function saveDex(dex) {
      writeJson(view.saveKey, dex);
      renderGroups();
    }

    function renderGroups() {
      const dex = readJson(view.saveKey, {});
      const collapsed = new Set(readJson(prefKey('collapsed_gens'), []));

      const sections = GENERATIONS
        .filter(g => genSelect.value === 'all' || String(g.gen) === genSelect.value)
        .map(g => {
          const all = POKEMON_LIST.filter(p => p.gen === g.gen);
          const shown = all.filter(p =>
            matchesSearch(p, search.value) && !(missingOnly.checked && isCaught(dex, p.id))
          );
          if (shown.length === 0) return '';

          const caughtCount = all.filter(p => isCaught(dex, p.id)).length;
          return `
            <div class="pse-gen-section ${collapsed.has(g.gen) ? 'collapsed' : ''}" data-gen="${g.gen}">
              <div class="pse-gen-header">
                <div class="pse-gen-title">
                  <span class="pse-gen-arrow">▾</span>
                  Gen ${g.gen} - ${g.region}
                  <span class="pse-gen-count">${caughtCount}/${all.length}</span>
                </div>
                <button class="pse-btn pse-btn-secondary pse-btn-sm pse-gen-catch-all">Catch all</button>
                <button class="pse-btn pse-btn-danger pse-btn-sm pse-gen-clear">Clear</button>
              </div>
              <div class="pse-grid">
                ${shown.map(p => `
                  <div class="pse-card ${isCaught(dex, p.id) ? 'owned' : ''}" data-id="${p.id}">
                    <img src="${spriteUrl(p.id, view.shiny)}" alt="${p.name}" loading="lazy">
                    <div class="pse-card-number">${dexNumber(p.id)}</div>
                    <div class="pse-card-name">${p.name}</div>
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        }).join('');

      groups.innerHTML = sections || '<div class="pse-empty">No Pokémon match.</div>';
    }

    groups.addEventListener('click', e => {
      const section = e.target.closest('.pse-gen-section');
      if (!section) return;
      const gen = Number(section.dataset.gen);
      const genIds = POKEMON_LIST.filter(p => p.gen === gen).map(p => p.id);
      const dex = readJson(view.saveKey, {});

      const card = e.target.closest('.pse-card');
      if (card) {
        const id = card.dataset.id;
        if (isCaught(dex, id)) delete dex[id];
        else dex[id] = 1;
        saveDex(dex);
      } else if (e.target.closest('.pse-gen-catch-all')) {
        genIds.forEach(id => { dex[id] = 1; });
        saveDex(dex);
      } else if (e.target.closest('.pse-gen-clear')) {
        if (!confirm(`Remove every Gen ${gen} Pokémon from this list?`)) return;
        genIds.forEach(id => { delete dex[id]; });
        saveDex(dex);
      } else if (e.target.closest('.pse-gen-title')) {
        const collapsed = new Set(readJson(prefKey('collapsed_gens'), []));
        if (collapsed.has(gen)) collapsed.delete(gen);
        else collapsed.add(gen);
        writeJson(prefKey('collapsed_gens'), [...collapsed]);
        section.classList.toggle('collapsed');
      }
    });

    search.addEventListener('input', renderGroups);
    genSelect.addEventListener('change', () => {
      localStorage.setItem(prefKey('gen'), genSelect.value);
      renderGroups();
    });
    missingOnly.addEventListener('change', () => {
      localStorage.setItem(prefKey('missing_only'), missingOnly.checked);
      renderGroups();
    });

    renderGroups();
  }

  // ─── Hall of Fame ────────────────────────────────────────────────────────────
  const MAX_TEAM_SIZE = 6;
  const TOWER_REGIONS = GENERATIONS.slice(0, 5).map(g => g.region);

  // The game trims saved team members to speciesId, level, nickname, isShiny
  // and heldItem, so sprites and names have to come from the species
  const teamSpriteUrl = member => spriteUrl(member.speciesId, member.isShiny);
  const memberTitle = member => `${member.nickname || speciesName(member.speciesId)} Lv.${member.level}`;

  // Item texts contain quotes and ampersands, which would break HTML attributes
  const escapeHtml = text => String(text ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // Prefer the game's current description over the one stored with an older save
  const itemInfo = heldItem => getItemList().find(i => i.id === heldItem.id) || heldItem;

  // Item icon on a team sprite. Hovering it shows the item tooltip
  function heldItemBadge(heldItem) {
    if (!heldItem) return '';
    const item = itemInfo(heldItem);
    return `<span class="pse-item-badge" data-name="${escapeHtml(item.name)}" data-desc="${escapeHtml(item.desc)}">${item.icon}</span>`;
  }

  // One row of the held item picker. Without an item it is the "None" row
  function itemOptionHtml(item) {
    return `
      <button type="button" class="pse-item-option" data-id="${item ? escapeHtml(item.id) : ''}">
        <span class="pse-item-icon">${item ? item.icon : ''}</span>
        <span class="pse-item-text">
          <span class="pse-item-name">${item ? escapeHtml(item.name) : 'None'}</span>
          ${item?.desc ? `<span class="pse-item-desc">${escapeHtml(item.desc)}</span>` : ''}
        </span>
      </button>
    `;
  }

  function teamMemberTile(member, teamIdx) {
    return `
      <div class="pse-team-tile" data-team-idx="${teamIdx}">
        <img src="${teamSpriteUrl(member)}" title="${memberTitle(member)}${member.isShiny ? ' ✨' : ''}">
        ${member.isShiny ? '<div class="pse-shiny-mark">✨</div>' : ''}
        ${heldItemBadge(member.heldItem)}
      </div>
    `;
  }

  const teamTiles = team => team.map(teamMemberTile).join('');

  // One shared tooltip directly in <body>, so the scrolling editor panels cannot clip it.
  // Its texts are page text, so the game's translator turns them into the player's language
  const itemTip = document.createElement('div');
  itemTip.className = 'pse-item-tip';
  itemTip.innerHTML = '<span class="pse-item-name"></span><span class="pse-item-desc"></span>';
  document.body.appendChild(itemTip);

  document.addEventListener('mouseover', e => {
    const badge = e.target.closest?.('.pse-item-badge');
    if (!badge) return;
    itemTip.querySelector('.pse-item-name').textContent = badge.dataset.name;
    itemTip.querySelector('.pse-item-desc').textContent = badge.dataset.desc;
    const rect = badge.getBoundingClientRect();
    itemTip.style.left = `${Math.max(8, Math.min(rect.left - 8, window.innerWidth - 260))}px`;
    // Below the badge, so the Pokémon stays visible. Near the bottom of the screen it
    // goes above, anchored by its bottom edge so a longer translated text grows upwards
    if (rect.bottom < window.innerHeight - 120) {
      itemTip.style.bottom = '';
      itemTip.style.top = `${rect.bottom + 6}px`;
    } else {
      itemTip.style.top = '';
      itemTip.style.bottom = `${window.innerHeight - rect.top + 6}px`;
    }
    itemTip.classList.add('visible');
  });
  document.addEventListener('mouseout', e => {
    if (e.target.closest?.('.pse-item-badge')) itemTip.classList.remove('visible');
  });

  function runModeText(run) {
    const mode = run.endless
      ? `Battle Tower - ${TOWER_REGIONS[(run.stageNumber || 1) - 1] || 'Unknown'}`
      : 'Championship';
    return run.hardMode ? `${mode} (Nuzlocke)` : mode;
  }

  function renderHallOfFame(container) {
    const hof = readJson(HOF_KEY, []);

    container.innerHTML = `
      <button class="pse-btn pse-btn-primary" id="pse-add-hof" style="margin-bottom: 16px;">+ Add New Run</button>
      <div id="pse-hof-list">
        ${hof.map((run, idx) => `
          <div class="pse-hof-item" data-idx="${idx}">
            <div class="pse-hof-header">
              <div class="pse-hof-title">Run #${run.runNumber} - ${run.date} - ${runModeText(run)}</div>
              <button class="pse-btn pse-btn-danger pse-btn-sm pse-hof-delete">Delete</button>
            </div>
            <div class="pse-hof-team">
              ${run.team.map(p => `<span class="pse-hof-mon"><img src="${teamSpriteUrl(p)}" alt="${speciesName(p.speciesId)}" title="${memberTitle(p)}">${heldItemBadge(p.heldItem)}</span>`).join('')}
            </div>
          </div>
        `).reverse().join('')}
      </div>
    `;

    container.querySelector('#pse-add-hof').addEventListener('click', addNewHofRun);
    container.querySelector('#pse-hof-list').addEventListener('click', e => {
      const item = e.target.closest('.pse-hof-item');
      if (!item) return;
      const idx = Number(item.dataset.idx);
      if (e.target.closest('.pse-hof-delete')) deleteHofRun(idx);
      else editHofRun(idx);
    });
  }

  function deleteHofRun(idx) {
    if (!confirm('Are you sure you want to delete this Hall of Fame entry?')) return;
    const hof = readJson(HOF_KEY, []);
    hof.splice(idx, 1);
    writeJson(HOF_KEY, hof);
    // Without an immediate sync, the cloud save brings the deleted run back
    if (typeof syncToCloud === 'function') syncToCloud();
    renderContent();
  }

  function addNewHofRun() {
    const hof = readJson(HOF_KEY, []);
    hof.push({
      runNumber: hof.length + 1,
      hardMode: false,
      endless: false,
      date: new Date().toLocaleDateString(),
      team: [],
    });
    writeJson(HOF_KEY, hof);
    editHofRun(hof.length - 1);
  }

  function editHofRun(idx) {
    const run = readJson(HOF_KEY, [])[idx];

    const modal = openModal(`
      <div class="pse-modal-title">Edit Run #${run.runNumber}</div>
      <div class="pse-field">
        <label class="pse-label">
          <input type="radio" name="pse-mode" value="championship" ${run.endless ? '' : 'checked'}> Championship
        </label>
        <label class="pse-label">
          <input type="radio" name="pse-mode" value="battle-tower" ${run.endless ? 'checked' : ''}> Battle Tower
        </label>
        <div id="pse-region-select" style="margin: 8px 0 0 24px;" ${run.endless ? '' : 'hidden'}>
          <label class="pse-label" for="pse-stage">Region:</label>
          <select class="pse-select" id="pse-stage">
            ${TOWER_REGIONS.map((region, i) => `<option value="${i + 1}" ${run.stageNumber === i + 1 ? 'selected' : ''}>${region}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="pse-field" id="pse-nuzlocke-container" ${run.endless ? 'hidden' : ''}>
        <label class="pse-label">
          <input type="checkbox" id="pse-nuzlocke" ${run.hardMode ? 'checked' : ''}> Nuzlocke Mode
        </label>
      </div>
      <div class="pse-field">
        <div class="pse-label" id="pse-team-count">Team (${run.team.length}/${MAX_TEAM_SIZE})</div>
        <div class="pse-team-list" id="pse-team-list">${teamTiles(run.team)}</div>
        <button class="pse-btn pse-btn-secondary" id="pse-add-team">+ Add Pokémon</button>
      </div>
      <div class="pse-modal-actions">
        <button class="pse-btn pse-btn-secondary" id="pse-cancel">Cancel</button>
        <button class="pse-btn pse-btn-primary" id="pse-save">Save</button>
      </div>
    `);

    const regionSelect = modal.querySelector('#pse-region-select');
    const nuzlockeContainer = modal.querySelector('#pse-nuzlocke-container');
    modal.querySelectorAll('input[name="pse-mode"]').forEach(radio => {
      radio.addEventListener('change', () => {
        const isBattleTower = radio.value === 'battle-tower';
        regionSelect.hidden = !isBattleTower;
        nuzlockeContainer.hidden = isBattleTower;
      });
    });

    modal.querySelector('#pse-team-list').addEventListener('click', e => {
      const tile = e.target.closest('.pse-team-tile');
      if (tile) editTeamMember(idx, Number(tile.dataset.teamIdx));
    });

    modal.querySelector('#pse-add-team').addEventListener('click', () => {
      if (run.team.length >= MAX_TEAM_SIZE) {
        alert(`Team is full (${MAX_TEAM_SIZE}/${MAX_TEAM_SIZE})`);
        return;
      }
      showPokemonPicker(idx);
    });

    modal.querySelector('#pse-cancel').addEventListener('click', () => modal.remove());
    modal.querySelector('#pse-save').addEventListener('click', () => {
      // Team changes are saved on their own while this modal is open, so start from the stored run
      const hof = readJson(HOF_KEY, []);
      const saved = hof[idx];
      saved.endless = modal.querySelector('input[name="pse-mode"]:checked').value === 'battle-tower';
      if (saved.endless) {
        saved.stageNumber = Number(modal.querySelector('#pse-stage').value);
        saved.hardMode = false; // Battle Tower has no Nuzlocke mode
      } else {
        saved.hardMode = modal.querySelector('#pse-nuzlocke').checked;
        delete saved.stageNumber;
      }
      writeJson(HOF_KEY, hof);
      modal.remove();
      renderContent();
    });
  }

  function showPokemonPicker(runIdx) {
    const modal = openModal(`
      <div class="pse-modal-title">Add Pokémon to Team</div>
      <input type="text" class="pse-search" placeholder="Search Pokémon..." id="pse-search-picker">
      <div class="pse-grid" id="pse-picker-grid" style="max-height: 400px; overflow-y: auto;"></div>
    `);
    const grid = modal.querySelector('#pse-picker-grid');

    function renderPicker(query = '') {
      grid.innerHTML = POKEMON_LIST.filter(p => matchesSearch(p, query)).map(p => `
        <div class="pse-card" data-id="${p.id}">
          <img src="${spriteUrl(p.id)}" alt="${p.name}" loading="lazy">
          <div class="pse-card-number">${dexNumber(p.id)}</div>
          <div class="pse-card-name">${p.name}</div>
        </div>
      `).join('');
    }

    grid.addEventListener('click', e => {
      const card = e.target.closest('.pse-card');
      if (!card) return;
      addPokemonToTeam(runIdx, Number(card.dataset.id));
      modal.remove();
    });
    modal.querySelector('#pse-search-picker').addEventListener('input', e => renderPicker(e.target.value));
    renderPicker();
  }

  function addPokemonToTeam(runIdx, speciesId) {
    const hof = readJson(HOF_KEY, []);
    hof[runIdx].team.push({ speciesId, nickname: null, level: 50, isShiny: false, heldItem: null });
    writeJson(HOF_KEY, hof);
    updateTeamList(runIdx);
  }

  // Redraws the team inside the open run modal
  function updateTeamList(runIdx) {
    const teamList = document.getElementById('pse-team-list');
    if (!teamList) return;
    const { team } = readJson(HOF_KEY, [])[runIdx];
    teamList.innerHTML = teamTiles(team);
    document.getElementById('pse-team-count').textContent = `Team (${team.length}/${MAX_TEAM_SIZE})`;
  }

  function editTeamMember(runIdx, teamIdx) {
    const member = readJson(HOF_KEY, [])[runIdx].team[teamIdx];
    const name = speciesName(member.speciesId);
    const items = getItemList();
    // Keep an item the game has since removed selectable, so saving does not drop it
    const itemChoices = member.heldItem && !items.some(i => i.id === member.heldItem.id)
      ? [...items, member.heldItem]
      : items;

    const modal = openModal(`
      <div class="pse-modal-title">Edit ${name}</div>
      <img class="pse-sprite-lg" src="${teamSpriteUrl(member)}">
      <div class="pse-field">
        <label class="pse-label" for="pse-nickname">Nickname (optional)</label>
        <input type="text" class="pse-input" id="pse-nickname" value="${member.nickname || ''}" placeholder="${name}">
      </div>
      <div class="pse-field">
        <label class="pse-label" for="pse-level">Level</label>
        <input type="number" class="pse-input" id="pse-level" value="${member.level}" min="1" max="100">
      </div>
      <div class="pse-field">
        <label class="pse-label">
          <input type="checkbox" id="pse-is-shiny" ${member.isShiny ? 'checked' : ''}> Shiny
        </label>
      </div>
      <div class="pse-field">
        <label class="pse-label" for="pse-held-item">Held Item</label>
        <button type="button" class="pse-item-picker" id="pse-held-item" aria-expanded="false" aria-controls="pse-item-list"></button>
        <div class="pse-item-list" id="pse-item-list" hidden>
          ${[null, ...itemChoices].map(itemOptionHtml).join('')}
        </div>
      </div>
      <div class="pse-modal-actions">
        <button class="pse-btn pse-btn-danger" id="pse-delete-member">Delete</button>
        <button class="pse-btn pse-btn-secondary" id="pse-cancel-member">Cancel</button>
        <button class="pse-btn pse-btn-primary" id="pse-save-member">Save</button>
      </div>
    `);

    let selectedItemId = member.heldItem?.id || '';
    const itemPicker = modal.querySelector('#pse-held-item');
    const itemList = modal.querySelector('#pse-item-list');
    const showSelectedItem = () => {
      const item = itemChoices.find(i => i.id === selectedItemId);
      itemPicker.innerHTML = `
        <span class="pse-item-icon">${item ? item.icon : ''}</span>
        <span class="pse-item-name">${item ? escapeHtml(item.name) : 'None'}</span>
        <span class="pse-item-arrow">▾</span>
      `;
      itemList.querySelectorAll('.pse-item-option').forEach(option => {
        option.classList.toggle('selected', option.dataset.id === selectedItemId);
      });
    };
    const setItemListOpen = open => {
      itemList.hidden = !open;
      itemPicker.setAttribute('aria-expanded', String(open));
      if (!open) return;
      itemList.scrollIntoView({ block: 'nearest' });
      // Center the current item inside the list without scrolling the modal again
      const selected = itemList.querySelector('.selected');
      if (selected) itemList.scrollTop = selected.offsetTop - (itemList.clientHeight - selected.offsetHeight) / 2;
    };
    showSelectedItem();
    itemPicker.addEventListener('click', () => setItemListOpen(itemList.hidden));
    itemList.addEventListener('click', e => {
      const option = e.target.closest('.pse-item-option');
      if (!option) return;
      selectedItemId = option.dataset.id;
      showSelectedItem();
      setItemListOpen(false);
      itemPicker.focus();
    });

    modal.querySelector('#pse-cancel-member').addEventListener('click', () => modal.remove());

    modal.querySelector('#pse-save-member').addEventListener('click', () => {
      const hof = readJson(HOF_KEY, []);
      const saved = hof[runIdx].team[teamIdx];
      saved.nickname = modal.querySelector('#pse-nickname').value.trim() || null;
      saved.level = parseInt(modal.querySelector('#pse-level').value);
      saved.isShiny = modal.querySelector('#pse-is-shiny').checked;

      // An unchanged item stays as saved. A new one is copied whole, because the
      // game draws its icon from fields like iconUrl
      if (!selectedItemId) {
        saved.heldItem = null;
      } else if (selectedItemId !== saved.heldItem?.id) {
        saved.heldItem = { ...itemChoices.find(i => i.id === selectedItemId) };
      }

      writeJson(HOF_KEY, hof);
      modal.remove();
      updateTeamList(runIdx);
    });

    modal.querySelector('#pse-delete-member').addEventListener('click', () => {
      const hof = readJson(HOF_KEY, []);
      hof[runIdx].team.splice(teamIdx, 1);
      writeJson(HOF_KEY, hof);
      modal.remove();
      updateTeamList(runIdx);
    });
  }

  // ─── Stat Buffs ──────────────────────────────────────────────────────────────
  const STATS = ['hp', 'atk', 'special', 'def', 'speed', 'spdef'];
  const STAT_LABELS = { hp: 'HP', atk: 'ATK', special: 'SPA', def: 'DEF', speed: 'SPE', spdef: 'SPD' };
  const MAX_STAT_BUFF = 10;
  const CHEAT_MAX_STAT_BUFF = 999;
  const MAX_BUFF_POINTS = 50;

  // ATK and Special mirror each other in the game, so together they cost one stat's points
  const buffTotal = (buffs = {}) => (buffs.hp || 0) + Math.max(buffs.atk || 0, buffs.special || 0)
    + (buffs.def || 0) + (buffs.speed || 0) + (buffs.spdef || 0);

  function renderStatBuffs(container) {
    const statBuffs = readJson(BUFFS_KEY, {});
    const hideLegendaries = localStorage.getItem('pse_filter_legendaries') === 'true';

    // Buffs count for a whole evolution line, so each line shows up once, as its base
    // form. The value is true when any member of the line was shiny
    const lines = new Map();
    for (const run of readJson(HOF_KEY, [])) {
      for (const member of run.team || []) {
        const baseId = getEvoLineRoot(member.speciesId);
        if (hideLegendaries && LEGENDARY_ID_SET.has(baseId)) continue;
        lines.set(baseId, lines.get(baseId) || Boolean(member.isShiny));
      }
    }
    const ids = [...lines.keys()];
    const buffedFirst = [...ids.filter(id => statBuffs[id]), ...ids.filter(id => !statBuffs[id])];

    const cards = buffedFirst.map(id => {
      const shiny = lines.get(id);
      const total = buffTotal(statBuffs[id]);
      return `
        <div class="pse-card ${statBuffs[id] ? 'owned' : ''}" data-id="${id}">
          <img src="${spriteUrl(id, shiny)}" alt="${speciesName(id)}">
          <div class="pse-card-number">${dexNumber(id)}</div>
          <div class="pse-card-name">${shiny ? '✨ ' : ''}${speciesName(id)}</div>
          ${total > 0 ? `<div class="pse-buff-points">${total} buff points</div>` : ''}
        </div>
      `;
    }).join('');
    const emptyMessage = hideLegendaries
      ? 'No non-legendary Pokémon in Hall of Fame. Uncheck "Battle Tower only" to see all Pokémon.'
      : 'No Pokémon in Hall of Fame yet. Complete a run to see Pokémon here.';

    container.innerHTML = `
      <div class="pse-info-box">
        <div class="pse-info-header">
          <div>
            <div style="font-size: 13px; color: rgba(235, 235, 245, 0.8);">Showing base forms of Pokémon from Hall of Fame</div>
            <div class="pse-hint">Click any Pokémon to edit their stat buffs (buffs apply to entire evolution line)</div>
          </div>
          <label class="pse-checkbox">
            <input type="checkbox" id="pse-filter-legendaries" ${hideLegendaries ? 'checked' : ''}> Battle Tower only
          </label>
        </div>
      </div>
      <div class="pse-grid" id="pse-buff-grid">
        ${cards || `<div class="pse-empty">${emptyMessage}</div>`}
      </div>
    `;

    container.querySelector('#pse-filter-legendaries').addEventListener('change', e => {
      localStorage.setItem('pse_filter_legendaries', e.target.checked);
      renderContent();
    });
    container.querySelector('#pse-buff-grid').addEventListener('click', e => {
      const card = e.target.closest('.pse-card');
      if (card) editStatBuffs(Number(card.dataset.id));
    });
  }

  // The attack stat a Pokémon does not use, judged from the base stats the game
  // caches under pkrl_poke_<id>. Null when nothing is cached: then both stay visible
  function unusedAttackStat(pokemonId) {
    const stats = readJson(`pkrl_poke_${pokemonId}`, null)?.baseStats;
    if (stats?.atk === undefined || stats.special === undefined) return null;
    return stats.special >= stats.atk ? 'atk' : 'special';
  }

  function highestClearedStage() {
    return readJson(HOF_KEY, [])
      .filter(run => run.endless && run.stageNumber)
      .reduce((max, run) => Math.max(max, run.stageNumber), 0);
  }

  function editStatBuffs(pokemonId) {
    const statBuffs = readJson(BUFFS_KEY, {});
    const hiddenStat = unusedAttackStat(pokemonId);
    const visibleStats = STATS.filter(stat => stat !== hiddenStat);
    // 10 points to start, plus 10 for every cleared Battle Tower stage
    const nextStage = highestClearedStage() + 1;
    const pointCap = Math.min(nextStage * 10, MAX_BUFF_POINTS);
    // Saving mirrors ATK and Special, so the hidden one only has to stay out of the total
    const values = { hp: 0, atk: 0, special: 0, def: 0, speed: 0, spdef: 0, ...statBuffs[pokemonId] };
    if (hiddenStat) values[hiddenStat] = 0;

    const modal = openModal(`
      <div class="pse-modal-title">Stat Buffs - ${speciesName(pokemonId)}</div>
      <img class="pse-sprite-lg" src="${spriteUrl(pokemonId)}">
      <div class="pse-info-box">
        <div class="pse-info-header">
          <div class="pse-buff-used"><span id="pse-buff-total"></span><span id="pse-buff-cap"></span> points used</div>
          <label class="pse-checkbox pse-checkbox-danger">
            <input type="checkbox" id="pse-cheat-mode-toggle" ${localStorage.getItem('pse_cheat_mode') === 'true' ? 'checked' : ''}> Cheat Mode
          </label>
        </div>
        <div class="pse-hint">Each stat: 0-10 buffs (+10% per buff)</div>
        <div class="pse-hint">${hiddenStat ? `This Pokémon is a ${hiddenStat === 'atk' ? 'Special' : 'Physical'} attacker` : 'ATK and Special mirror each other'}</div>
        <div class="pse-hint pse-hint-warn" id="pse-buff-stage-hint">Complete Stage ${nextStage} to unlock more points (max ${MAX_BUFF_POINTS})</div>
        <div class="pse-hint pse-hint-danger" id="pse-buff-cheat-hint">⚠️ All caps removed</div>
      </div>
      ${visibleStats.map(stat => `
        <div class="pse-field">
          <label class="pse-label" for="pse-buff-${stat}" id="pse-buff-${stat}-label"></label>
          <div class="pse-buff-row">
            <input type="range" id="pse-buff-${stat}" data-stat="${stat}" min="0">
            <input type="number" class="pse-input" id="pse-buff-${stat}-num" data-stat="${stat}" min="0">
          </div>
        </div>
      `).join('')}
      <div class="pse-modal-actions">
        <button class="pse-btn pse-btn-danger" id="pse-delete-buffs">Delete</button>
        <button class="pse-btn pse-btn-secondary" id="pse-cancel-buffs">Cancel</button>
        <button class="pse-btn pse-btn-primary" id="pse-save-buffs">Save</button>
      </div>
    `);

    const cheatToggle = modal.querySelector('#pse-cheat-mode-toggle');
    const totalDisplay = modal.querySelector('#pse-buff-total');
    const statMax = () => (cheatToggle.checked ? CHEAT_MAX_STAT_BUFF : MAX_STAT_BUFF);

    function showStat(stat) {
      const value = values[stat];
      modal.querySelector(`#pse-buff-${stat}`).value = value;
      modal.querySelector(`#pse-buff-${stat}-num`).value = value;
      modal.querySelector(`#pse-buff-${stat}-label`).textContent =
        `${STAT_LABELS[stat]} (${value}/${cheatToggle.checked ? '∞' : MAX_STAT_BUFF}) - +${value * 10}%`;
    }

    function showTotal() {
      const total = buffTotal(values);
      const capped = !cheatToggle.checked;
      totalDisplay.textContent = total;
      totalDisplay.classList.toggle('full', capped && total === pointCap);
      totalDisplay.classList.toggle('over', capped && total > pointCap);
    }

    function showMode() {
      const cheat = cheatToggle.checked;
      modal.querySelector('#pse-buff-cap').textContent = cheat ? '' : ` / ${pointCap}`;
      modal.querySelector('#pse-buff-stage-hint').hidden = cheat || pointCap >= MAX_BUFF_POINTS;
      modal.querySelector('#pse-buff-cheat-hint').hidden = !cheat;
      for (const stat of visibleStats) {
        modal.querySelector(`#pse-buff-${stat}`).max = statMax();
        modal.querySelector(`#pse-buff-${stat}-num`).max = statMax();
        values[stat] = Math.min(values[stat], statMax());
        showStat(stat);
      }
      showTotal();
    }

    // Raising a stat stops at the point cap, lowering it always works
    function setStat(stat, requested) {
      let value = Math.max(0, Math.min(statMax(), requested || 0));
      if (!cheatToggle.checked) {
        while (value > values[stat] && buffTotal({ ...values, [stat]: value }) > pointCap) value--;
      }
      values[stat] = value;
      showStat(stat);
      showTotal();
    }

    modal.addEventListener('input', e => {
      const { stat } = e.target.dataset;
      if (stat) setStat(stat, parseInt(e.target.value));
    });
    cheatToggle.addEventListener('change', () => {
      localStorage.setItem('pse_cheat_mode', cheatToggle.checked);
      showMode();
    });

    modal.querySelector('#pse-cancel-buffs').addEventListener('click', () => modal.remove());

    modal.querySelector('#pse-save-buffs').addEventListener('click', () => {
      const total = buffTotal(values);
      if (!cheatToggle.checked && total > pointCap) {
        alert(`Total buff points (${total}) exceeds your cap (${pointCap}). Complete more Battle Tower stages to increase your cap, or enable Cheat Mode.`);
        return;
      }
      const attack = Math.max(values.atk, values.special);
      statBuffs[pokemonId] = {
        hp: values.hp, atk: attack, def: values.def, speed: values.speed, special: attack, spdef: values.spdef,
      };
      writeJson(BUFFS_KEY, statBuffs);
      modal.remove();
      renderContent();
    });

    modal.querySelector('#pse-delete-buffs').addEventListener('click', () => {
      delete statBuffs[pokemonId];
      writeJson(BUFFS_KEY, statBuffs);
      modal.remove();
      renderContent();
    });

    showMode();
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

  // Copy of the game's achievements, used when its own list is not reachable
  const BUILTIN_ACHIEVEMENTS = [
    { id: 'gym_0', name: 'Boulder Basher', desc: 'Clear Map 1 and defeat Brock', icon: '🪨', category: 'normal' },
    { id: 'gym_1', name: 'Cascade Crusher', desc: 'Clear Map 2 and defeat Misty', icon: '💧', category: 'normal' },
    { id: 'gym_2', name: 'Thunder Tamer', desc: 'Clear Map 3 and defeat Lt. Surge', icon: '⚡', category: 'normal' },
    { id: 'gym_3', name: 'Rainbow Ranger', desc: 'Clear Map 4 and defeat Erika', icon: '🌿', category: 'normal' },
    { id: 'gym_4', name: 'Soul Crusher', desc: 'Clear Map 5 and defeat Koga', icon: '💜', category: 'normal' },
    { id: 'gym_5', name: 'Mind Breaker', desc: 'Clear Map 6 and defeat Sabrina', icon: '🔮', category: 'normal' },
    { id: 'gym_6', name: 'Volcano Victor', desc: 'Clear Map 7 and defeat Blaine', icon: '🌋', category: 'normal' },
    { id: 'gym_7', name: 'Earth Shaker', desc: 'Clear Map 8 and defeat Giovanni', icon: '🌍', category: 'normal' },
    { id: 'elite_four', name: 'Pokemon Master', desc: 'Defeat all 4 Elite Four members and the Champion to beat the game', icon: '👑', category: 'normal' },
    { id: 'elite_10', name: 'Champion League', desc: 'Beat the game 10 times total', icon: '🏆', category: 'normal' },
    { id: 'elite_100', name: 'Immortal Champion', desc: 'Beat the game 100 times total', icon: '💎', category: 'normal' },
    { id: 'starter_1', name: 'Grass Champion', desc: 'Choose Bulbasaur as your starter and beat the game', icon: '🌱', category: 'normal' },
    { id: 'starter_4', name: 'Fire Champion', desc: 'Choose Charmander as your starter and beat the game', icon: '🔥', category: 'normal' },
    { id: 'starter_7', name: 'Water Champion', desc: 'Choose Squirtle as your starter and beat the game', icon: '🌊', category: 'normal' },
    { id: 'solo_run', name: 'One is Enough', desc: 'Beat the game while keeping only 1 Pokémon on your team', icon: '⭐', category: 'normal' },
    { id: 'nuzlocke_win', name: 'True Master', desc: 'Beat the game in Nuzlocke Mode — every faint is permanent. No second chances.', icon: '☠️', category: 'normal' },
    { id: 'three_birds', name: 'Bird Keeper', desc: 'Beat the game with Articuno, Zapdos, and Moltres all on your team', icon: '🦅', category: 'normal' },
    { id: 'no_pokecenter', name: 'No Rest for the Wicked', desc: 'Beat the game without stopping at a Pokémon Center', icon: '🏃', category: 'normal' },
    { id: 'no_items', name: 'Minimalist', desc: 'Beat the game without picking up a single item', icon: '🎒', category: 'normal' },
    { id: 'type_quartet', name: 'Type Supremacy', desc: 'Beat the game with at least 4 of your 6 Pokémon sharing the same type', icon: '🔣', category: 'normal' },
    { id: 'all_shiny_win', name: 'Shiny Squad', desc: 'Beat the game with every Pokémon on your team being shiny (minimum 3)', icon: '💫', category: 'normal' },
    { id: 'back_to_back', name: 'On a Roll', desc: 'Beat the game twice in a row without losing a run in between', icon: '🔁', category: 'normal' },
    { id: 'back_3_back', name: 'Hat Trick', desc: 'Beat the game three times in a row without losing a run in between', icon: '🎩', category: 'normal' },
    { id: 'endless_stage_1', name: 'Kanto Champion', desc: 'Defeat Ash Ketchum and clear Stage 1 of Battle Tower', icon: '🌀', category: 'tower' },
    { id: 'endless_stage_2', name: 'Johto Champion', desc: 'Defeat Lance and clear Stage 2 of Battle Tower', icon: '🌊', category: 'tower' },
    { id: 'endless_stage_3', name: 'Hoenn Champion', desc: 'Defeat Steven Stone and clear Stage 3 of Battle Tower', icon: '⚔️', category: 'tower' },
    { id: 'endless_stage_4', name: 'Sinnoh Champion', desc: 'Defeat Cynthia and clear Stage 4 of Battle Tower', icon: '💎', category: 'tower' },
    { id: 'endless_stage_5', name: 'Unova Champion', desc: 'Defeat N and clear Stage 5 of Battle Tower', icon: '🏅', category: 'tower' },
    { id: 'endless_stage_6', name: 'Kalos Champion', desc: 'Defeat Diantha and clear Stage 6 of Battle Tower', icon: '🌟', category: 'tower' },
    { id: 'starters_stage_1', name: 'Oak\'s Challenge', desc: 'Win a Stage 1 run starting with Bulbasaur, Charmander, or Squirtle', icon: '🌿', category: 'tower' },
    { id: 'starters_stage_2', name: 'Elm\'s Challenge', desc: 'Win a Stage 2 run starting with Chikorita, Cyndaquil, or Totodile', icon: '🍃', category: 'tower' },
    { id: 'starters_stage_3', name: 'Birch\'s Challenge', desc: 'Win a Stage 3 run starting with Treecko, Torchic, or Mudkip', icon: '🌊', category: 'tower' },
    { id: 'starters_stage_4', name: 'Rowan\'s Challenge', desc: 'Win a Stage 4 run starting with Turtwig, Chimchar, or Piplup', icon: '⛰️', category: 'tower' },
    { id: 'starters_stage_5', name: 'Juniper\'s Challenge', desc: 'Win a Stage 5 run starting with Snivy, Tepig, or Oshawott', icon: '🌀', category: 'tower' },
    { id: 'pokedex_complete', name: 'Gotta Catch \'Em All', desc: 'Catch all Gen 1 Pokémon across any number of runs', icon: '📖', category: 'general' },
    { id: 'shinydex_complete', name: 'Shiny Hunter', desc: 'Catch a shiny version of every Gen 1 Pokémon', icon: '✨', category: 'general' },
    { id: 'shinydex_all', name: 'Ultimate Shiny Hunter', desc: 'Catch a shiny version of every Pokémon across all gens', icon: '🌟', category: 'general' },
    { id: 'pokedex_gen2', name: 'Johto Completionist', desc: 'Catch all Gen 2 Pokémon across any number of runs', icon: '📗', category: 'general' },
    { id: 'pokedex_gen3', name: 'Hoenn Completionist', desc: 'Catch all Gen 3 Pokémon across any number of runs', icon: '📘', category: 'general' },
    { id: 'pokedex_gen4', name: 'Sinnoh Completionist', desc: 'Catch all Gen 4 Pokémon across any number of runs', icon: '📙', category: 'general' },
    { id: 'pokedex_gen5', name: 'Unova Completionist', desc: 'Catch all Gen 5 Pokémon across any number of runs', icon: '📕', category: 'general' },
    { id: 'pokedex_gen6', name: 'Kalos Completionist', desc: 'Catch all Gen 6 Pokémon across any number of runs', icon: '📔', category: 'general' },
    { id: 'pokedex_gen7', name: 'Alola Completionist', desc: 'Catch all Gen 7 Pokémon across any number of runs', icon: '📔', category: 'general' },
    { id: 'max_stats_1', name: 'First Peak', desc: 'Max out 1 stat on a single Pokémon', icon: '📈', category: 'general' },
    { id: 'max_stats_2', name: 'Double Peak', desc: 'Max out 2 stats on a single Pokémon', icon: '📊', category: 'general' },
    { id: 'max_stats_3', name: 'Triple Peak', desc: 'Max out 3 stats on a single Pokémon', icon: '🔝', category: 'general' },
    { id: 'max_stats_4', name: 'Quad Peak', desc: 'Max out 4 stats on a single Pokémon', icon: '💪', category: 'general' },
    { id: 'max_stats_all', name: 'Perfect Specimen', desc: 'Max out all 5 stats on a single Pokémon', icon: '🏅', category: 'general' },
    { id: 'shinydex_100', name: 'Shiny Spark', desc: 'Catch 100 different shiny Pokémon', icon: '⭐', category: 'general' },
    { id: 'shinydex_200', name: 'Shiny Flash', desc: 'Catch 200 different shiny Pokémon', icon: '💥', category: 'general' },
    { id: 'shinydex_300', name: 'Shiny Blaze', desc: 'Catch 300 different shiny Pokémon', icon: '🔥', category: 'general' },
    { id: 'shinydex_400', name: 'Shiny Storm', desc: 'Catch 400 different shiny Pokémon', icon: '⚡', category: 'general' },
    { id: 'shinydex_500', name: 'Shiny Legend', desc: 'Catch 500 different shiny Pokémon', icon: '💎', category: 'general' },
    { id: 'shinydex_600', name: 'Shiny Immortal', desc: 'Catch 600 different shiny Pokémon', icon: '👑', category: 'general' },
    { id: 'g1_nuz_grass', name: 'Kanto Survivor: Grass', desc: 'Beat a Gen 1 Nuzlocke run with Bulbasaur as your starter', icon: '🌱', category: 'gen1_nuz' },
    { id: 'g1_nuz_fire', name: 'Kanto Survivor: Fire', desc: 'Beat a Gen 1 Nuzlocke run with Charmander as your starter', icon: '🔥', category: 'gen1_nuz' },
    { id: 'g1_nuz_water', name: 'Kanto Survivor: Water', desc: 'Beat a Gen 1 Nuzlocke run with Squirtle as your starter', icon: '🌊', category: 'gen1_nuz' },
    { id: 'g1_nuz_clear', name: 'Kanto Nuzlocke', desc: 'Beat a Gen 1 Nuzlocke run', icon: '☠️', category: 'gen1_nuz' },
    { id: 'g1_nuz_nocenter', name: 'Kanto Nuzlocke Ironman', desc: 'Beat a Gen 1 Nuzlocke run without using a Pokémon Center', icon: '🏃', category: 'gen1_nuz' },
    { id: 'g1_monotype', name: 'Kanto Type Master', desc: 'Beat Gen 1 with a team that all shares a single type', icon: '🔣', category: 'gen1_chal' },
    { id: 'g1_shiny_squad', name: 'Kanto Shiny Squad', desc: 'Beat Gen 1 with every Pokémon on your team shiny', icon: '💫', category: 'gen1_chal' },
    { id: 'g1_single_stage', name: 'Kanto Purist', desc: 'Beat Gen 1 with a team of Pokémon that never evolve', icon: '🥚', category: 'gen1_chal' },
    { id: 'g2_grass', name: 'Johto Grass Champion', desc: 'Beat Gen 2 with Chikorita as your starter', icon: '🌱', category: 'gen2_norm' },
    { id: 'g2_fire', name: 'Johto Fire Champion', desc: 'Beat Gen 2 with Cyndaquil as your starter', icon: '🔥', category: 'gen2_norm' },
    { id: 'g2_water', name: 'Johto Water Champion', desc: 'Beat Gen 2 with Totodile as your starter', icon: '🌊', category: 'gen2_norm' },
    { id: 'g2_gym_0', name: 'Zephyr Silencer', desc: 'Clear Map 1 and defeat Falkner', icon: '🦅', category: 'gen2_norm' },
    { id: 'g2_gym_1', name: 'Hive Smasher', desc: 'Clear Map 2 and defeat Bugsy', icon: '🐛', category: 'gen2_norm' },
    { id: 'g2_gym_2', name: 'Plain Pounder', desc: 'Clear Map 3 and defeat Whitney', icon: '⚪', category: 'gen2_norm' },
    { id: 'g2_gym_3', name: 'Fog Buster', desc: 'Clear Map 4 and defeat Morty', icon: '👻', category: 'gen2_norm' },
    { id: 'g2_gym_4', name: 'Storm Smasher', desc: 'Clear Map 5 and defeat Chuck', icon: '🥊', category: 'gen2_norm' },
    { id: 'g2_gym_5', name: 'Mineral Crusher', desc: 'Clear Map 6 and defeat Jasmine', icon: '⚙️', category: 'gen2_norm' },
    { id: 'g2_gym_6', name: 'Glacier Breaker', desc: 'Clear Map 7 and defeat Pryce', icon: '❄️', category: 'gen2_norm' },
    { id: 'g2_gym_7', name: 'Rising Tamer', desc: 'Clear Map 8 and defeat Clair', icon: '🐉', category: 'gen2_norm' },
    { id: 'g2_nuz_grass', name: 'Johto Survivor: Grass', desc: 'Beat a Gen 2 Nuzlocke run with Chikorita as your starter', icon: '🌱', category: 'gen2_nuz' },
    { id: 'g2_nuz_fire', name: 'Johto Survivor: Fire', desc: 'Beat a Gen 2 Nuzlocke run with Cyndaquil as your starter', icon: '🔥', category: 'gen2_nuz' },
    { id: 'g2_nuz_water', name: 'Johto Survivor: Water', desc: 'Beat a Gen 2 Nuzlocke run with Totodile as your starter', icon: '🌊', category: 'gen2_nuz' },
    { id: 'g2_nuz_clear', name: 'Johto Nuzlocke', desc: 'Beat a Gen 2 Nuzlocke run', icon: '☠️', category: 'gen2_nuz' },
    { id: 'g2_nocenter', name: 'Johto Ironman', desc: 'Beat Gen 2 without using a Pokémon Center (any mode)', icon: '🏃', category: 'gen2_chal' },
    { id: 'g2_norival', name: 'Lone Survivor', desc: 'Beat Gen 2 without ever defeating your rival (any mode)', icon: '🚫', category: 'gen2_chal' },
    { id: 'g2_monotype', name: 'Johto Type Master', desc: 'Beat Gen 2 with a team that all shares a single type', icon: '🔣', category: 'gen2_chal' },
    { id: 'g2_shiny_squad', name: 'Johto Shiny Squad', desc: 'Beat Gen 2 with every Pokémon on your team shiny', icon: '💫', category: 'gen2_chal' },
    { id: 'g2_single_stage', name: 'Johto Purist', desc: 'Beat Gen 2 with a team of Pokémon that never evolve', icon: '🥚', category: 'gen2_chal' },
    { id: 'g2_no_gen2', name: 'Time Traveler', desc: 'Beat the Gen 2 Elite Four without a Gen 2 Pokémon on your team', icon: '🧭', category: 'gen2_chal' },
    { id: 'g3_grass', name: 'Hoenn Grass Champion', desc: 'Beat Gen 3 with Treecko as your starter', icon: '🌱', category: 'gen3_norm' },
    { id: 'g3_fire', name: 'Hoenn Fire Champion', desc: 'Beat Gen 3 with Torchic as your starter', icon: '🔥', category: 'gen3_norm' },
    { id: 'g3_water', name: 'Hoenn Water Champion', desc: 'Beat Gen 3 with Mudkip as your starter', icon: '🌊', category: 'gen3_norm' },
    { id: 'g3_gym_0', name: 'Stone Splitter', desc: 'Clear Map 1 and defeat Roxanne', icon: '🪨', category: 'gen3_norm' },
    { id: 'g3_gym_1', name: 'Knuckle Buster', desc: 'Clear Map 2 and defeat Brawly', icon: '🥊', category: 'gen3_norm' },
    { id: 'g3_gym_2', name: 'Dynamo Disruptor', desc: 'Clear Map 3 and defeat Wattson', icon: '⚡', category: 'gen3_norm' },
    { id: 'g3_gym_3', name: 'Heat Handler', desc: 'Clear Map 4 and defeat Flannery', icon: '🌋', category: 'gen3_norm' },
    { id: 'g3_gym_4', name: 'Balance Breaker', desc: 'Clear Map 5 and defeat Norman', icon: '⚪', category: 'gen3_norm' },
    { id: 'g3_gym_5', name: 'Feather Fighter', desc: 'Clear Map 6 and defeat Winona', icon: '🦅', category: 'gen3_norm' },
    { id: 'g3_gym_6', name: 'Mind Bender', desc: 'Clear Map 7 and defeat Tate & Liza', icon: '🔮', category: 'gen3_norm' },
    { id: 'g3_gym_7', name: 'Rain Ruler', desc: 'Clear Map 8 and defeat Wallace', icon: '🌊', category: 'gen3_norm' },
    { id: 'g3_nuz_grass', name: 'Hoenn Survivor: Grass', desc: 'Beat a Gen 3 Nuzlocke run with Treecko as your starter', icon: '🌱', category: 'gen3_nuz' },
    { id: 'g3_nuz_fire', name: 'Hoenn Survivor: Fire', desc: 'Beat a Gen 3 Nuzlocke run with Torchic as your starter', icon: '🔥', category: 'gen3_nuz' },
    { id: 'g3_nuz_water', name: 'Hoenn Survivor: Water', desc: 'Beat a Gen 3 Nuzlocke run with Mudkip as your starter', icon: '🌊', category: 'gen3_nuz' },
    { id: 'g3_nuz_clear', name: 'Hoenn Nuzlocke', desc: 'Beat a Gen 3 Nuzlocke run', icon: '☠️', category: 'gen3_nuz' },
    { id: 'g4_grass', name: 'Sinnoh Grass Champion', desc: 'Beat Gen 4 with Turtwig as your starter', icon: '🌱', category: 'gen4_norm' },
    { id: 'g4_fire', name: 'Sinnoh Fire Champion', desc: 'Beat Gen 4 with Chimchar as your starter', icon: '🔥', category: 'gen4_norm' },
    { id: 'g4_water', name: 'Sinnoh Water Champion', desc: 'Beat Gen 4 with Piplup as your starter', icon: '🌊', category: 'gen4_norm' },
    { id: 'g4_gym_0', name: 'Coal Crusher', desc: 'Clear Map 1 and defeat Roark', icon: '🪨', category: 'gen4_norm' },
    { id: 'g4_gym_1', name: 'Forest Fighter', desc: 'Clear Map 2 and defeat Gardenia', icon: '🌿', category: 'gen4_norm' },
    { id: 'g4_gym_2', name: 'Cobble Crusher', desc: 'Clear Map 3 and defeat Maylene', icon: '🥊', category: 'gen4_norm' },
    { id: 'g4_gym_3', name: 'Fen Fighter', desc: 'Clear Map 4 and defeat Crasher Wake', icon: '🌊', category: 'gen4_norm' },
    { id: 'g4_gym_4', name: 'Relic Raider', desc: 'Clear Map 5 and defeat Fantina', icon: '👻', category: 'gen4_norm' },
    { id: 'g4_gym_5', name: 'Mine Master', desc: 'Clear Map 6 and defeat Byron', icon: '⚙️', category: 'gen4_norm' },
    { id: 'g4_gym_6', name: 'Icicle Breaker', desc: 'Clear Map 7 and defeat Candice', icon: '❄️', category: 'gen4_norm' },
    { id: 'g4_gym_7', name: 'Beacon Breaker', desc: 'Clear Map 8 and defeat Volkner', icon: '⚡', category: 'gen4_norm' },
    { id: 'g4_nuz_grass', name: 'Sinnoh Survivor: Grass', desc: 'Beat a Gen 4 Nuzlocke run with Turtwig as your starter', icon: '🌱', category: 'gen4_nuz' },
    { id: 'g4_nuz_fire', name: 'Sinnoh Survivor: Fire', desc: 'Beat a Gen 4 Nuzlocke run with Chimchar as your starter', icon: '🔥', category: 'gen4_nuz' },
    { id: 'g4_nuz_water', name: 'Sinnoh Survivor: Water', desc: 'Beat a Gen 4 Nuzlocke run with Piplup as your starter', icon: '🌊', category: 'gen4_nuz' },
    { id: 'g4_nuz_clear', name: 'Sinnoh Nuzlocke', desc: 'Beat a Gen 4 Nuzlocke run', icon: '☠️', category: 'gen4_nuz' },
    { id: 'g5_grass', name: 'Unova Grass Champion', desc: 'Beat Gen 5 with Snivy as your starter', icon: '🌱', category: 'gen5_norm' },
    { id: 'g5_fire', name: 'Unova Fire Champion', desc: 'Beat Gen 5 with Tepig as your starter', icon: '🔥', category: 'gen5_norm' },
    { id: 'g5_water', name: 'Unova Water Champion', desc: 'Beat Gen 5 with Oshawott as your starter', icon: '🌊', category: 'gen5_norm' },
    { id: 'g5_gym_0', name: 'Trio Tamer', desc: 'Clear Map 1 and defeat Chili', icon: '🎯', category: 'gen5_norm' },
    { id: 'g5_gym_1', name: 'Basic Buster', desc: 'Clear Map 2 and defeat Lenora', icon: '⚪', category: 'gen5_norm' },
    { id: 'g5_gym_2', name: 'Insect Slayer', desc: 'Clear Map 3 and defeat Burgh', icon: '🐛', category: 'gen5_norm' },
    { id: 'g5_gym_3', name: 'Bolt Breaker', desc: 'Clear Map 4 and defeat Elesa', icon: '⚡', category: 'gen5_norm' },
    { id: 'g5_gym_4', name: 'Quake Queller', desc: 'Clear Map 5 and defeat Clay', icon: '🌍', category: 'gen5_norm' },
    { id: 'g5_gym_5', name: 'Jet Fighter', desc: 'Clear Map 6 and defeat Skyla', icon: '🦅', category: 'gen5_norm' },
    { id: 'g5_gym_6', name: 'Freeze Fighter', desc: 'Clear Map 7 and defeat Brycen', icon: '❄️', category: 'gen5_norm' },
    { id: 'g5_gym_7', name: 'Legend Slayer', desc: 'Clear Map 8 and defeat Drayden', icon: '🐉', category: 'gen5_norm' },
    { id: 'g5_nuz_grass', name: 'Unova Survivor: Grass', desc: 'Beat a Gen 5 Nuzlocke run with Snivy as your starter', icon: '🌱', category: 'gen5_nuz' },
    { id: 'g5_nuz_fire', name: 'Unova Survivor: Fire', desc: 'Beat a Gen 5 Nuzlocke run with Tepig as your starter', icon: '🔥', category: 'gen5_nuz' },
    { id: 'g5_nuz_water', name: 'Unova Survivor: Water', desc: 'Beat a Gen 5 Nuzlocke run with Oshawott as your starter', icon: '🌊', category: 'gen5_nuz' },
    { id: 'g5_nuz_clear', name: 'Unova Nuzlocke', desc: 'Beat a Gen 5 Nuzlocke run', icon: '☠️', category: 'gen5_nuz' },
    { id: 'g6_grass', name: 'Kalos Grass Champion', desc: 'Beat Gen 6 with Chespin as your starter', icon: '🌱', category: 'gen6_norm' },
    { id: 'g6_fire', name: 'Kalos Fire Champion', desc: 'Beat Gen 6 with Fennekin as your starter', icon: '🔥', category: 'gen6_norm' },
    { id: 'g6_water', name: 'Kalos Water Champion', desc: 'Beat Gen 6 with Froakie as your starter', icon: '🌊', category: 'gen6_norm' },
    { id: 'g6_gym_0', name: 'Bug Buster', desc: 'Clear Map 1 and defeat Viola', icon: '🐛', category: 'gen6_norm' },
    { id: 'g6_gym_1', name: 'Cliff Climber', desc: 'Clear Map 2 and defeat Grant', icon: '🪨', category: 'gen6_norm' },
    { id: 'g6_gym_2', name: 'Rumble Ruler', desc: 'Clear Map 3 and defeat Korrina', icon: '🥊', category: 'gen6_norm' },
    { id: 'g6_gym_3', name: 'Plant Pruner', desc: 'Clear Map 4 and defeat Ramos', icon: '🌿', category: 'gen6_norm' },
    { id: 'g6_gym_4', name: 'Voltage Victor', desc: 'Clear Map 5 and defeat Clemont', icon: '⚡', category: 'gen6_norm' },
    { id: 'g6_gym_5', name: 'Fairy Fighter', desc: 'Clear Map 6 and defeat Valerie', icon: '🧚', category: 'gen6_norm' },
    { id: 'g6_gym_6', name: 'Psychic Puzzler', desc: 'Clear Map 7 and defeat Olympia', icon: '🔮', category: 'gen6_norm' },
    { id: 'g6_gym_7', name: 'Iceberg Crusher', desc: 'Clear Map 8 and defeat Wulfric', icon: '❄️', category: 'gen6_norm' },
    { id: 'g6_nuz_grass', name: 'Kalos Survivor: Grass', desc: 'Beat a Gen 6 Nuzlocke run with Chespin as your starter', icon: '🌱', category: 'gen6_nuz' },
    { id: 'g6_nuz_fire', name: 'Kalos Survivor: Fire', desc: 'Beat a Gen 6 Nuzlocke run with Fennekin as your starter', icon: '🔥', category: 'gen6_nuz' },
    { id: 'g6_nuz_water', name: 'Kalos Survivor: Water', desc: 'Beat a Gen 6 Nuzlocke run with Froakie as your starter', icon: '🌊', category: 'gen6_nuz' },
    { id: 'g6_nuz_clear', name: 'Kalos Nuzlocke', desc: 'Beat a Gen 6 Nuzlocke run', icon: '☠️', category: 'gen6_nuz' },
    { id: 'g7_grass', name: 'Alola Grass Champion', desc: 'Beat Gen 7 with Rowlet as your starter', icon: '🌱', category: 'gen7_norm' },
    { id: 'g7_fire', name: 'Alola Fire Champion', desc: 'Beat Gen 7 with Litten as your starter', icon: '🔥', category: 'gen7_norm' },
    { id: 'g7_water', name: 'Alola Water Champion', desc: 'Beat Gen 7 with Popplio as your starter', icon: '🌊', category: 'gen7_norm' },
    { id: 'g7_gym_0', name: 'Trial Rookie', desc: 'Clear Map 1 and defeat Ilima', icon: '⚪', category: 'gen7_norm' },
    { id: 'g7_gym_1', name: 'Wave Rider', desc: 'Clear Map 2 and defeat Lana', icon: '🌊', category: 'gen7_norm' },
    { id: 'g7_gym_2', name: 'Ember Dancer', desc: 'Clear Map 3 and defeat Kiawe', icon: '🌋', category: 'gen7_norm' },
    { id: 'g7_gym_3', name: 'Jungle Forager', desc: 'Clear Map 4 and defeat Mallow', icon: '🌿', category: 'gen7_norm' },
    { id: 'g7_gym_4', name: 'Circuit Breaker', desc: 'Clear Map 5 and defeat Sophocles', icon: '⚡', category: 'gen7_norm' },
    { id: 'g7_gym_5', name: 'Shadow Stalker', desc: 'Clear Map 6 and defeat Nanu', icon: '🌙', category: 'gen7_norm' },
    { id: 'g7_gym_6', name: 'Enchanted Brush', desc: 'Clear Map 7 and defeat Mina', icon: '🎨', category: 'gen7_norm' },
    { id: 'g7_gym_7', name: 'Desert Kahuna', desc: 'Clear Map 8 and defeat Hapu', icon: '🏜️', category: 'gen7_norm' },
    { id: 'g7_nuz_grass', name: 'Alola Survivor: Grass', desc: 'Beat a Gen 7 Nuzlocke run with Rowlet as your starter', icon: '🌱', category: 'gen7_nuz' },
    { id: 'g7_nuz_fire', name: 'Alola Survivor: Fire', desc: 'Beat a Gen 7 Nuzlocke run with Litten as your starter', icon: '🔥', category: 'gen7_nuz' },
    { id: 'g7_nuz_water', name: 'Alola Survivor: Water', desc: 'Beat a Gen 7 Nuzlocke run with Popplio as your starter', icon: '🌊', category: 'gen7_nuz' },
    { id: 'g7_nuz_clear', name: 'Alola Nuzlocke', desc: 'Beat a Gen 7 Nuzlocke run', icon: '☠️', category: 'gen7_nuz' },
    { id: 'g1_wins_5', name: 'Kanto Veteran', desc: 'Win Gen 1 5 times (without Nuzlocke)', icon: '🏆', category: 'normal' },
    { id: 'g1_wins_25', name: 'Kanto Legend', desc: 'Win Gen 1 25 times (without Nuzlocke)', icon: '👑', category: 'normal' },
    { id: 'g1_dex_half', name: 'Kanto Explorer', desc: 'Catch half of the Gen 1 Pokédex', icon: '📘', category: 'normal' },
    { id: 'g1_shiny_10', name: 'Kanto Shiny Collector', desc: 'Catch 10 shiny Gen 1 Pokémon', icon: '✨', category: 'normal' },
    { id: 'g1_nuz_3', name: 'Kanto Nuzlocke Veteran', desc: 'Beat Gen 1 in Nuzlocke 3 times', icon: '💀', category: 'gen1_nuz' },
    { id: 'g2_wins_5', name: 'Johto Veteran', desc: 'Win Gen 2 5 times (without Nuzlocke)', icon: '🏆', category: 'gen2_norm' },
    { id: 'g2_wins_25', name: 'Johto Legend', desc: 'Win Gen 2 25 times (without Nuzlocke)', icon: '👑', category: 'gen2_norm' },
    { id: 'g2_dex_half', name: 'Johto Explorer', desc: 'Catch half of the Gen 2 Pokédex', icon: '📘', category: 'gen2_norm' },
    { id: 'g2_shiny_10', name: 'Johto Shiny Collector', desc: 'Catch 10 shiny Gen 2 Pokémon', icon: '✨', category: 'gen2_norm' },
    { id: 'g2_nuz_3', name: 'Johto Nuzlocke Veteran', desc: 'Beat Gen 2 in Nuzlocke 3 times', icon: '💀', category: 'gen2_nuz' },
    { id: 'g3_wins_5', name: 'Hoenn Veteran', desc: 'Win Gen 3 5 times (without Nuzlocke)', icon: '🏆', category: 'gen3_norm' },
    { id: 'g3_wins_25', name: 'Hoenn Legend', desc: 'Win Gen 3 25 times (without Nuzlocke)', icon: '👑', category: 'gen3_norm' },
    { id: 'g3_dex_half', name: 'Hoenn Explorer', desc: 'Catch half of the Gen 3 Pokédex', icon: '📘', category: 'gen3_norm' },
    { id: 'g3_shiny_10', name: 'Hoenn Shiny Collector', desc: 'Catch 10 shiny Gen 3 Pokémon', icon: '✨', category: 'gen3_norm' },
    { id: 'g3_nuz_3', name: 'Hoenn Nuzlocke Veteran', desc: 'Beat Gen 3 in Nuzlocke 3 times', icon: '💀', category: 'gen3_nuz' },
    { id: 'g4_wins_5', name: 'Sinnoh Veteran', desc: 'Win Gen 4 5 times (without Nuzlocke)', icon: '🏆', category: 'gen4_norm' },
    { id: 'g4_wins_25', name: 'Sinnoh Legend', desc: 'Win Gen 4 25 times (without Nuzlocke)', icon: '👑', category: 'gen4_norm' },
    { id: 'g4_dex_half', name: 'Sinnoh Explorer', desc: 'Catch half of the Gen 4 Pokédex', icon: '📘', category: 'gen4_norm' },
    { id: 'g4_shiny_10', name: 'Sinnoh Shiny Collector', desc: 'Catch 10 shiny Gen 4 Pokémon', icon: '✨', category: 'gen4_norm' },
    { id: 'g4_nuz_3', name: 'Sinnoh Nuzlocke Veteran', desc: 'Beat Gen 4 in Nuzlocke 3 times', icon: '💀', category: 'gen4_nuz' },
    { id: 'g5_wins_5', name: 'Unova Veteran', desc: 'Win Gen 5 5 times (without Nuzlocke)', icon: '🏆', category: 'gen5_norm' },
    { id: 'g5_wins_25', name: 'Unova Legend', desc: 'Win Gen 5 25 times (without Nuzlocke)', icon: '👑', category: 'gen5_norm' },
    { id: 'g5_dex_half', name: 'Unova Explorer', desc: 'Catch half of the Gen 5 Pokédex', icon: '📘', category: 'gen5_norm' },
    { id: 'g5_shiny_10', name: 'Unova Shiny Collector', desc: 'Catch 10 shiny Gen 5 Pokémon', icon: '✨', category: 'gen5_norm' },
    { id: 'g5_nuz_3', name: 'Unova Nuzlocke Veteran', desc: 'Beat Gen 5 in Nuzlocke 3 times', icon: '💀', category: 'gen5_nuz' },
    { id: 'g6_wins_5', name: 'Kalos Veteran', desc: 'Win Gen 6 5 times (without Nuzlocke)', icon: '🏆', category: 'gen6_norm' },
    { id: 'g6_wins_25', name: 'Kalos Legend', desc: 'Win Gen 6 25 times (without Nuzlocke)', icon: '👑', category: 'gen6_norm' },
    { id: 'g6_dex_half', name: 'Kalos Explorer', desc: 'Catch half of the Gen 6 Pokédex', icon: '📘', category: 'gen6_norm' },
    { id: 'g6_shiny_10', name: 'Kalos Shiny Collector', desc: 'Catch 10 shiny Gen 6 Pokémon', icon: '✨', category: 'gen6_norm' },
    { id: 'g6_nuz_3', name: 'Kalos Nuzlocke Veteran', desc: 'Beat Gen 6 in Nuzlocke 3 times', icon: '💀', category: 'gen6_nuz' },
    { id: 'g7_wins_5', name: 'Alola Veteran', desc: 'Win Gen 7 5 times (without Nuzlocke)', icon: '🏆', category: 'gen7_norm' },
    { id: 'g7_wins_25', name: 'Alola Legend', desc: 'Win Gen 7 25 times (without Nuzlocke)', icon: '👑', category: 'gen7_norm' },
    { id: 'g7_dex_half', name: 'Alola Explorer', desc: 'Catch half of the Gen 7 Pokédex', icon: '📘', category: 'gen7_norm' },
    { id: 'g7_shiny_10', name: 'Alola Shiny Collector', desc: 'Catch 10 shiny Gen 7 Pokémon', icon: '✨', category: 'gen7_norm' },
    { id: 'g7_nuz_3', name: 'Alola Nuzlocke Veteran', desc: 'Beat Gen 7 in Nuzlocke 3 times', icon: '💀', category: 'gen7_nuz' },
    { id: 'starters_stage_6', name: 'Sycamore\'s Challenge', desc: 'Win a Stage 6 run starting with Chespin, Fennekin, or Froakie', icon: '🧬', category: 'tower' },
    { id: 'tower_clears_5', name: 'Tower Regular', desc: 'Clear 5 Battle Tower stages', icon: '🗼', category: 'tower' },
    { id: 'tower_clears_25', name: 'Tower Veteran', desc: 'Clear 25 Battle Tower stages', icon: '🗼', category: 'tower' },
    { id: 'tower_clears_100', name: 'Tower Master', desc: 'Clear 100 Battle Tower stages', icon: '🗼', category: 'tower' },
    { id: 'tower_all_stages', name: 'Tower Conqueror', desc: 'Clear all 6 Battle Tower stages', icon: '🏯', category: 'tower' },
    { id: 'tower_hc_1', name: 'Hardcore Climber', desc: 'Clear a stage of the Battle Tower in Hardcore', icon: '🔥', category: 'tower' },
    { id: 'tower_hc_all', name: 'Hardcore Conqueror', desc: 'Clear all 6 Battle Tower stages in Hardcore', icon: '🔥', category: 'tower' },
    { id: 'infinite_25', name: 'Infinite Climber', desc: 'Reach floor 25 in Infinite Mode', icon: '♾️', category: 'tower' },
    { id: 'infinite_50', name: 'Infinite Explorer', desc: 'Reach floor 50 in Infinite Mode', icon: '♾️', category: 'tower' },
    { id: 'infinite_100', name: 'Infinite Legend', desc: 'Reach floor 100 in Infinite Mode', icon: '♾️', category: 'tower' },
  ];

  const getAchievementList = () => readGameList(() => ACHIEVEMENTS, BUILTIN_ACHIEVEMENTS);

  function renderAchievements(container) {
    const list = getAchievementList();
    const categories = [...ACHIEVEMENT_CATEGORIES];
    for (const a of list) {
      if (!categories.some(c => c.key === a.category)) {
        categories.push({ key: a.category, label: a.category, group: 'general' });
      }
    }

    container.innerHTML = `
      <div style="margin-bottom: 20px; text-align: center;">
        <div style="font-size: 24px; font-weight: 600; color: rgba(139, 92, 246, 1); margin-bottom: 8px;" id="pse-ach-total"></div>
        <div style="font-size: 13px; color: rgba(235, 235, 245, 0.6);">Achievements Unlocked</div>
      </div>
      <div class="pse-dex-toolbar">
        <select class="pse-select" id="pse-ach-group">
          ${ACHIEVEMENT_GROUPS.map(g => `<option value="${g.key}">${g.label}</option>`).join('')}
        </select>
        <label class="pse-checkbox">
          <input type="checkbox" id="pse-ach-missing-only"> Missing only
        </label>
      </div>
      <div id="pse-ach-sections"></div>
    `;

    const sections = document.getElementById('pse-ach-sections');
    const groupSelect = document.getElementById('pse-ach-group');
    const missingOnly = document.getElementById('pse-ach-missing-only');
    groupSelect.value = localStorage.getItem('pse_ach_group') || 'all';
    missingOnly.checked = localStorage.getItem('pse_ach_missing_only') === 'true';

    function saveUnlocked(unlocked) {
      writeJson('poke_achievements', [...unlocked]);
      renderSections();
    }

    function renderSections() {
      const unlocked = new Set(readJson('poke_achievements', []));
      document.getElementById('pse-ach-total').textContent =
        `${list.filter(a => unlocked.has(a.id)).length} / ${list.length}`;

      const html = categories
        .filter(c => groupSelect.value === 'all' || c.group === groupSelect.value)
        .map(c => {
          const items = list.filter(a => a.category === c.key);
          const shown = items.filter(a => !(missingOnly.checked && unlocked.has(a.id)));
          if (shown.length === 0) return '';
          const done = items.filter(a => unlocked.has(a.id)).length;
          return `
            <div class="pse-ach-section" data-category="${c.key}">
              <div class="pse-gen-header">
                <div class="pse-ach-title">${c.label} <span class="pse-gen-count">${done}/${items.length}</span></div>
                <button class="pse-btn pse-btn-secondary pse-ach-unlock-all">Unlock all</button>
                <button class="pse-btn pse-btn-danger pse-ach-lock-all">Lock all</button>
              </div>
              <div class="pse-grid pse-ach-grid">
                ${shown.map(a => renderAchievementCard(a, unlocked.has(a.id))).join('')}
              </div>
            </div>
          `;
        }).join('');

      sections.innerHTML = html || '<div class="pse-empty">No achievements match.</div>';
    }

    sections.addEventListener('click', e => {
      const section = e.target.closest('.pse-ach-section');
      if (!section) return;
      const category = categories.find(c => c.key === section.dataset.category);
      const ids = list.filter(a => a.category === category.key).map(a => a.id);
      const unlocked = new Set(readJson('poke_achievements', []));

      const card = e.target.closest('.pse-achievement-card');
      if (card) {
        if (unlocked.has(card.dataset.id)) unlocked.delete(card.dataset.id);
        else unlocked.add(card.dataset.id);
        saveUnlocked(unlocked);
      } else if (e.target.closest('.pse-ach-unlock-all')) {
        ids.forEach(id => unlocked.add(id));
        saveUnlocked(unlocked);
      } else if (e.target.closest('.pse-ach-lock-all')) {
        if (!confirm(`Lock every achievement in "${category.label}"?`)) return;
        ids.forEach(id => unlocked.delete(id));
        saveUnlocked(unlocked);
      }
    });

    groupSelect.addEventListener('change', () => {
      localStorage.setItem('pse_ach_group', groupSelect.value);
      renderSections();
    });
    missingOnly.addEventListener('change', () => {
      localStorage.setItem('pse_ach_missing_only', missingOnly.checked);
      renderSections();
    });

    renderSections();
  }

  function renderAchievementCard(achievement, isUnlocked) {
    return `
      <div class="pse-achievement-card ${isUnlocked ? 'unlocked' : ''}" data-id="${achievement.id}">
        <div class="pse-ach-icon">${achievement.icon}</div>
        <div class="pse-ach-name">${achievement.name}</div>
        <div class="pse-ach-desc">${achievement.desc}</div>
        ${isUnlocked ? '<div class="pse-ach-check">✓</div>' : ''}
      </div>
    `;
  }

  function renderSettings(container) {
    const eliteWins = localStorage.getItem('poke_elite_wins') || '0';
    const winStreak = localStorage.getItem('poke_win_streak') || '0';
    const lastRunWon = localStorage.getItem('poke_last_run_won') || 'false';

    container.innerHTML = `
      <div style="max-width: 500px;">
        <div class="pse-field">
          <label class="pse-label" for="pse-elite-wins">Elite Wins</label>
          <input type="number" class="pse-input" id="pse-elite-wins" value="${eliteWins}">
        </div>
        <div class="pse-field">
          <label class="pse-label" for="pse-win-streak">Win Streak</label>
          <input type="number" class="pse-input" id="pse-win-streak" value="${winStreak}">
        </div>
        <div class="pse-field">
          <label class="pse-checkbox">
            <input type="checkbox" id="pse-last-run-won" ${lastRunWon === 'true' ? 'checked' : ''}> Last Run Won
          </label>
        </div>
        <button class="pse-btn pse-btn-primary" id="pse-save-settings">Save Settings</button>
      </div>
    `;

    document.getElementById('pse-save-settings').addEventListener('click', () => {
      localStorage.setItem('poke_elite_wins', document.getElementById('pse-elite-wins').value);
      localStorage.setItem('poke_win_streak', document.getElementById('pse-win-streak').value);
      localStorage.setItem('poke_last_run_won', document.getElementById('pse-last-run-won').checked ? 'true' : 'false');
      alert('Settings saved!');
    });
  }

  // ─── Keyboard shortcut ────────────────────────────────────────────────────────
  document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.shiftKey && e.key === 'E') {
      e.preventDefault();
      toggleGui();
    }
  });

  // ─── Save & Reload button ─────────────────────────────────────────────────────
  document.getElementById('pse-save-reload').addEventListener('click', () => {
    location.reload();
  });

  // ─── Init ─────────────────────────────────────────────────────────────────────
  renderContent();

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
