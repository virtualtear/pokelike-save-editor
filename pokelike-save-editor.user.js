// ==UserScript==
// @name         Pokelike Save Editor
// @namespace    https://github.com/virtualtear/pokelike-save-editor
// @version      2.6.0
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
    searchQuery: '',
    editingHofIndex: null,
    editingTeamIndex: null,
  };

  // ─── Items ───────────────────────────────────────────────────────────────────
  const ITEMS = [
    // Stat boost items
    { id: 'choice_band', name: 'Choice Band', icon: '🎀', desc: '+40% physical damage, -20% DEF' },
    { id: 'choice_specs', name: 'Choice Specs', icon: '👓', desc: '+40% special damage, -20% Sp.Def' },
    { id: 'wise_glasses', name: 'Wise Glasses', icon: '🔬', desc: '+20% special damage' },
    { id: 'muscle_band', name: 'Muscle Band', icon: '💪', desc: '+20% physical damage' },
    { id: 'eviolite', name: 'Eviolite', icon: '💎', desc: '+50% DEF & Sp.Def if holder is not fully evolved' },
    { id: 'lucky_egg', name: 'Lucky Egg', icon: '🥚', desc: '30% chance: holder gains +1 extra level after each battle', minMap: 4 },
    { id: 'scope_lens', name: 'Scope Lens', icon: '🔭', desc: '20% crit chance (+50% damage on crit)' },
    { id: 'life_orb', name: 'Life Orb', icon: '🔮', desc: '+30% damage on all moves' },
    { id: 'rocky_helmet', name: 'Rocky Helmet', icon: '⛑️', desc: 'Attacker takes 12% of their max HP on each hit' },
    { id: 'shell_bell', name: 'Shell Bell', icon: '🐚', desc: 'Heal 15% of damage dealt' },
    // Type-boosting items
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
    // Stat items
    { id: 'assault_vest', name: 'Assault Vest', icon: '🦺', desc: '+50% Sp.Def' },
    { id: 'choice_scarf', name: 'Choice Scarf', icon: '🧣', desc: '+50% Speed' },
    // Battle effect items
    { id: 'leftovers', name: 'Leftovers', icon: '🍃', desc: 'Restore 10% max HP each round' },
    { id: 'expert_belt', name: 'Expert Belt', icon: '🥊', desc: '+30% damage on super effective hits' },
    { id: 'focus_band', name: 'Focus Band', icon: '🩹', desc: '20% chance to survive a KO with 1 HP' },
    { id: 'focus_sash', name: 'Focus Sash', icon: '🎗️', desc: 'If at full HP, guaranteed to survive any hit with 1 HP' },
    { id: 'wide_lens', name: 'Wide Lens', icon: '🔎', desc: '+20% damage on all moves' },
    { id: 'air_balloon', name: 'Air Balloon', icon: '🎈', desc: 'Immune to Ground-type moves' },
  ];

  // ─── Pokémon Data (PokeAPI) ──────────────────────────────────────────────────
  // The game's Pokédex stops at #809, the end of Gen 7
  const MAX_POKEMON_ID = 809;
  const POKEAPI_URL = 'https://graphql.pokeapi.co/v1beta2';
  const POKEAPI_CACHE_KEY = 'pse_pokeapi_cache';
  const POKEAPI_CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
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
    try {
      const cache = JSON.parse(localStorage.getItem(POKEAPI_CACHE_KEY));
      return Array.isArray(cache?.pokemon) && cache.pokemon.length ? cache : null;
    } catch {
      return null;
    }
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
        localStorage.setItem(POKEAPI_CACHE_KEY, JSON.stringify({ fetchedAt: Date.now(), pokemon: list }));
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

  // Get the base form (evolution line root) for any Pokemon ID
  function getEvoLineRoot(speciesId) {
    let id = speciesId;
    while (POKEMON_BY_ID.get(id)?.evolvesFrom) id = POKEMON_BY_ID.get(id).evolvesFrom;
    return id;
  }

  const dexNumber = id => `#${String(id).padStart(3, '0')}`;

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
        <button class="pse-close" onclick="document.getElementById('pse-gui').classList.add('hidden')">✕</button>
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

  // ─── Toggle Button ───────────────────────────────────────────────────────────
  const toggleBtn = document.createElement('div');
  toggleBtn.id = 'pse-toggle-btn';
  toggleBtn.innerHTML = '⚙️';
  toggleBtn.title = 'Toggle Save Editor (Ctrl+Shift+E)';
  document.body.appendChild(toggleBtn);

  toggleBtn.addEventListener('click', () => {
    gui.classList.toggle('hidden');
    if (!gui.classList.contains('hidden')) {
      renderContent();
    }
  });

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

  function renderContent() {
    const content = document.getElementById('pse-content');

    if (VIEWS_NEEDING_POKEMON.has(STATE.currentView) && !POKEMON_LIST) {
      renderPokemonDataLoading(content);
      return;
    }

    if (STATE.currentView === 'pokedex') {
      renderDex(content, DEX_VIEWS.pokedex);
    } else if (STATE.currentView === 'shiny-dex') {
      renderDex(content, DEX_VIEWS['shiny-dex']);
    } else if (STATE.currentView === 'hall-of-fame') {
      renderHallOfFame(content);
    } else if (STATE.currentView === 'stat-buffs') {
      renderStatBuffs(content);
    } else if (STATE.currentView === 'achievements') {
      renderAchievements(content);
    } else if (STATE.currentView === 'settings') {
      renderSettings(content);
    }
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
  const SPRITE_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';

  const DEX_VIEWS = {
    'pokedex': { id: 'pokedex', saveKey: 'poke_dex', spriteBase: SPRITE_BASE },
    'shiny-dex': { id: 'shiny-dex', saveKey: 'poke_shiny_dex', spriteBase: `${SPRITE_BASE}shiny/` },
  };

  function readJson(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  }

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
      localStorage.setItem(view.saveKey, JSON.stringify(dex));
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
                    <img src="${view.spriteBase}${p.id}.png" alt="${p.name}" loading="lazy">
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
        localStorage.setItem(prefKey('collapsed_gens'), JSON.stringify([...collapsed]));
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

  function renderHallOfFame(container) {
    const hof = JSON.parse(localStorage.getItem('poke_hall_of_fame') || '[]');

    container.innerHTML = `
      <button class="pse-btn pse-btn-primary" id="pse-add-hof" style="margin-bottom: 16px;">+ Add New Run</button>
      <div id="pse-hof-list"></div>
    `;

    const list = document.getElementById('pse-hof-list');
    // Reverse to show newest first
    const reversed = [...hof].reverse();
    list.innerHTML = reversed.map((run, reversedIdx) => {
      const idx = hof.length - 1 - reversedIdx; // Get original index
      let modeText = '';
      if (run.endless) {
        const regions = ['Kanto', 'Johto', 'Hoenn', 'Sinnoh', 'Unova'];
        const region = regions[(run.stageNumber || 1) - 1] || 'Unknown';
        modeText = `Battle Tower - ${region}`;
      } else {
        modeText = 'Championship';
      }
      if (run.hardMode) modeText += ' (Nuzlocke)';

      return `
        <div class="pse-hof-item" data-idx="${idx}">
          <div class="pse-hof-header">
            <div class="pse-hof-title">Run #${run.runNumber} - ${run.date} - ${modeText}</div>
            <button class="pse-btn pse-btn-danger pse-btn-sm" onclick="deleteHofRun(${idx})">Delete</button>
          </div>
          <div class="pse-hof-team">
            ${run.team.map(p => `<img src="${p.spriteUrl}" alt="${p.name}" title="${p.name} Lv.${p.level}">`).join('')}
          </div>
        </div>
      `;
    }).join('');

    list.querySelectorAll('.pse-hof-item').forEach(item => {
      item.addEventListener('click', e => {
        if (!e.target.classList.contains('pse-btn-danger')) {
          editHofRun(parseInt(item.dataset.idx));
        }
      });
    });

    document.getElementById('pse-add-hof').addEventListener('click', () => {
      addNewHofRun();
    });
  }

  window.deleteHofRun = function(idx) {
    if (!confirm('Are you sure you want to delete this Hall of Fame entry?')) {
      return;
    }
    const hof = JSON.parse(localStorage.getItem('poke_hall_of_fame') || '[]');
    hof.splice(idx, 1);
    localStorage.setItem('poke_hall_of_fame', JSON.stringify(hof));
    // Sync to cloud immediately to prevent cloud from restoring deleted entry
    if (typeof syncToCloud === 'function') syncToCloud();
    // Force immediate re-render
    renderContent();
  };

  function addNewHofRun() {
    const hof = JSON.parse(localStorage.getItem('poke_hall_of_fame') || '[]');
    const newRun = {
      runNumber: hof.length + 1,
      hardMode: false,
      endless: false,
      date: new Date().toLocaleDateString(),
      team: []
    };
    hof.push(newRun);
    localStorage.setItem('poke_hall_of_fame', JSON.stringify(hof));
    editHofRun(hof.length - 1);
  }

  function editHofRun(idx) {
    const hof = JSON.parse(localStorage.getItem('poke_hall_of_fame') || '[]');
    const run = hof[idx];

    const modal = document.createElement('div');
    modal.className = 'pse-modal';
    modal.innerHTML = `
      <div class="pse-modal-box">
        <div class="pse-modal-title">Edit Run #${run.runNumber}</div>
        <div style="margin-bottom: 16px;">
          <label style="display: block; margin-bottom: 8px; font-size: 13px; color: rgba(235, 235, 245, 0.7);">
            <input type="radio" name="pse-mode" value="championship" ${!run.endless ? 'checked' : ''}> Championship
          </label>
          <label style="display: block; margin-bottom: 8px; font-size: 13px; color: rgba(235, 235, 245, 0.7);">
            <input type="radio" name="pse-mode" value="battle-tower" ${run.endless ? 'checked' : ''}> Battle Tower
          </label>
          <div id="pse-region-select" style="margin-left: 24px; margin-top: 8px; ${run.endless ? '' : 'display: none;'}">
            <label style="display: block; margin-bottom: 4px; font-size: 12px; color: rgba(235, 235, 245, 0.6);">Region:</label>
            <select id="pse-stage" style="padding: 6px 10px; background: rgba(255, 255, 255, 0.04); border: 0.5px solid rgba(255, 255, 255, 0.1); border-radius: 6px; color: #000; font-size: 13px; cursor: pointer;">
              <option value="1" ${run.stageNumber === 1 ? 'selected' : ''}>Kanto</option>
              <option value="2" ${run.stageNumber === 2 ? 'selected' : ''}>Johto</option>
              <option value="3" ${run.stageNumber === 3 ? 'selected' : ''}>Hoenn</option>
              <option value="4" ${run.stageNumber === 4 ? 'selected' : ''}>Sinnoh</option>
              <option value="5" ${run.stageNumber === 5 ? 'selected' : ''}>Unova</option>
            </select>
          </div>
        </div>
        <div id="pse-nuzlocke-container" style="margin-bottom: 16px; ${run.endless ? 'display: none;' : ''}">
          <label style="display: block; margin-bottom: 8px; font-size: 13px; color: rgba(235, 235, 245, 0.7);">
            <input type="checkbox" id="pse-nuzlocke" ${run.hardMode ? 'checked' : ''}> Nuzlocke Mode
          </label>
        </div>
        <div style="margin-bottom: 16px;">
          <div style="font-size: 13px; margin-bottom: 8px; color: rgba(235, 235, 245, 0.7);">Team (${run.team.length}/6)</div>
          <div id="pse-team-list" style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px;">
            ${run.team.map((p, i) => `
              <div style="position: relative; cursor: pointer;" onclick="editTeamMember(${idx}, ${i})">
                <img src="${p.spriteUrl}" style="width: 64px; height: 64px; image-rendering: pixelated;" title="${p.nickname || p.name} Lv.${p.level}${p.isShiny ? ' ✨' : ''}${p.heldItem ? ' • ' + p.heldItem.icon : ''}">
                ${p.isShiny ? '<div style="position: absolute; top: 2px; left: 2px; font-size: 16px;">✨</div>' : ''}
                ${p.heldItem ? `<div style="position: absolute; bottom: 2px; right: 2px; font-size: 14px;">${p.heldItem.icon}</div>` : ''}
              </div>
            `).join('')}
          </div>
          <button class="pse-btn pse-btn-secondary" id="pse-add-team">+ Add Pokémon</button>
        </div>
        <div class="pse-modal-actions">
          <button class="pse-btn pse-btn-secondary" id="pse-cancel">Cancel</button>
          <button class="pse-btn pse-btn-primary" id="pse-save">Save</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // Toggle region select and nuzlocke visibility
    const modeRadios = modal.querySelectorAll('input[name="pse-mode"]');
    const regionSelect = document.getElementById('pse-region-select');
    const nuzlockeContainer = document.getElementById('pse-nuzlocke-container');
    modeRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        const isBattleTower = radio.value === 'battle-tower';
        regionSelect.style.display = isBattleTower ? 'block' : 'none';
        nuzlockeContainer.style.display = isBattleTower ? 'none' : 'block';
      });
    });

    modal.querySelector('#pse-cancel').addEventListener('click', () => modal.remove());
    modal.querySelector('#pse-save').addEventListener('click', () => {
      // Reload from localStorage to get the latest data (in case team was modified)
      const latestHof = JSON.parse(localStorage.getItem('poke_hall_of_fame') || '[]');
      const latestRun = latestHof[idx];

      const mode = modal.querySelector('input[name="pse-mode"]:checked').value;
      latestRun.endless = mode === 'battle-tower';

      if (latestRun.endless) {
        latestRun.stageNumber = parseInt(document.getElementById('pse-stage').value);
        latestRun.hardMode = false; // Battle Tower can't be Nuzlocke
      } else {
        latestRun.hardMode = document.getElementById('pse-nuzlocke').checked;
        delete latestRun.stageNumber;
      }

      localStorage.setItem('poke_hall_of_fame', JSON.stringify(latestHof));
      modal.remove();
      renderContent();
    });

    modal.querySelector('#pse-add-team').addEventListener('click', () => {
      if (run.team.length >= 6) {
        alert('Team is full (6/6)');
        return;
      }
      showPokemonPicker(idx);
    });

    modal.addEventListener('click', e => {
      if (e.target === modal) modal.remove();
    });
  }

  window.removeTeamMember = function(runIdx, teamIdx) {
    const hof = JSON.parse(localStorage.getItem('poke_hall_of_fame') || '[]');
    hof[runIdx].team.splice(teamIdx, 1);
    localStorage.setItem('poke_hall_of_fame', JSON.stringify(hof));
    document.querySelector('.pse-modal').remove();
    editHofRun(runIdx);
  };

  window.editTeamMember = function(runIdx, teamIdx) {
    editTeamMember(runIdx, teamIdx);
  };

  function showPokemonPicker(runIdx) {
    const modal = document.createElement('div');
    modal.className = 'pse-modal';
    modal.innerHTML = `
      <div class="pse-modal-box">
        <div class="pse-modal-title">Add Pokémon to Team</div>
        <input type="text" class="pse-search" placeholder="Search Pokémon..." id="pse-search-picker">
        <div class="pse-grid" id="pse-picker-grid" style="max-height: 400px; overflow-y: auto;"></div>
      </div>
    `;
    document.body.appendChild(modal);

    const grid = document.getElementById('pse-picker-grid');
    const search = document.getElementById('pse-search-picker');

    function renderPicker(query = '') {
      const filtered = POKEMON_LIST.filter(p =>
        matchesSearch(p, query)
      );

      grid.innerHTML = filtered.map(p => `
        <div class="pse-card" data-id="${p.id}">
          <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png" alt="${p.name}">
          <div class="pse-card-number">${dexNumber(p.id)}</div>
          <div class="pse-card-name">${p.name}</div>
        </div>
      `).join('');

      grid.querySelectorAll('.pse-card').forEach(card => {
        card.addEventListener('click', () => {
          addPokemonToTeam(runIdx, parseInt(card.dataset.id));
          modal.remove();
        });
      });
    }

    search.addEventListener('input', e => renderPicker(e.target.value));
    renderPicker();

    modal.addEventListener('click', e => {
      if (e.target === modal) modal.remove();
    });
  }

  function addPokemonToTeam(runIdx, pokemonId) {
    const hof = JSON.parse(localStorage.getItem('poke_hall_of_fame') || '[]');
    const pokemon = POKEMON_LIST.find(p => p.id === pokemonId);

    // Add the Pokemon to the team
    hof[runIdx].team.push({
      speciesId: pokemonId,
      name: pokemon.name,
      nickname: null,
      level: 50,
      types: pokemon.types,
      spriteUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`,
      isShiny: false,
      heldItem: null
    });

    // Save immediately
    localStorage.setItem('poke_hall_of_fame', JSON.stringify(hof));

    // Update the team list in the existing modal
    updateTeamListUI(runIdx);
  }

  function updateTeamListUI(runIdx) {
    // Reload from localStorage to get the latest data
    const hof = JSON.parse(localStorage.getItem('poke_hall_of_fame') || '[]');
    const run = hof[runIdx];

    const teamList = document.getElementById('pse-team-list');
    if (teamList) {
      teamList.innerHTML = run.team.map((p, i) => `
        <div style="position: relative; cursor: pointer;" onclick="editTeamMember(${runIdx}, ${i})">
          <img src="${p.spriteUrl}" style="width: 64px; height: 64px; image-rendering: pixelated;" title="${p.nickname || p.name} Lv.${p.level}${p.isShiny ? ' ✨' : ''}${p.heldItem ? ' • ' + p.heldItem.icon : ''}">
          ${p.isShiny ? '<div style="position: absolute; top: 2px; left: 2px; font-size: 16px;">✨</div>' : ''}
          ${p.heldItem ? `<div style="position: absolute; bottom: 2px; right: 2px; font-size: 14px;">${p.heldItem.icon}</div>` : ''}
        </div>
      `).join('');

      // Update team count
      const teamCountLabel = teamList.previousElementSibling;
      if (teamCountLabel) {
        teamCountLabel.textContent = `Team (${run.team.length}/6)`;
      }
    }
  }

  function editTeamMember(runIdx, teamIdx) {
    const hof = JSON.parse(localStorage.getItem('poke_hall_of_fame') || '[]');
    const member = hof[runIdx].team[teamIdx];

    const modal = document.createElement('div');
    modal.className = 'pse-modal';
    modal.innerHTML = `
      <div class="pse-modal-box">
        <div class="pse-modal-title">Edit ${member.name}</div>
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="${member.spriteUrl}" style="width: 96px; height: 96px; image-rendering: pixelated;">
        </div>

        <div style="margin-bottom: 16px;">
          <label style="display: block; margin-bottom: 8px; font-size: 13px; color: rgba(235, 235, 245, 0.7);">Nickname (optional)</label>
          <input type="text" id="pse-nickname" value="${member.nickname || ''}" placeholder="${member.name}" style="width: 100%; padding: 10px; background: rgba(255, 255, 255, 0.04); border: 0.5px solid rgba(255, 255, 255, 0.1); border-radius: 8px; color: rgba(235, 235, 245, 0.9); font-size: 14px;">
        </div>

        <div style="margin-bottom: 16px;">
          <label style="display: block; margin-bottom: 8px; font-size: 13px; color: rgba(235, 235, 245, 0.7);">Level</label>
          <input type="number" id="pse-level" value="${member.level}" min="1" max="100" style="width: 100%; padding: 10px; background: rgba(255, 255, 255, 0.04); border: 0.5px solid rgba(255, 255, 255, 0.1); border-radius: 8px; color: rgba(235, 235, 245, 0.9); font-size: 14px;">
        </div>

        <div style="margin-bottom: 16px;">
          <label style="display: block; margin-bottom: 8px; font-size: 13px; color: rgba(235, 235, 245, 0.7);">
            <input type="checkbox" id="pse-is-shiny" ${member.isShiny ? 'checked' : ''}> Shiny
          </label>
        </div>

        <div style="margin-bottom: 16px;">
          <label style="display: block; margin-bottom: 8px; font-size: 13px; color: rgba(235, 235, 245, 0.7);">Held Item</label>
          <select id="pse-held-item" style="width: 100%; padding: 10px; background: rgba(255, 255, 255, 0.04); border: 0.5px solid rgba(255, 255, 255, 0.1); border-radius: 8px; color: #000; font-size: 14px; cursor: pointer;">
            <option value="">None</option>
            ${ITEMS.map(item => `
              <option value="${item.id}" ${member.heldItem?.id === item.id ? 'selected' : ''}>
                ${item.icon} ${item.name}
              </option>
            `).join('')}
          </select>
        </div>

        <div class="pse-modal-actions">
          <button class="pse-btn pse-btn-danger" id="pse-delete-member">Delete</button>
          <button class="pse-btn pse-btn-secondary" id="pse-cancel-member">Cancel</button>
          <button class="pse-btn pse-btn-primary" id="pse-save-member">Save</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('#pse-cancel-member').addEventListener('click', () => modal.remove());

    modal.querySelector('#pse-save-member').addEventListener('click', () => {
      const nickname = document.getElementById('pse-nickname').value.trim();
      const level = parseInt(document.getElementById('pse-level').value);
      const isShiny = document.getElementById('pse-is-shiny').checked;
      const itemId = document.getElementById('pse-held-item').value;

      // Reload from localStorage to ensure we have the latest data
      const hof = JSON.parse(localStorage.getItem('poke_hall_of_fame') || '[]');
      const member = hof[runIdx].team[teamIdx];

      member.nickname = nickname || null;
      member.level = level;
      member.isShiny = isShiny;

      // Update sprite URL based on shiny status
      member.spriteUrl = isShiny
        ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${member.speciesId}.png`
        : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${member.speciesId}.png`;

      // Update held item
      if (itemId) {
        const item = ITEMS.find(i => i.id === itemId);
        member.heldItem = {
          id: item.id,
          name: item.name,
          icon: item.icon,
          desc: item.desc || ''
        };
      } else {
        member.heldItem = null;
      }

      localStorage.setItem('poke_hall_of_fame', JSON.stringify(hof));
      modal.remove();

      // Update the team list UI
      updateTeamListUI(runIdx);
    });

    modal.querySelector('#pse-delete-member').addEventListener('click', () => {
      // Reload from localStorage to ensure we have the latest data
      const hof = JSON.parse(localStorage.getItem('poke_hall_of_fame') || '[]');
      hof[runIdx].team.splice(teamIdx, 1);
      localStorage.setItem('poke_hall_of_fame', JSON.stringify(hof));
      modal.remove();

      // Update the team list UI
      updateTeamListUI(runIdx);
    });

    modal.addEventListener('click', e => {
      if (e.target === modal) modal.remove();
    });
  }

  // ─── Stat Buffs ──────────────────────────────────────────────────────────────
  function renderStatBuffs(container) {
    const statBuffs = JSON.parse(localStorage.getItem('poke_stat_buffs') || '{}');
    const hofData = JSON.parse(localStorage.getItem('poke_hall_of_fame') || '[]');

    // Get filter state from localStorage
    const filterLegendaries = localStorage.getItem('pse_filter_legendaries') === 'true';

    // Get unique Pokémon from Hall of Fame, mapped to their BASE FORMS
    const hofPokemonMap = new Map();
    hofData.forEach(run => {
      if (run.team && Array.isArray(run.team)) {
        run.team.forEach(member => {
          const evolvedId = member.speciesId;
          const baseId = getEvoLineRoot(evolvedId); // Map to base form

          // Skip legendaries if filter is enabled
          if (filterLegendaries && LEGENDARY_ID_SET.has(baseId)) {
            return;
          }

          if (!hofPokemonMap.has(baseId)) {
            const pokemon = POKEMON_LIST.find(p => p.id === baseId);
            hofPokemonMap.set(baseId, {
              id: baseId,
              name: pokemon?.name || `#${baseId}`,
              isShiny: member.isShiny || false,
              spriteUrl: member.isShiny
                ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${baseId}.png`
                : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${baseId}.png`
            });
          } else if (member.isShiny && !hofPokemonMap.get(baseId).isShiny) {
            // Prioritize shiny sprite if found
            hofPokemonMap.get(baseId).isShiny = true;
            hofPokemonMap.get(baseId).spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${baseId}.png`;
          }
        });
      }
    });

    // Separate into buffed and unbuffed arrays
    const buffedPokemon = [];
    const unbuffedPokemon = [];

    hofPokemonMap.forEach((poke, id) => {
      if (statBuffs[id]) {
        buffedPokemon.push({ ...poke, buffs: statBuffs[id] });
      } else {
        unbuffedPokemon.push(poke);
      }
    });

    container.innerHTML = `
      <div style="margin-bottom: 16px; padding: 12px; background: rgba(139, 92, 246, 0.1); border: 0.5px solid rgba(139, 92, 246, 0.3); border-radius: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <div>
            <div style="font-size: 13px; color: rgba(235, 235, 245, 0.8);">Showing base forms of Pokémon from Hall of Fame</div>
            <div style="font-size: 11px; color: rgba(235, 235, 245, 0.6); margin-top: 4px;">Click any Pokémon to edit their stat buffs (buffs apply to entire evolution line)</div>
          </div>
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none;">
            <input type="checkbox" id="pse-filter-legendaries" ${filterLegendaries ? 'checked' : ''}
              style="width: 16px; height: 16px; cursor: pointer; accent-color: rgba(139, 92, 246, 1);">
            <span style="font-size: 12px; color: rgba(235, 235, 245, 0.8); white-space: nowrap;">Battle Tower only</span>
          </label>
        </div>
      </div>
      <div class="pse-grid" id="pse-buff-grid"></div>
    `;

    const grid = document.getElementById('pse-buff-grid');

    if (hofPokemonMap.size === 0) {
      const message = filterLegendaries
        ? 'No non-legendary Pokémon in Hall of Fame. Uncheck "Battle Tower only" to see all Pokémon.'
        : 'No Pokémon in Hall of Fame yet. Complete a run to see Pokémon here.';
      grid.innerHTML = `<div style="text-align: center; padding: 40px; color: rgba(235, 235, 245, 0.5);">${message}</div>`;

      // Add event listener for the checkbox
      const checkbox = document.getElementById('pse-filter-legendaries');
      if (checkbox) {
        checkbox.addEventListener('change', (e) => {
          localStorage.setItem('pse_filter_legendaries', e.target.checked);
          renderContent();
        });
      }
      return;
    }

    // Render buffed first, then unbuffed
    const allPokemon = [...buffedPokemon, ...unbuffedPokemon];

    grid.innerHTML = allPokemon.map(poke => {
      const totalBuffs = poke.buffs
        ? (poke.buffs.hp || 0) + Math.max(poke.buffs.atk || 0, poke.buffs.special || 0) + (poke.buffs.def || 0) + (poke.buffs.speed || 0) + (poke.buffs.spdef || 0)
        : 0;

      return `
        <div class="pse-card ${poke.buffs ? 'owned' : ''}" data-id="${poke.id}" style="cursor: pointer;">
          <img src="${poke.spriteUrl}" alt="${poke.name}">
          <div class="pse-card-number">${dexNumber(poke.id)}</div>
          <div class="pse-card-name">${poke.isShiny ? '✨ ' : ''}${poke.name}</div>
          ${totalBuffs > 0 ? `<div style="font-size: 11px; color: rgba(139, 92, 246, 1); margin-top: 4px;">${totalBuffs} buff points</div>` : ''}
        </div>
      `;
    }).join('');

    grid.querySelectorAll('.pse-card').forEach(card => {
      card.addEventListener('click', () => {
        editStatBuffs(parseInt(card.dataset.id));
      });
    });

    // Add event listener for the checkbox
    const checkbox = document.getElementById('pse-filter-legendaries');
    if (checkbox) {
      checkbox.addEventListener('change', (e) => {
        localStorage.setItem('pse_filter_legendaries', e.target.checked);
        renderContent();
      });
    }
  }


  async function editStatBuffs(pokemonId) {
    const statBuffs = JSON.parse(localStorage.getItem('poke_stat_buffs') || '{}');
    const buffs = statBuffs[pokemonId] || { hp: 0, atk: 0, def: 0, speed: 0, special: 0, spdef: 0 };
    const pokemon = POKEMON_LIST.find(p => p.id === pokemonId);

    // Calculate max buff points based on user's stage progress
    const hofData = JSON.parse(localStorage.getItem('poke_hall_of_fame') || '[]');
    const maxCompletedStage = hofData
      .filter(e => e.endless && e.stageNumber)
      .reduce((max, e) => Math.max(max, e.stageNumber), 0);
    const unlockedStage = Math.max(1, maxCompletedStage + 1);
    const legitMaxPoints = Math.min(unlockedStage * 10, 50);

    // Check if cheat mode is enabled
    const cheatMode = localStorage.getItem('pse_cheat_mode') === 'true';
    const maxPoints = cheatMode ? 50 : legitMaxPoints;

    // Try to get base stats from cached localStorage data (game already fetches this)
    let baseStats = null;
    let isSpecialAttacker = null;
    let hiddenAttackStat = null;

    const cachedKey = `pkrl_poke_${pokemonId}`;
    const cachedData = localStorage.getItem(cachedKey);

    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        if (parsed.baseStats && parsed.baseStats.special !== undefined && parsed.baseStats.atk !== undefined) {
          baseStats = {
            atk: parsed.baseStats.atk,
            special: parsed.baseStats.special,
          };
          isSpecialAttacker = baseStats.special >= baseStats.atk;
          hiddenAttackStat = isSpecialAttacker ? 'atk' : 'special';
        }
      } catch (e) {
        console.warn('Failed to parse cached Pokemon data', e);
      }
    }

    // If no cached data, show both attack stats as fallback
    if (!baseStats) {
      console.warn(`No cached data found for Pokemon ${pokemonId}, showing both attack stats`);
    }

    // Calculate current total buff points
    const getCurrentTotal = () => {
      const getVal = (id, fallback) => {
        const el = document.getElementById(id);
        if (!el) return fallback ?? 0;
        const val = parseInt(el.value);
        return isNaN(val) ? 0 : val;
      };

      const hp = getVal('pse-buff-hp', buffs.hp);
      const atk = getVal('pse-buff-atk', buffs.atk);
      const def = getVal('pse-buff-def', buffs.def);
      const speed = getVal('pse-buff-speed', buffs.speed);
      const special = getVal('pse-buff-special', buffs.special);
      const spdef = getVal('pse-buff-spdef', buffs.spdef);
      const atkPts = Math.max(atk, special);
      return hp + atkPts + def + speed + spdef;
    };

    const initialTotal = (buffs.hp || 0) + Math.max(buffs.atk || 0, buffs.special || 0) + (buffs.def || 0) + (buffs.speed || 0) + (buffs.spdef || 0);

    const modal = document.createElement('div');
    modal.className = 'pse-modal';

    // Build stats list, filtering out the hidden attack stat if we know it
    const allStats = ['hp', 'atk', 'special', 'def', 'speed', 'spdef'];
    const visibleStats = hiddenAttackStat
      ? allStats.filter(s => s !== hiddenAttackStat)
      : allStats;

    modal.innerHTML = `
      <div class="pse-modal-box">
        <div class="pse-modal-title">Stat Buffs - ${pokemon?.name || `#${pokemonId}`}</div>
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png" style="width: 96px; height: 96px; image-rendering: pixelated;">
        </div>

        <div style="margin-bottom: 12px; padding: 12px; background: rgba(139, 92, 246, 0.1); border: 0.5px solid rgba(139, 92, 246, 0.3); border-radius: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div style="font-size: 13px; color: rgba(235, 235, 245, 0.9); font-weight: 600;">
              <span id="pse-buff-total">${initialTotal}</span>${cheatMode ? '' : ` / ${maxPoints}`} points used
            </div>
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none;">
              <input type="checkbox" id="pse-cheat-mode-toggle" ${cheatMode ? 'checked' : ''}
                style="width: 16px; height: 16px; cursor: pointer; accent-color: rgba(255, 100, 100, 1);">
              <span style="font-size: 11px; color: rgba(255, 100, 100, 1); white-space: nowrap;">Cheat Mode</span>
            </label>
          </div>
          <div style="font-size: 11px; color: rgba(235, 235, 245, 0.6); margin-bottom: 4px;">Each stat: 0-10 buffs (+10% per buff)</div>
          ${hiddenAttackStat ? `<div style="font-size: 11px; color: rgba(235, 235, 245, 0.6);">This Pokémon is a ${isSpecialAttacker ? 'Special' : 'Physical'} attacker</div>` : '<div style="font-size: 11px; color: rgba(235, 235, 245, 0.6);">ATK and Special mirror each other</div>'}
          ${!cheatMode && maxPoints < 50 ? `<div style="font-size: 11px; color: rgba(255, 180, 0, 0.8); margin-top: 4px;">Complete Stage ${Math.min(5, unlockedStage)} to unlock more points (max 50)</div>` : ''}
          ${cheatMode ? `<div style="font-size: 11px; color: rgba(255, 100, 100, 0.8); margin-top: 4px;">⚠️ All caps removed</div>` : ''}
        </div>

        ${visibleStats.map(stat => {
          const labels = { hp: 'HP', atk: 'ATK', def: 'DEF', speed: 'SPE', special: 'SPA', spdef: 'SPD' };
          return `
            <div style="margin-bottom: 16px;">
              <label style="display: block; margin-bottom: 8px; font-size: 13px; color: rgba(235, 235, 245, 0.7);">
                <span id="pse-buff-${stat}-label">${labels[stat]} (${buffs[stat] || 0}/10) - +${(buffs[stat] || 0) * 10}%</span>
              </label>
              <div style="display: flex; gap: 8px; align-items: center;">
                <input type="range" id="pse-buff-${stat}" min="0" max="10" value="${buffs[stat] || 0}"
                  style="flex: 1; accent-color: rgba(139, 92, 246, 1);">
                <input type="number" id="pse-buff-${stat}-num" min="0" max="10" value="${buffs[stat] || 0}"
                  style="width: 60px; padding: 6px; background: rgba(255, 255, 255, 0.04); border: 0.5px solid rgba(255, 255, 255, 0.1); border-radius: 6px; color: rgba(235, 235, 245, 0.9); font-size: 13px; text-align: center;">
              </div>
            </div>
          `;
        }).join('')}

        <div class="pse-modal-actions">
          <button class="pse-btn pse-btn-danger" id="pse-delete-buffs">Delete</button>
          <button class="pse-btn pse-btn-secondary" id="pse-cancel-buffs">Cancel</button>
          <button class="pse-btn pse-btn-primary" id="pse-save-buffs">Save</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const totalDisplay = document.getElementById('pse-buff-total');
    const cheatModeToggle = document.getElementById('pse-cheat-mode-toggle');
    let currentCheatMode = cheatMode;

    // Update total display and enforce cap
    const updateTotal = () => {
      const total = getCurrentTotal();
      const newTotalDisplay = document.getElementById('pse-buff-total');
      if (newTotalDisplay) {
        newTotalDisplay.textContent = total;

        // Use the checkbox state directly to ensure we have the latest value
        const isCheatMode = document.getElementById('pse-cheat-mode-toggle').checked;
        const currentMaxPoints = isCheatMode ? Infinity : maxPoints;

        // Color code based on cap
        if (!isCheatMode && total > currentMaxPoints) {
          newTotalDisplay.style.color = 'rgba(255, 100, 100, 1)';
        } else if (!isCheatMode && total === currentMaxPoints) {
          newTotalDisplay.style.color = 'rgba(255, 215, 0, 1)';
        } else {
          newTotalDisplay.style.color = 'rgba(235, 235, 245, 0.9)';
        }
      }
    };

    // Handle cheat mode toggle
    cheatModeToggle.addEventListener('change', (e) => {
      currentCheatMode = e.target.checked;
      localStorage.setItem('pse_cheat_mode', currentCheatMode ? 'true' : 'false');

      // Update the total display text properly
      const currentTotal = getCurrentTotal();
      const newTotalDisplay = document.getElementById('pse-buff-total');
      if (newTotalDisplay) {
        newTotalDisplay.textContent = currentTotal;
      }

      // Find the header div and update the text after the total span
      const headerDiv = totalDisplay.parentElement;

      // Remove all text nodes after the total span
      Array.from(headerDiv.childNodes).forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
          node.remove();
        }
      });

      // Add the correct text after the total span
      const totalSpan = document.getElementById('pse-buff-total');
      if (totalSpan) {
        const textToAdd = currentCheatMode
          ? ' points used'
          : ` / ${maxPoints} points used`;
        totalSpan.insertAdjacentText('afterend', textToAdd);
      }

      // Update info messages
      const infoBox = headerDiv.closest('div[style*="background: rgba(139, 92, 246, 0.1)"]');
      const lastChild = infoBox.lastElementChild;

      if (currentCheatMode) {
        // Remove any existing warning and add cheat mode message
        if (lastChild && (lastChild.textContent.includes('Complete Stage') || lastChild.textContent === '')) {
          lastChild.remove();
        }
        if (!infoBox.textContent.includes('All caps removed')) {
          const cheatMsg = document.createElement('div');
          cheatMsg.style.cssText = 'font-size: 11px; color: rgba(255, 100, 100, 0.8); margin-top: 4px;';
          cheatMsg.textContent = '⚠️ All caps removed';
          infoBox.appendChild(cheatMsg);
        }
      } else {
        // Remove cheat mode message and add stage warning if needed
        if (lastChild && lastChild.textContent.includes('All caps removed')) {
          lastChild.remove();
        }
        if (maxPoints < 50 && !infoBox.textContent.includes('Complete Stage')) {
          const stageMsg = document.createElement('div');
          stageMsg.style.cssText = 'font-size: 11px; color: rgba(255, 180, 0, 0.8); margin-top: 4px;';
          stageMsg.textContent = `Complete Stage ${Math.min(5, unlockedStage)} to unlock more points (max 50)`;
          infoBox.appendChild(stageMsg);
        }
      }

      // Update max values on sliders and inputs WITHOUT resetting values
      visibleStats.forEach(stat => {
        const numInput = document.getElementById(`pse-buff-${stat}-num`);
        const slider = document.getElementById(`pse-buff-${stat}`);
        const label = document.getElementById(`pse-buff-${stat}-label`);
        const labels = { hp: 'HP', atk: 'ATK', def: 'DEF', speed: 'SPE', special: 'SPA', spdef: 'SPD' };

        // Don't read the value - it causes reset. Just update the max attributes
        if (currentCheatMode) {
          numInput.removeAttribute('max');
          slider.setAttribute('max', '999');
        } else {
          numInput.setAttribute('max', '10');
          slider.setAttribute('max', '10');
          // Clamp values to 10 if they exceed
          const currentVal = parseInt(slider.value);
          if (currentVal > 10) {
            slider.value = 10;
            numInput.value = 10;
          }
        }

        // Update label with current value from slider (don't reset)
        const val = parseInt(slider.value);
        label.textContent = `${labels[stat]} (${val}/${currentCheatMode ? '∞' : '10'}) - +${val * 10}%`;
      });

      updateTotal();
    });

    // Sync sliders with number inputs
    visibleStats.forEach(stat => {
      const slider = document.getElementById(`pse-buff-${stat}`);
      const numInput = document.getElementById(`pse-buff-${stat}-num`);
      const label = document.getElementById(`pse-buff-${stat}-label`);
      const labels = { hp: 'HP', atk: 'ATK', def: 'DEF', speed: 'SPE', special: 'SPA', spdef: 'SPD' };

      // Set initial max based on cheat mode
      if (currentCheatMode) {
        numInput.removeAttribute('max');
        slider.setAttribute('max', '999');
      }

      slider.addEventListener('input', () => {
        // Use the checkbox state directly to ensure we have the latest value
        const isCheatMode = document.getElementById('pse-cheat-mode-toggle').checked;

        if (!isCheatMode) {
          const newVal = parseInt(slider.value);

          // Calculate total by reading all current values from DOM
          let total = 0;
          visibleStats.forEach(s => {
            const sInput = document.getElementById(`pse-buff-${s}-num`);
            if (s === stat) {
              // Use the new value for this stat
              total += newVal;
            } else {
              total += parseInt(sInput?.value || 0);
            }
          });

          // For ATK/Special, only count the max of the two
          if (visibleStats.includes('atk') && visibleStats.includes('special')) {
            const atkVal = stat === 'atk' ? newVal : parseInt(document.getElementById('pse-buff-atk-num')?.value || 0);
            const specVal = stat === 'special' ? newVal : parseInt(document.getElementById('pse-buff-special-num')?.value || 0);
            total = total - atkVal - specVal + Math.max(atkVal, specVal);
          } else if (!visibleStats.includes('atk') && stat === 'special') {
            // Special is visible but ATK is hidden - they mirror
            // Already counted correctly
          } else if (!visibleStats.includes('special') && stat === 'atk') {
            // ATK is visible but Special is hidden - they mirror
            // Already counted correctly
          }

          if (total > maxPoints) {
            // Don't allow the change
            slider.value = numInput.value;
            return;
          }
        }

        numInput.value = slider.value;
        label.textContent = `${labels[stat]} (${slider.value}/${isCheatMode ? '∞' : '10'}) - +${slider.value * 10}%`;
        updateTotal();
      });

      numInput.addEventListener('input', () => {
        // Use the checkbox state directly to ensure we have the latest value
        const isCheatMode = document.getElementById('pse-cheat-mode-toggle').checked;
        const maxVal = isCheatMode ? 999 : 10;
        let val = Math.max(0, Math.min(maxVal, parseInt(numInput.value) || 0));

        // Check if this would exceed total cap (only if not in cheat mode)
        if (!isCheatMode) {
          // Calculate total by reading all current values from DOM
          let total = 0;
          visibleStats.forEach(s => {
            const sInput = document.getElementById(`pse-buff-${s}-num`);
            if (s === stat) {
              // Use the new value for this stat
              total += val;
            } else {
              total += parseInt(sInput?.value || 0);
            }
          });

          // For ATK/Special, only count the max of the two
          if (visibleStats.includes('atk') && visibleStats.includes('special')) {
            const atkVal = stat === 'atk' ? val : parseInt(document.getElementById('pse-buff-atk-num')?.value || 0);
            const specVal = stat === 'special' ? val : parseInt(document.getElementById('pse-buff-special-num')?.value || 0);
            total = total - atkVal - specVal + Math.max(atkVal, specVal);
          }

          if (total > maxPoints) {
            // Calculate how much we can actually add
            const currentWithoutThis = total - val;
            val = Math.max(0, maxPoints - currentWithoutThis);
          }
        }

        numInput.value = val;
        slider.value = Math.min(val, parseInt(slider.max));
        label.textContent = `${labels[stat]} (${val}/${isCheatMode ? '∞' : '10'}) - +${val * 10}%`;
        updateTotal();
      });
    });

    modal.querySelector('#pse-cancel-buffs').addEventListener('click', () => modal.remove());

    modal.querySelector('#pse-save-buffs').addEventListener('click', () => {
      const total = getCurrentTotal();

      // Use the checkbox state directly to ensure we have the latest value
      const isCheatMode = document.getElementById('pse-cheat-mode-toggle').checked;

      // Enforce cap (unless cheat mode)
      if (!isCheatMode && total > maxPoints) {
        alert(`Total buff points (${total}) exceeds your cap (${maxPoints}). Complete more Battle Tower stages to increase your cap, or enable Cheat Mode.`);
        return;
      }

      // Helper to safely get value from DOM (never fall back to old buffs)
      const getVal = (id) => {
        const el = document.getElementById(id);
        if (!el) return 0;
        const val = parseInt(el.value);
        return isNaN(val) ? 0 : val;
      };

      let newBuffs = {
        hp: getVal('pse-buff-hp'),
        atk: getVal('pse-buff-atk'),
        def: getVal('pse-buff-def'),
        speed: getVal('pse-buff-speed'),
        special: getVal('pse-buff-special'),
        spdef: getVal('pse-buff-spdef'),
      };

      // If NOT in cheat mode, clamp all values to 10 (game's max per stat)
      if (!isCheatMode) {
        Object.keys(newBuffs).forEach(key => {
          newBuffs[key] = Math.min(10, newBuffs[key]);
        });
      }

      // Mirror ATK and Special (game mechanic - they always stay in sync)
      const maxAttack = Math.max(newBuffs.atk, newBuffs.special);
      newBuffs.atk = maxAttack;
      newBuffs.special = maxAttack;

      statBuffs[pokemonId] = newBuffs;
      localStorage.setItem('poke_stat_buffs', JSON.stringify(statBuffs));
      modal.remove();
      renderContent();
    });

    modal.querySelector('#pse-delete-buffs').addEventListener('click', () => {
      delete statBuffs[pokemonId];
      localStorage.setItem('poke_stat_buffs', JSON.stringify(statBuffs));
      modal.remove();
      renderContent();
    });

    modal.addEventListener('click', e => {
      if (e.target === modal) modal.remove();
    });
  }

  // ─── Achievements Data ───────────────────────────────────────────────────────
  const ACHIEVEMENTS = [
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
    { id: 'nuzlocke_win', name: 'True Master', desc: 'Enable Nuzlocke Mode in Settings, then beat the game — if any Pokémon faints, it\'s gone for good', icon: '☠️', category: 'normal' },
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
    { id: 'starters_stage_1', name: 'Kanto Trio', desc: 'Win a Stage 1 run starting with each of Bulbasaur, Charmander, and Squirtle', icon: '🌿', category: 'tower' },
    { id: 'starters_stage_2', name: 'Johto Trio', desc: 'Win a Stage 2 run starting with each of Chikorita, Cyndaquil, and Totodile', icon: '🍃', category: 'tower' },
    { id: 'starters_stage_3', name: 'Hoenn Trio', desc: 'Win a Stage 3 run starting with each of Treecko, Torchic, and Mudkip', icon: '🌊', category: 'tower' },
    { id: 'starters_stage_4', name: 'Sinnoh Trio', desc: 'Win a Stage 4 run starting with each of Turtwig, Chimchar, and Piplup', icon: '⛰️', category: 'tower' },
    { id: 'starters_stage_5', name: 'Unova Trio', desc: 'Win a Stage 5 run starting with each of Snivy, Tepig, and Oshawott', icon: '🌀', category: 'tower' },
    { id: 'pokedex_complete', name: 'Gotta Catch \'Em All', desc: 'Catch all Gen 1 Pokémon across any number of runs', icon: '📖', category: 'general' },
    { id: 'shinydex_complete', name: 'Shiny Hunter', desc: 'Catch a shiny version of every Gen 1 Pokémon', icon: '✨', category: 'general' },
    { id: 'shinydex_all', name: 'Ultimate Shiny Hunter', desc: 'Catch a shiny version of every Pokémon across all gens', icon: '🌟', category: 'general' },
    { id: 'pokedex_gen2', name: 'Johto Completionist', desc: 'Catch all Gen 2 Pokémon across any number of runs', icon: '📗', category: 'general' },
    { id: 'pokedex_gen3', name: 'Hoenn Completionist', desc: 'Catch all Gen 3 Pokémon across any number of runs', icon: '📘', category: 'general' },
    { id: 'pokedex_gen4', name: 'Sinnoh Completionist', desc: 'Catch all Gen 4 Pokémon across any number of runs', icon: '📙', category: 'general' },
    { id: 'pokedex_gen5', name: 'Unova Completionist', desc: 'Catch all Gen 5 Pokémon across any number of runs', icon: '📕', category: 'general' },
    { id: 'max_stats_1', name: 'First Peak', desc: 'Max out 1 stat on a single Pokémon', icon: '📈', category: 'general' },
    { id: 'max_stats_2', name: 'Double Peak', desc: 'Max out 2 stats on a single Pokémon', icon: '📊', category: 'general' },
    { id: 'max_stats_3', name: 'Triple Peak', desc: 'Max out 3 stats on a single Pokémon', icon: '🔝', category: 'general' },
    { id: 'max_stats_4', name: 'Quad Peak', desc: 'Max out 4 stats on a single Pokémon', icon: '💪', category: 'general' },
    { id: 'max_stats_all', name: 'Perfect Specimen', desc: 'Max out all 6 stats on a single Pokémon', icon: '🏅', category: 'general' },
    { id: 'shinydex_100', name: 'Shiny Spark', desc: 'Catch 100 different shiny Pokémon', icon: '⭐', category: 'general' },
    { id: 'shinydex_200', name: 'Shiny Flash', desc: 'Catch 200 different shiny Pokémon', icon: '💥', category: 'general' },
    { id: 'shinydex_300', name: 'Shiny Blaze', desc: 'Catch 300 different shiny Pokémon', icon: '🔥', category: 'general' },
    { id: 'shinydex_400', name: 'Shiny Storm', desc: 'Catch 400 different shiny Pokémon', icon: '⚡', category: 'general' },
    { id: 'shinydex_500', name: 'Shiny Legend', desc: 'Catch 500 different shiny Pokémon', icon: '💎', category: 'general' },
    { id: 'shinydex_600', name: 'Shiny Immortal', desc: 'Catch 600 different shiny Pokémon', icon: '👑', category: 'general' },
  ];

  function renderAchievements(container) {
    const unlocked = new Set(JSON.parse(localStorage.getItem('poke_achievements') || '[]'));

    const categories = {
      normal: ACHIEVEMENTS.filter(a => a.category === 'normal'),
      tower: ACHIEVEMENTS.filter(a => a.category === 'tower'),
      general: ACHIEVEMENTS.filter(a => a.category === 'general'),
    };

    const unlockedCount = unlocked.size;
    const totalCount = ACHIEVEMENTS.length;

    container.innerHTML = `
      <div style="margin-bottom: 20px; text-align: center;">
        <div style="font-size: 24px; font-weight: 600; color: rgba(139, 92, 246, 1); margin-bottom: 8px;">
          ${unlockedCount} / ${totalCount}
        </div>
        <div style="font-size: 13px; color: rgba(235, 235, 245, 0.6);">Achievements Unlocked</div>
      </div>

      <div style="margin-bottom: 24px;">
        <div style="font-size: 14px; font-weight: 600; margin-bottom: 12px; color: rgba(235, 235, 245, 0.9);">🏆 Championship</div>
        <div class="pse-grid" style="grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));">
          ${categories.normal.map(ach => renderAchievementCard(ach, unlocked.has(ach.id))).join('')}
        </div>
      </div>

      <div style="margin-bottom: 24px;">
        <div style="font-size: 14px; font-weight: 600; margin-bottom: 12px; color: rgba(235, 235, 245, 0.9);">🗼 Battle Tower</div>
        <div class="pse-grid" style="grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));">
          ${categories.tower.map(ach => renderAchievementCard(ach, unlocked.has(ach.id))).join('')}
        </div>
      </div>

      <div style="margin-bottom: 24px;">
        <div style="font-size: 14px; font-weight: 600; margin-bottom: 12px; color: rgba(235, 235, 245, 0.9);">📚 General</div>
        <div class="pse-grid" style="grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));">
          ${categories.general.map(ach => renderAchievementCard(ach, unlocked.has(ach.id))).join('')}
        </div>
      </div>
    `;

    // Add click handlers
    container.querySelectorAll('.pse-achievement-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.id;
        const isUnlocked = unlocked.has(id);

        if (isUnlocked) {
          unlocked.delete(id);
        } else {
          unlocked.add(id);
        }

        localStorage.setItem('poke_achievements', JSON.stringify([...unlocked]));
        renderContent();
      });
    });
  }

  function renderAchievementCard(achievement, isUnlocked) {
    return `
      <div class="pse-achievement-card ${isUnlocked ? 'unlocked' : 'locked'}" data-id="${achievement.id}" style="
        padding: 16px;
        background: ${isUnlocked ? 'rgba(139, 92, 246, 0.1)' : 'rgba(255, 255, 255, 0.02)'};
        border: 0.5px solid ${isUnlocked ? 'rgba(139, 92, 246, 0.3)' : 'rgba(255, 255, 255, 0.05)'};
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        opacity: ${isUnlocked ? '1' : '0.5'};
      " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 16px rgba(0,0,0,0.3)';" onmouseout="this.style.transform=''; this.style.boxShadow='';">
        <div style="font-size: 32px; text-align: center; margin-bottom: 8px;">${achievement.icon}</div>
        <div style="font-size: 13px; font-weight: 600; text-align: center; margin-bottom: 4px; color: ${isUnlocked ? 'rgba(139, 92, 246, 1)' : 'rgba(235, 235, 245, 0.7)'};">
          ${achievement.name}
        </div>
        <div style="font-size: 11px; text-align: center; color: rgba(235, 235, 245, 0.5); line-height: 1.4;">
          ${achievement.desc}
        </div>
        ${isUnlocked ? '<div style="text-align: center; margin-top: 8px; font-size: 16px;">✓</div>' : ''}
      </div>
    `;
  }

  function renderSettings(container) {
    const eliteWins = localStorage.getItem('poke_elite_wins') || '0';
    const winStreak = localStorage.getItem('poke_win_streak') || '0';
    const lastRunWon = localStorage.getItem('poke_last_run_won') || 'false';

    container.innerHTML = `
      <div style="max-width: 500px;">
        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 8px; font-size: 13px; color: rgba(235, 235, 245, 0.7);">Elite Wins</label>
          <input type="number" id="pse-elite-wins" value="${eliteWins}" style="width: 100%; padding: 10px; background: rgba(255, 255, 255, 0.04); border: 0.5px solid rgba(255, 255, 255, 0.1); border-radius: 8px; color: rgba(235, 235, 245, 0.9); font-size: 14px;">
        </div>
        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 8px; font-size: 13px; color: rgba(235, 235, 245, 0.7);">Win Streak</label>
          <input type="number" id="pse-win-streak" value="${winStreak}" style="width: 100%; padding: 10px; background: rgba(255, 255, 255, 0.04); border: 0.5px solid rgba(255, 255, 255, 0.1); border-radius: 8px; color: rgba(235, 235, 245, 0.9); font-size: 14px;">
        </div>
        <div style="margin-bottom: 20px;">
          <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; color: rgba(235, 235, 245, 0.7); cursor: pointer;">
            <input type="checkbox" id="pse-last-run-won" ${lastRunWon === 'true' ? 'checked' : ''} style="width: 16px; height: 16px; cursor: pointer;">
            Last Run Won
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
      gui.classList.toggle('hidden');
      if (!gui.classList.contains('hidden')) {
        renderContent();
      }
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
