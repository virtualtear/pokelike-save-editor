// ==UserScript==
// @name         Pokelike Save Editor
// @namespace    https://github.com/virtualtear/pokelike-save-editor
// @version      2.4.0
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
    currentView: 'home',
    searchQuery: '',
    editingHofIndex: null,
    editingTeamIndex: null,
  };

  // ─── Pokemon Data ────────────────────────────────────────────────────────────
  const POKEMON_LIST = [
    { id: 1, name: 'Bulbasaur' }, { id: 2, name: 'Ivysaur' }, { id: 3, name: 'Venusaur' },
    { id: 4, name: 'Charmander' }, { id: 5, name: 'Charmeleon' }, { id: 6, name: 'Charizard' },
    { id: 7, name: 'Squirtle' }, { id: 8, name: 'Wartortle' }, { id: 9, name: 'Blastoise' },
    { id: 10, name: 'Caterpie' }, { id: 11, name: 'Metapod' }, { id: 12, name: 'Butterfree' },
    { id: 13, name: 'Weedle' }, { id: 14, name: 'Kakuna' }, { id: 15, name: 'Beedrill' },
    { id: 16, name: 'Pidgey' }, { id: 17, name: 'Pidgeotto' }, { id: 18, name: 'Pidgeot' },
    { id: 19, name: 'Rattata' }, { id: 20, name: 'Raticate' }, { id: 21, name: 'Spearow' },
    { id: 22, name: 'Fearow' }, { id: 23, name: 'Ekans' }, { id: 24, name: 'Arbok' },
    { id: 25, name: 'Pikachu' }, { id: 26, name: 'Raichu' }, { id: 27, name: 'Sandshrew' },
    { id: 28, name: 'Sandslash' }, { id: 29, name: 'Nidoran-f' }, { id: 30, name: 'Nidorina' },
    { id: 31, name: 'Nidoqueen' }, { id: 32, name: 'Nidoran-m' }, { id: 33, name: 'Nidorino' },
    { id: 34, name: 'Nidoking' }, { id: 35, name: 'Clefairy' }, { id: 36, name: 'Clefable' },
    { id: 37, name: 'Vulpix' }, { id: 38, name: 'Ninetales' }, { id: 39, name: 'Jigglypuff' },
    { id: 40, name: 'Wigglytuff' }, { id: 41, name: 'Zubat' }, { id: 42, name: 'Golbat' },
    { id: 43, name: 'Oddish' }, { id: 44, name: 'Gloom' }, { id: 45, name: 'Vileplume' },
    { id: 46, name: 'Paras' }, { id: 47, name: 'Parasect' }, { id: 48, name: 'Venonat' },
    { id: 49, name: 'Venomoth' }, { id: 50, name: 'Diglett' }, { id: 51, name: 'Dugtrio' },
    { id: 52, name: 'Meowth' }, { id: 53, name: 'Persian' }, { id: 54, name: 'Psyduck' },
    { id: 55, name: 'Golduck' }, { id: 56, name: 'Mankey' }, { id: 57, name: 'Primeape' },
    { id: 58, name: 'Growlithe' }, { id: 59, name: 'Arcanine' }, { id: 60, name: 'Poliwag' },
    { id: 61, name: 'Poliwhirl' }, { id: 62, name: 'Poliwrath' }, { id: 63, name: 'Abra' },
    { id: 64, name: 'Kadabra' }, { id: 65, name: 'Alakazam' }, { id: 66, name: 'Machop' },
    { id: 67, name: 'Machoke' }, { id: 68, name: 'Machamp' }, { id: 69, name: 'Bellsprout' },
    { id: 70, name: 'Weepinbell' }, { id: 71, name: 'Victreebel' }, { id: 72, name: 'Tentacool' },
    { id: 73, name: 'Tentacruel' }, { id: 74, name: 'Geodude' }, { id: 75, name: 'Graveler' },
    { id: 76, name: 'Golem' }, { id: 77, name: 'Ponyta' }, { id: 78, name: 'Rapidash' },
    { id: 79, name: 'Slowpoke' }, { id: 80, name: 'Slowbro' }, { id: 81, name: 'Magnemite' },
    { id: 82, name: 'Magneton' }, { id: 83, name: 'Farfetchd' }, { id: 84, name: 'Doduo' },
    { id: 85, name: 'Dodrio' }, { id: 86, name: 'Seel' }, { id: 87, name: 'Dewgong' },
    { id: 88, name: 'Grimer' }, { id: 89, name: 'Muk' }, { id: 90, name: 'Shellder' },
    { id: 91, name: 'Cloyster' }, { id: 92, name: 'Gastly' }, { id: 93, name: 'Haunter' },
    { id: 94, name: 'Gengar' }, { id: 95, name: 'Onix' }, { id: 96, name: 'Drowzee' },
    { id: 97, name: 'Hypno' }, { id: 98, name: 'Krabby' }, { id: 99, name: 'Kingler' },
    { id: 100, name: 'Voltorb' }, { id: 101, name: 'Electrode' }, { id: 102, name: 'Exeggcute' },
    { id: 103, name: 'Exeggutor' }, { id: 104, name: 'Cubone' }, { id: 105, name: 'Marowak' },
    { id: 106, name: 'Hitmonlee' }, { id: 107, name: 'Hitmonchan' }, { id: 108, name: 'Lickitung' },
    { id: 109, name: 'Koffing' }, { id: 110, name: 'Weezing' }, { id: 111, name: 'Rhyhorn' },
    { id: 112, name: 'Rhydon' }, { id: 113, name: 'Chansey' }, { id: 114, name: 'Tangela' },
    { id: 115, name: 'Kangaskhan' }, { id: 116, name: 'Horsea' }, { id: 117, name: 'Seadra' },
    { id: 118, name: 'Goldeen' }, { id: 119, name: 'Seaking' }, { id: 120, name: 'Staryu' },
    { id: 121, name: 'Starmie' }, { id: 122, name: 'Mr-mime' }, { id: 123, name: 'Scyther' },
    { id: 124, name: 'Jynx' }, { id: 125, name: 'Electabuzz' }, { id: 126, name: 'Magmar' },
    { id: 127, name: 'Pinsir' }, { id: 128, name: 'Tauros' }, { id: 129, name: 'Magikarp' },
    { id: 130, name: 'Gyarados' }, { id: 131, name: 'Lapras' }, { id: 132, name: 'Ditto' },
    { id: 133, name: 'Eevee' }, { id: 134, name: 'Vaporeon' }, { id: 135, name: 'Jolteon' },
    { id: 136, name: 'Flareon' }, { id: 137, name: 'Porygon' }, { id: 138, name: 'Omanyte' },
    { id: 139, name: 'Omastar' }, { id: 140, name: 'Kabuto' }, { id: 141, name: 'Kabutops' },
    { id: 142, name: 'Aerodactyl' }, { id: 143, name: 'Snorlax' }, { id: 144, name: 'Articuno' },
    { id: 145, name: 'Zapdos' }, { id: 146, name: 'Moltres' }, { id: 147, name: 'Dratini' },
    { id: 148, name: 'Dragonair' }, { id: 149, name: 'Dragonite' }, { id: 150, name: 'Mewtwo' },
    { id: 151, name: 'Mew' },
    // Gen 2
    { id: 152, name: 'Chikorita' }, { id: 153, name: 'Bayleef' }, { id: 154, name: 'Meganium' },
    { id: 155, name: 'Cyndaquil' }, { id: 156, name: 'Quilava' }, { id: 157, name: 'Typhlosion' },
    { id: 158, name: 'Totodile' }, { id: 159, name: 'Croconaw' }, { id: 160, name: 'Feraligatr' },
    { id: 161, name: 'Sentret' }, { id: 162, name: 'Furret' }, { id: 163, name: 'Hoothoot' },
    { id: 164, name: 'Noctowl' }, { id: 165, name: 'Ledyba' }, { id: 166, name: 'Ledian' },
    { id: 167, name: 'Spinarak' }, { id: 168, name: 'Ariados' }, { id: 169, name: 'Crobat' },
    { id: 170, name: 'Chinchou' }, { id: 171, name: 'Lanturn' }, { id: 172, name: 'Pichu' },
    { id: 173, name: 'Cleffa' }, { id: 174, name: 'Igglybuff' }, { id: 175, name: 'Togepi' },
    { id: 176, name: 'Togetic' }, { id: 177, name: 'Natu' }, { id: 178, name: 'Xatu' },
    { id: 179, name: 'Mareep' }, { id: 180, name: 'Flaaffy' }, { id: 181, name: 'Ampharos' },
    { id: 182, name: 'Bellossom' }, { id: 183, name: 'Marill' }, { id: 184, name: 'Azumarill' },
    { id: 185, name: 'Sudowoodo' }, { id: 186, name: 'Politoed' }, { id: 187, name: 'Hoppip' },
    { id: 188, name: 'Skiploom' }, { id: 189, name: 'Jumpluff' }, { id: 190, name: 'Aipom' },
    { id: 191, name: 'Sunkern' }, { id: 192, name: 'Sunflora' }, { id: 193, name: 'Yanma' },
    { id: 194, name: 'Wooper' }, { id: 195, name: 'Quagsire' }, { id: 196, name: 'Espeon' },
    { id: 197, name: 'Umbreon' }, { id: 198, name: 'Murkrow' }, { id: 199, name: 'Slowking' },
    { id: 200, name: 'Misdreavus' }, { id: 201, name: 'Unown' }, { id: 202, name: 'Wobbuffet' },
    { id: 203, name: 'Girafarig' }, { id: 204, name: 'Pineco' }, { id: 205, name: 'Forretress' },
    { id: 206, name: 'Dunsparce' }, { id: 207, name: 'Gligar' }, { id: 208, name: 'Steelix' },
    { id: 209, name: 'Snubbull' }, { id: 210, name: 'Granbull' }, { id: 211, name: 'Qwilfish' },
    { id: 212, name: 'Scizor' }, { id: 213, name: 'Shuckle' }, { id: 214, name: 'Heracross' },
    { id: 215, name: 'Sneasel' }, { id: 216, name: 'Teddiursa' }, { id: 217, name: 'Ursaring' },
    { id: 218, name: 'Slugma' }, { id: 219, name: 'Magcargo' }, { id: 220, name: 'Swinub' },
    { id: 221, name: 'Piloswine' }, { id: 222, name: 'Corsola' }, { id: 223, name: 'Remoraid' },
    { id: 224, name: 'Octillery' }, { id: 225, name: 'Delibird' }, { id: 226, name: 'Mantine' },
    { id: 227, name: 'Skarmory' }, { id: 228, name: 'Houndour' }, { id: 229, name: 'Houndoom' },
    { id: 230, name: 'Kingdra' }, { id: 231, name: 'Phanpy' }, { id: 232, name: 'Donphan' },
    { id: 233, name: 'Porygon2' }, { id: 234, name: 'Stantler' }, { id: 235, name: 'Smeargle' },
    { id: 236, name: 'Tyrogue' }, { id: 237, name: 'Hitmontop' }, { id: 238, name: 'Smoochum' },
    { id: 239, name: 'Elekid' }, { id: 240, name: 'Magby' }, { id: 241, name: 'Miltank' },
    { id: 242, name: 'Blissey' }, { id: 243, name: 'Raikou' }, { id: 244, name: 'Entei' },
    { id: 245, name: 'Suicune' }, { id: 246, name: 'Larvitar' }, { id: 247, name: 'Pupitar' },
    { id: 248, name: 'Tyranitar' }, { id: 249, name: 'Lugia' }, { id: 250, name: 'Ho-oh' },
    { id: 251, name: 'Celebi' },
    // Gen 3
    { id: 252, name: 'Treecko' }, { id: 253, name: 'Grovyle' }, { id: 254, name: 'Sceptile' },
    { id: 255, name: 'Torchic' }, { id: 256, name: 'Combusken' }, { id: 257, name: 'Blaziken' },
    { id: 258, name: 'Mudkip' }, { id: 259, name: 'Marshtomp' }, { id: 260, name: 'Swampert' },
    { id: 261, name: 'Poochyena' }, { id: 262, name: 'Mightyena' }, { id: 263, name: 'Zigzagoon' },
    { id: 264, name: 'Linoone' }, { id: 265, name: 'Wurmple' }, { id: 266, name: 'Silcoon' },
    { id: 267, name: 'Beautifly' }, { id: 268, name: 'Cascoon' }, { id: 269, name: 'Dustox' },
    { id: 270, name: 'Lotad' }, { id: 271, name: 'Lombre' }, { id: 272, name: 'Ludicolo' },
    { id: 273, name: 'Seedot' }, { id: 274, name: 'Nuzleaf' }, { id: 275, name: 'Shiftry' },
    { id: 276, name: 'Taillow' }, { id: 277, name: 'Swellow' }, { id: 278, name: 'Wingull' },
    { id: 279, name: 'Pelipper' }, { id: 280, name: 'Ralts' }, { id: 281, name: 'Kirlia' },
    { id: 282, name: 'Gardevoir' }, { id: 283, name: 'Surskit' }, { id: 284, name: 'Masquerain' },
    { id: 285, name: 'Shroomish' }, { id: 286, name: 'Breloom' }, { id: 287, name: 'Slakoth' },
    { id: 288, name: 'Vigoroth' }, { id: 289, name: 'Slaking' }, { id: 290, name: 'Nincada' },
    { id: 291, name: 'Ninjask' }, { id: 292, name: 'Shedinja' }, { id: 293, name: 'Whismur' },
    { id: 294, name: 'Loudred' }, { id: 295, name: 'Exploud' }, { id: 296, name: 'Makuhita' },
    { id: 297, name: 'Hariyama' }, { id: 298, name: 'Azurill' }, { id: 299, name: 'Nosepass' },
    { id: 300, name: 'Skitty' }, { id: 301, name: 'Delcatty' }, { id: 302, name: 'Sableye' },
    { id: 303, name: 'Mawile' }, { id: 304, name: 'Aron' }, { id: 305, name: 'Lairon' },
    { id: 306, name: 'Aggron' }, { id: 307, name: 'Meditite' }, { id: 308, name: 'Medicham' },
    { id: 309, name: 'Electrike' }, { id: 310, name: 'Manectric' }, { id: 311, name: 'Plusle' },
    { id: 312, name: 'Minun' }, { id: 313, name: 'Volbeat' }, { id: 314, name: 'Illumise' },
    { id: 315, name: 'Roselia' }, { id: 316, name: 'Gulpin' }, { id: 317, name: 'Swalot' },
    { id: 318, name: 'Carvanha' }, { id: 319, name: 'Sharpedo' }, { id: 320, name: 'Wailmer' },
    { id: 321, name: 'Wailord' }, { id: 322, name: 'Numel' }, { id: 323, name: 'Camerupt' },
    { id: 324, name: 'Torkoal' }, { id: 325, name: 'Spoink' }, { id: 326, name: 'Grumpig' },
    { id: 327, name: 'Spinda' }, { id: 328, name: 'Trapinch' }, { id: 329, name: 'Vibrava' },
    { id: 330, name: 'Flygon' }, { id: 331, name: 'Cacnea' }, { id: 332, name: 'Cacturne' },
    { id: 333, name: 'Swablu' }, { id: 334, name: 'Altaria' }, { id: 335, name: 'Zangoose' },
    { id: 336, name: 'Seviper' }, { id: 337, name: 'Lunatone' }, { id: 338, name: 'Solrock' },
    { id: 339, name: 'Barboach' }, { id: 340, name: 'Whiscash' }, { id: 341, name: 'Corphish' },
    { id: 342, name: 'Crawdaunt' }, { id: 343, name: 'Baltoy' }, { id: 344, name: 'Claydol' },
    { id: 345, name: 'Lileep' }, { id: 346, name: 'Cradily' }, { id: 347, name: 'Anorith' },
    { id: 348, name: 'Armaldo' }, { id: 349, name: 'Feebas' }, { id: 350, name: 'Milotic' },
    { id: 351, name: 'Castform' }, { id: 352, name: 'Kecleon' }, { id: 353, name: 'Shuppet' },
    { id: 354, name: 'Banette' }, { id: 355, name: 'Duskull' }, { id: 356, name: 'Dusclops' },
    { id: 357, name: 'Tropius' }, { id: 358, name: 'Chimecho' }, { id: 359, name: 'Absol' },
    { id: 360, name: 'Wynaut' }, { id: 361, name: 'Snorunt' }, { id: 362, name: 'Glalie' },
    { id: 363, name: 'Spheal' }, { id: 364, name: 'Sealeo' }, { id: 365, name: 'Walrein' },
    { id: 366, name: 'Clamperl' }, { id: 367, name: 'Huntail' }, { id: 368, name: 'Gorebyss' },
    { id: 369, name: 'Relicanth' }, { id: 370, name: 'Luvdisc' }, { id: 371, name: 'Bagon' },
    { id: 372, name: 'Shelgon' }, { id: 373, name: 'Salamence' }, { id: 374, name: 'Beldum' },
    { id: 375, name: 'Metang' }, { id: 376, name: 'Metagross' }, { id: 377, name: 'Regirock' },
    { id: 378, name: 'Regice' }, { id: 379, name: 'Registeel' }, { id: 380, name: 'Latias' },
    { id: 381, name: 'Latios' }, { id: 382, name: 'Kyogre' }, { id: 383, name: 'Groudon' },
    { id: 384, name: 'Rayquaza' }, { id: 385, name: 'Jirachi' }, { id: 386, name: 'Deoxys' },
    // Gen 4
    { id: 387, name: 'Turtwig' }, { id: 388, name: 'Grotle' }, { id: 389, name: 'Torterra' },
    { id: 390, name: 'Chimchar' }, { id: 391, name: 'Monferno' }, { id: 392, name: 'Infernape' },
    { id: 393, name: 'Piplup' }, { id: 394, name: 'Prinplup' }, { id: 395, name: 'Empoleon' },
    { id: 396, name: 'Starly' }, { id: 397, name: 'Staravia' }, { id: 398, name: 'Staraptor' },
    { id: 399, name: 'Bidoof' }, { id: 400, name: 'Bibarel' }, { id: 401, name: 'Kricketot' },
    { id: 402, name: 'Kricketune' }, { id: 403, name: 'Shinx' }, { id: 404, name: 'Luxio' },
    { id: 405, name: 'Luxray' }, { id: 406, name: 'Budew' }, { id: 407, name: 'Roserade' },
    { id: 408, name: 'Cranidos' }, { id: 409, name: 'Rampardos' }, { id: 410, name: 'Shieldon' },
    { id: 411, name: 'Bastiodon' }, { id: 412, name: 'Burmy' }, { id: 413, name: 'Wormadam' },
    { id: 414, name: 'Mothim' }, { id: 415, name: 'Combee' }, { id: 416, name: 'Vespiquen' },
    { id: 417, name: 'Pachirisu' }, { id: 418, name: 'Buizel' }, { id: 419, name: 'Floatzel' },
    { id: 420, name: 'Cherubi' }, { id: 421, name: 'Cherrim' }, { id: 422, name: 'Shellos' },
    { id: 423, name: 'Gastrodon' }, { id: 424, name: 'Ambipom' }, { id: 425, name: 'Drifloon' },
    { id: 426, name: 'Drifblim' }, { id: 427, name: 'Buneary' }, { id: 428, name: 'Lopunny' },
    { id: 429, name: 'Mismagius' }, { id: 430, name: 'Honchkrow' }, { id: 431, name: 'Glameow' },
    { id: 432, name: 'Purugly' }, { id: 433, name: 'Chingling' }, { id: 434, name: 'Stunky' },
    { id: 435, name: 'Skuntank' }, { id: 436, name: 'Bronzor' }, { id: 437, name: 'Bronzong' },
    { id: 438, name: 'Bonsly' }, { id: 439, name: 'Mime-jr' }, { id: 440, name: 'Happiny' },
    { id: 441, name: 'Chatot' }, { id: 442, name: 'Spiritomb' }, { id: 443, name: 'Gible' },
    { id: 444, name: 'Gabite' }, { id: 445, name: 'Garchomp' }, { id: 446, name: 'Munchlax' },
    { id: 447, name: 'Riolu' }, { id: 448, name: 'Lucario' }, { id: 449, name: 'Hippopotas' },
    { id: 450, name: 'Hippowdon' }, { id: 451, name: 'Skorupi' }, { id: 452, name: 'Drapion' },
    { id: 453, name: 'Croagunk' }, { id: 454, name: 'Toxicroak' }, { id: 455, name: 'Carnivine' },
    { id: 456, name: 'Finneon' }, { id: 457, name: 'Lumineon' }, { id: 458, name: 'Mantyke' },
    { id: 459, name: 'Snover' }, { id: 460, name: 'Abomasnow' }, { id: 461, name: 'Weavile' },
    { id: 462, name: 'Magnezone' }, { id: 463, name: 'Lickilicky' }, { id: 464, name: 'Rhyperior' },
    { id: 465, name: 'Tangrowth' }, { id: 466, name: 'Electivire' }, { id: 467, name: 'Magmortar' },
    { id: 468, name: 'Togekiss' }, { id: 469, name: 'Yanmega' }, { id: 470, name: 'Leafeon' },
    { id: 471, name: 'Glaceon' }, { id: 472, name: 'Gliscor' }, { id: 473, name: 'Mamoswine' },
    { id: 474, name: 'Porygon-z' }, { id: 475, name: 'Gallade' }, { id: 476, name: 'Probopass' },
    { id: 477, name: 'Dusknoir' }, { id: 478, name: 'Froslass' }, { id: 479, name: 'Rotom' },
    { id: 480, name: 'Uxie' }, { id: 481, name: 'Mesprit' }, { id: 482, name: 'Azelf' },
    { id: 483, name: 'Dialga' }, { id: 484, name: 'Palkia' }, { id: 485, name: 'Heatran' },
    { id: 486, name: 'Regigigas' }, { id: 487, name: 'Giratina' }, { id: 488, name: 'Cresselia' },
    { id: 489, name: 'Phione' }, { id: 490, name: 'Manaphy' }, { id: 491, name: 'Darkrai' },
    { id: 492, name: 'Shaymin' }, { id: 493, name: 'Arceus' },
    // Gen 5
    { id: 494, name: 'Victini' }, { id: 495, name: 'Snivy' }, { id: 496, name: 'Servine' },
    { id: 497, name: 'Serperior' }, { id: 498, name: 'Tepig' }, { id: 499, name: 'Pignite' },
    { id: 500, name: 'Emboar' }, { id: 501, name: 'Oshawott' }, { id: 502, name: 'Dewott' },
    { id: 503, name: 'Samurott' }, { id: 504, name: 'Patrat' }, { id: 505, name: 'Watchog' },
    { id: 506, name: 'Lillipup' }, { id: 507, name: 'Herdier' }, { id: 508, name: 'Stoutland' },
    { id: 509, name: 'Purrloin' }, { id: 510, name: 'Liepard' }, { id: 511, name: 'Pansage' },
    { id: 512, name: 'Simisage' }, { id: 513, name: 'Pansear' }, { id: 514, name: 'Simisear' },
    { id: 515, name: 'Panpour' }, { id: 516, name: 'Simipour' }, { id: 517, name: 'Munna' },
    { id: 518, name: 'Musharna' }, { id: 519, name: 'Pidove' }, { id: 520, name: 'Tranquill' },
    { id: 521, name: 'Unfezant' }, { id: 522, name: 'Blitzle' }, { id: 523, name: 'Zebstrika' },
    { id: 524, name: 'Roggenrola' }, { id: 525, name: 'Boldore' }, { id: 526, name: 'Gigalith' },
    { id: 527, name: 'Woobat' }, { id: 528, name: 'Swoobat' }, { id: 529, name: 'Drilbur' },
    { id: 530, name: 'Excadrill' }, { id: 531, name: 'Audino' }, { id: 532, name: 'Timburr' },
    { id: 533, name: 'Gurdurr' }, { id: 534, name: 'Conkeldurr' }, { id: 535, name: 'Tympole' },
    { id: 536, name: 'Palpitoad' }, { id: 537, name: 'Seismitoad' }, { id: 538, name: 'Throh' },
    { id: 539, name: 'Sawk' }, { id: 540, name: 'Sewaddle' }, { id: 541, name: 'Swadloon' },
    { id: 542, name: 'Leavanny' }, { id: 543, name: 'Venipede' }, { id: 544, name: 'Whirlipede' },
    { id: 545, name: 'Scolipede' }, { id: 546, name: 'Cottonee' }, { id: 547, name: 'Whimsicott' },
    { id: 548, name: 'Petilil' }, { id: 549, name: 'Lilligant' }, { id: 550, name: 'Basculin' },
    { id: 551, name: 'Sandile' }, { id: 552, name: 'Krokorok' }, { id: 553, name: 'Krookodile' },
    { id: 554, name: 'Darumaka' }, { id: 555, name: 'Darmanitan' }, { id: 556, name: 'Maractus' },
    { id: 557, name: 'Dwebble' }, { id: 558, name: 'Crustle' }, { id: 559, name: 'Scraggy' },
    { id: 560, name: 'Scrafty' }, { id: 561, name: 'Sigilyph' }, { id: 562, name: 'Yamask' },
    { id: 563, name: 'Cofagrigus' }, { id: 564, name: 'Tirtouga' }, { id: 565, name: 'Carracosta' },
    { id: 566, name: 'Archen' }, { id: 567, name: 'Archeops' }, { id: 568, name: 'Trubbish' },
    { id: 569, name: 'Garbodor' }, { id: 570, name: 'Zorua' }, { id: 571, name: 'Zoroark' },
    { id: 572, name: 'Minccino' }, { id: 573, name: 'Cinccino' }, { id: 574, name: 'Gothita' },
    { id: 575, name: 'Gothorita' }, { id: 576, name: 'Gothitelle' }, { id: 577, name: 'Solosis' },
    { id: 578, name: 'Duosion' }, { id: 579, name: 'Reuniclus' }, { id: 580, name: 'Ducklett' },
    { id: 581, name: 'Swanna' }, { id: 582, name: 'Vanillite' }, { id: 583, name: 'Vanillish' },
    { id: 584, name: 'Vanilluxe' }, { id: 585, name: 'Deerling' }, { id: 586, name: 'Sawsbuck' },
    { id: 587, name: 'Emolga' }, { id: 588, name: 'Karrablast' }, { id: 589, name: 'Escavalier' },
    { id: 590, name: 'Foongus' }, { id: 591, name: 'Amoonguss' }, { id: 592, name: 'Frillish' },
    { id: 593, name: 'Jellicent' }, { id: 594, name: 'Alomomola' }, { id: 595, name: 'Joltik' },
    { id: 596, name: 'Galvantula' }, { id: 597, name: 'Ferroseed' }, { id: 598, name: 'Ferrothorn' },
    { id: 599, name: 'Klink' }, { id: 600, name: 'Klang' }, { id: 601, name: 'Klinklang' },
    { id: 602, name: 'Tynamo' }, { id: 603, name: 'Eelektrik' }, { id: 604, name: 'Eelektross' },
    { id: 605, name: 'Elgyem' }, { id: 606, name: 'Beheeyem' }, { id: 607, name: 'Litwick' },
    { id: 608, name: 'Lampent' }, { id: 609, name: 'Chandelure' }, { id: 610, name: 'Axew' },
    { id: 611, name: 'Fraxure' }, { id: 612, name: 'Haxorus' }, { id: 613, name: 'Cubchoo' },
    { id: 614, name: 'Beartic' }, { id: 615, name: 'Cryogonal' }, { id: 616, name: 'Shelmet' },
    { id: 617, name: 'Accelgor' }, { id: 618, name: 'Stunfisk' }, { id: 619, name: 'Mienfoo' },
    { id: 620, name: 'Mienshao' }, { id: 621, name: 'Druddigon' }, { id: 622, name: 'Golett' },
    { id: 623, name: 'Golurk' }, { id: 624, name: 'Pawniard' }, { id: 625, name: 'Bisharp' },
    { id: 626, name: 'Bouffalant' }, { id: 627, name: 'Rufflet' }, { id: 628, name: 'Braviary' },
    { id: 629, name: 'Vullaby' }, { id: 630, name: 'Mandibuzz' }, { id: 631, name: 'Heatmor' },
    { id: 632, name: 'Durant' }, { id: 633, name: 'Deino' }, { id: 634, name: 'Zweilous' },
    { id: 635, name: 'Hydreigon' }, { id: 636, name: 'Larvesta' }, { id: 637, name: 'Volcarona' },
    { id: 638, name: 'Cobalion' }, { id: 639, name: 'Terrakion' }, { id: 640, name: 'Virizion' },
    { id: 641, name: 'Tornadus' }, { id: 642, name: 'Thundurus' }, { id: 643, name: 'Reshiram' },
    { id: 644, name: 'Zekrom' }, { id: 645, name: 'Landorus' }, { id: 646, name: 'Kyurem' },
    { id: 647, name: 'Keldeo' }, { id: 648, name: 'Meloetta' }, { id: 649, name: 'Genesect' },
  ];

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

  // ─── Evolution Data & Helper ─────────────────────────────────────────────────
  // Legendary Pokemon (excluded from Battle Tower starters)
  const LEGENDARY_IDS = [
    144,145,146,150,151,                                             // Gen 1: Articuno, Zapdos, Moltres, Mewtwo, Mew
    243,244,245,249,250,251,                                         // Gen 2: Raikou, Entei, Suicune, Lugia, Ho-oh, Celebi
    377,378,379,380,381,382,383,384,385,386,                         // Gen 3
    480,481,482,483,484,485,486,487,488,489,490,491,492,493,         // Gen 4
    494,638,639,640,641,642,643,644,645,646,647,648,649,             // Gen 5
  ];
  const LEGENDARY_ID_SET = new Set(LEGENDARY_IDS);

  // Simplified evolution mapping - maps evolved form ID to base form ID
  const EVOLUTION_ROOTS = {};

  // Build the evolution roots map from the game's evolution data
  function buildEvolutionRoots() {
    // Gen 1-5 evolution chains (base -> stage1 -> stage2)
    const chains = {
      // Kanto starters
      1: [2, 3], 4: [5, 6], 7: [8, 9],
      // Johto starters
      152: [153, 154], 155: [156, 157], 158: [159, 160],
      // Hoenn starters
      252: [253, 254], 255: [256, 257], 258: [259, 260],
      // Sinnoh starters
      387: [388, 389], 390: [391, 392], 393: [394, 395],
      // Unova starters
      495: [496, 497], 498: [499, 500], 501: [502, 503],
      // Other common chains
      10: [11, 12], 13: [14, 15], 16: [17, 18], 19: [20], 21: [22], 23: [24], 25: [26],
      27: [28], 29: [30, 31], 32: [33, 34], 35: [36], 37: [38], 39: [40], 41: [42, 169],
      43: [44, 45], 46: [47], 48: [49], 50: [51], 52: [53], 54: [55], 56: [57], 58: [59],
      60: [61, 62], 63: [64, 65], 66: [67, 68], 69: [70, 71], 72: [73], 74: [75, 76],
      77: [78], 79: [80, 199], 81: [82, 462], 84: [85], 86: [87], 88: [89], 90: [91],
      92: [93, 94], 95: [208], 96: [97], 98: [99], 100: [101], 102: [103], 104: [105],
      109: [110], 111: [112, 464], 116: [117, 230], 118: [119], 120: [121], 123: [212],
      129: [130], 133: [134, 135, 136, 196, 197, 470, 471], 138: [139], 140: [141],
      147: [148, 149], 161: [162], 163: [164], 165: [166], 167: [168], 170: [171],
      172: [25], 173: [35], 174: [39], 175: [176, 468], 177: [178], 179: [180, 181],
      183: [184], 187: [188, 189], 191: [192], 194: [195], 204: [205], 209: [210],
      215: [461], 216: [217], 218: [219], 220: [221, 473], 223: [224], 228: [229],
      231: [232], 236: [106, 107, 237], 238: [124], 239: [125, 466], 240: [126, 467],
      246: [247, 248], 261: [262], 263: [264], 265: [266, 267], 268: [269], 270: [271, 272],
      273: [274, 275], 276: [277], 278: [279], 280: [281, 282, 475], 283: [284], 285: [286],
      287: [288, 289], 290: [291, 292], 293: [294, 295], 296: [297], 298: [183], 300: [301],
      304: [305, 306], 307: [308], 309: [310], 316: [317], 318: [319], 320: [321],
      322: [323], 325: [326], 328: [329, 330], 331: [332], 333: [334], 339: [340],
      341: [342], 343: [344], 345: [346], 347: [348], 349: [350], 353: [354], 355: [356, 477],
      360: [202], 361: [362], 363: [364, 365], 371: [372, 373], 374: [375, 376],
      396: [397, 398], 399: [400], 401: [402], 403: [404, 405], 406: [315, 407],
      408: [409], 410: [411], 415: [416], 418: [419], 420: [421], 422: [423], 425: [426],
      427: [428], 431: [432], 434: [435], 436: [437], 443: [444, 445], 446: [143],
      447: [448], 449: [450], 451: [452], 453: [454], 456: [457], 459: [460],
      504: [505], 506: [507, 508], 509: [510], 517: [518], 519: [520, 521], 522: [523],
      524: [525, 526], 527: [528], 529: [530], 532: [533, 534], 535: [536, 537],
      540: [541, 542], 543: [544, 545], 546: [547], 548: [549], 551: [552, 553],
      554: [555], 557: [558], 559: [560], 562: [563], 564: [565], 566: [567], 568: [569],
      570: [571], 572: [573], 574: [575, 576], 577: [578, 579], 580: [581], 582: [583, 584],
      585: [586], 588: [589], 590: [591], 592: [593], 595: [596], 597: [598], 599: [600, 601],
      602: [603, 604], 605: [606], 607: [608, 609], 610: [611, 612], 613: [614], 616: [617],
      619: [620], 622: [623], 624: [625], 627: [628], 629: [630], 633: [634, 635], 636: [637]
    };

    // Build reverse mapping
    for (const [baseId, evolutions] of Object.entries(chains)) {
      const base = parseInt(baseId);
      EVOLUTION_ROOTS[base] = base; // Base maps to itself
      evolutions.forEach(evoId => {
        EVOLUTION_ROOTS[evoId] = base;
      });
    }
  }

  // Get the base form (evolution line root) for any Pokemon ID
  function getEvoLineRoot(speciesId) {
    if (Object.keys(EVOLUTION_ROOTS).length === 0) {
      buildEvolutionRoots();
    }
    return EVOLUTION_ROOTS[speciesId] || speciesId;
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
  function renderContent() {
    const content = document.getElementById('pse-content');

    if (STATE.currentView === 'pokedex') {
      renderPokedex(content);
    } else if (STATE.currentView === 'shiny-dex') {
      renderShinyDex(content);
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

  function renderPokedex(container) {
    const dex = JSON.parse(localStorage.getItem('poke_dex') || '{}');

    container.innerHTML = `
      <input type="text" class="pse-search" placeholder="Search Pokémon..." id="pse-search-dex">
      <div class="pse-grid" id="pse-dex-grid"></div>
    `;

    const grid = document.getElementById('pse-dex-grid');
    const search = document.getElementById('pse-search-dex');

    function renderGrid(query = '') {
      const filtered = POKEMON_LIST.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase())
      );

      grid.innerHTML = filtered.map(p => {
        const owned = dex[p.id]?.caught;
        return `
          <div class="pse-card ${owned ? 'owned' : ''}" data-id="${p.id}">
            <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png" alt="${p.name}">
            <div class="pse-card-name">${p.name}</div>
          </div>
        `;
      }).join('');

      grid.querySelectorAll('.pse-card').forEach(card => {
        card.addEventListener('click', () => {
          const id = card.dataset.id;
          toggleDex(id);
        });
      });
    }

    search.addEventListener('input', e => renderGrid(e.target.value));
    renderGrid();
  }

  function toggleDex(id) {
    const dex = JSON.parse(localStorage.getItem('poke_dex') || '{}');
    const pokemon = POKEMON_LIST.find(p => p.id == id);

    if (dex[id] && dex[id].caught) {
      // If already caught, remove it completely
      delete dex[id];
    } else {
      // Add or update with caught: true
      dex[id] = {
        id: parseInt(id),
        name: pokemon.name,
        types: ['Normal'],
        spriteUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`,
        caught: true
      };
    }

    localStorage.setItem('poke_dex', JSON.stringify(dex));
    renderContent();
  }

  function renderShinyDex(container) {
    const shinyDex = JSON.parse(localStorage.getItem('poke_shiny_dex') || '{}');

    container.innerHTML = `
      <input type="text" class="pse-search" placeholder="Search Pokémon..." id="pse-search-shiny">
      <div class="pse-grid" id="pse-shiny-grid"></div>
    `;

    const grid = document.getElementById('pse-shiny-grid');
    const search = document.getElementById('pse-search-shiny');

    function renderGrid(query = '') {
      const filtered = POKEMON_LIST.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase())
      );

      grid.innerHTML = filtered.map(p => {
        const owned = shinyDex[p.id];
        return `
          <div class="pse-card ${owned ? 'owned' : ''}" data-id="${p.id}">
            <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${p.id}.png" alt="${p.name}">
            <div class="pse-card-name">${p.name}</div>
          </div>
        `;
      }).join('');

      grid.querySelectorAll('.pse-card').forEach(card => {
        card.addEventListener('click', () => {
          const id = card.dataset.id;
          toggleShiny(id);
        });
      });
    }

    search.addEventListener('input', e => renderGrid(e.target.value));
    renderGrid();
  }

  function toggleShiny(id) {
    const shinyDex = JSON.parse(localStorage.getItem('poke_shiny_dex') || '{}');
    const pokemon = POKEMON_LIST.find(p => p.id == id);

    if (shinyDex[id]) {
      delete shinyDex[id];
    } else {
      shinyDex[id] = {
        id: parseInt(id),
        name: pokemon.name,
        types: ['Normal'], // You'd need to add type data
        shinySpriteUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${id}.png`
      };
    }

    localStorage.setItem('poke_shiny_dex', JSON.stringify(shinyDex));
    renderContent();
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
        p.name.toLowerCase().includes(query.toLowerCase())
      );

      grid.innerHTML = filtered.map(p => `
        <div class="pse-card" data-id="${p.id}">
          <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png" alt="${p.name}">
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
      types: ['Normal'],
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
