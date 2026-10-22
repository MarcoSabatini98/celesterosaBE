'use strict';

// Dati statici del catalogo: brand e tassonomia categorie con i relativi
// attributi EAV. Consumati dai seeders. `s` = string, `n` = number,
// `e` = enum, `b` = boolean. `f` = filtrabile, `r` = obbligatorio.

const brands = [
  { name: 'Fender', website: 'https://www.fender.com' },
  { name: 'Gibson', website: 'https://www.gibson.com' },
  { name: 'Ibanez', website: 'https://www.ibanez.com' },
  { name: 'Yamaha', website: 'https://www.yamaha.com' },
  { name: 'Roland', website: 'https://www.roland.com' },
  { name: 'Korg', website: 'https://www.korg.com' },
  { name: 'Nord', website: 'https://www.nordkeyboards.com' },
  { name: 'Casio', website: 'https://www.casio.com' },
  { name: 'Pearl', website: 'https://pearldrum.com' },
  { name: 'Marshall', website: 'https://marshall.com' },
  { name: 'Boss', website: 'https://www.boss.info' },
  { name: 'Shure', website: 'https://www.shure.com' },
  { name: 'Audio-Technica', website: 'https://www.audio-technica.com' },
  { name: 'Pioneer DJ', website: 'https://www.pioneerdj.com' },
  { name: 'Selmer', website: 'https://www.selmer.fr' },
  { name: 'Focusrite', website: 'https://focusrite.com' },
];

// Attributi comuni riusati in più categorie.
const A = {
  numCorde: { code: 'num_corde', label: 'Numero corde', t: 'n', f: true },
  pickup: { code: 'tipo_pickup', label: 'Tipo pickup', t: 'e', f: true, options: ['Single coil', 'Humbucker', 'P90', 'Active', 'Misto'] },
  legnoCorpo: { code: 'legno_corpo', label: 'Legno corpo', t: 's', f: true },
  legnoTastiera: { code: 'legno_tastiera', label: 'Legno tastiera', t: 's', f: true },
  scala: { code: 'scala', label: 'Scala', t: 'n', unit: '"' },
  tasti: { code: 'num_tasti', label: 'Numero tasti', t: 'n', f: true },
  tonalita: { code: 'tonalita', label: 'Tonalità', t: 'e', f: true, options: ['Do (C)', 'Sib (Bb)', 'Mib (Eb)', 'Fa (F)', 'La (A)'] },
};

// Tassonomia: top-level → subcategorie (con attributi EAV).
const taxonomy = [
  {
    name: 'Chitarre & Bassi',
    description: 'Chitarre elettriche, acustiche, classiche e bassi.',
    children: [
      {
        name: 'Chitarre Elettriche',
        attrs: [A.numCorde, A.pickup, A.legnoCorpo, A.legnoTastiera, A.scala,
          { code: 'ponte', label: 'Tipo ponte', t: 'e', f: true, options: ['Fixed', 'Tremolo', 'Floyd Rose'] }],
      },
      {
        name: 'Chitarre Acustiche',
        attrs: [A.numCorde, A.legnoCorpo,
          { code: 'tipo_cassa', label: 'Tipo cassa', t: 'e', f: true, options: ['Dreadnought', 'Folk', 'Jumbo', 'Parlor'] },
          { code: 'elettrificata', label: 'Elettrificata', t: 'b', f: true }],
      },
      {
        name: 'Chitarre Classiche',
        attrs: [A.numCorde, A.legnoCorpo,
          { code: 'misura', label: 'Misura', t: 'e', f: true, options: ['4/4', '3/4', '1/2', '1/4'] }],
      },
      {
        name: 'Bassi Elettrici',
        attrs: [A.numCorde, A.pickup, A.legnoCorpo, A.scala,
          { code: 'attivo', label: 'Elettronica attiva', t: 'b', f: true }],
      },
    ],
  },
  {
    name: 'Tastiere & Piano',
    description: 'Pianoforti digitali, synth, workstation e tastiere MIDI.',
    children: [
      {
        name: 'Pianoforti Digitali',
        attrs: [A.tasti,
          { code: 'tasti_pesati', label: 'Tasti pesati', t: 'b', f: true },
          { code: 'polifonia', label: 'Polifonia', t: 'n', unit: 'voci' }],
      },
      {
        name: 'Synth & Workstation',
        attrs: [A.tasti,
          { code: 'tipo_sintesi', label: 'Tipo sintesi', t: 'e', f: true, options: ['Analogica', 'Digitale', 'FM', 'Wavetable', 'Virtual Analog'] },
          { code: 'polifonia', label: 'Polifonia', t: 'n', unit: 'voci' }],
      },
      {
        name: 'Tastiere MIDI',
        attrs: [A.tasti,
          { code: 'connettivita', label: 'Connettività', t: 'e', f: true, options: ['USB', 'USB + DIN MIDI', 'Bluetooth'] },
          { code: 'pad', label: 'Pad performance', t: 'n' }],
      },
    ],
  },
  {
    name: 'Fiati',
    description: 'Strumenti a fiato: legni e ottoni.',
    children: [
      {
        name: 'Legni',
        attrs: [A.tonalita,
          { code: 'materiale', label: 'Materiale', t: 'e', f: true, options: ['Ottone laccato', 'Argentato', 'ABS', 'Legno'] },
          { code: 'tipo', label: 'Tipo', t: 'e', f: true, options: ['Sassofono', 'Clarinetto', 'Flauto', 'Oboe'] }],
      },
      {
        name: 'Ottoni',
        attrs: [A.tonalita,
          { code: 'materiale', label: 'Materiale', t: 'e', f: true, options: ['Ottone laccato', 'Argentato', 'Oro rosa'] },
          { code: 'tipo', label: 'Tipo', t: 'e', f: true, options: ['Tromba', 'Trombone', 'Flicorno', 'Tuba'] }],
      },
    ],
  },
  {
    name: 'Archi',
    description: 'Violini, viole, violoncelli e contrabbassi.',
    children: [
      {
        name: 'Violini',
        attrs: [{ code: 'misura', label: 'Misura', t: 'e', r: true, f: true, options: ['4/4', '3/4', '1/2', '1/4', '1/8'] },
          { code: 'fascia', label: 'Fascia', t: 'e', f: true, options: ['Studio', 'Intermedio', 'Maestro'] }],
      },
      {
        name: 'Violoncelli',
        attrs: [{ code: 'misura', label: 'Misura', t: 'e', r: true, f: true, options: ['4/4', '3/4', '1/2'] }],
      },
    ],
  },
  {
    name: 'Batterie & Percussioni',
    description: 'Batterie acustiche, elettroniche e percussioni.',
    children: [
      {
        name: 'Batterie Acustiche',
        attrs: [{ code: 'num_pezzi', label: 'Numero pezzi', t: 'n', f: true },
          { code: 'materiale_fusti', label: 'Materiale fusti', t: 'e', f: true, options: ['Acero', 'Betulla', 'Mogano', 'Pioppo'] }],
      },
      {
        name: 'Batterie Elettroniche',
        attrs: [{ code: 'num_pad', label: 'Numero pad', t: 'n', f: true },
          { code: 'modulo', label: 'Modulo suoni', t: 's' }],
      },
      {
        name: 'Percussioni',
        attrs: [{ code: 'tipo', label: 'Tipo', t: 'e', f: true, options: ['Cajon', 'Congas', 'Bongos', 'Tamburello'] }],
      },
    ],
  },
  {
    name: 'Studio & Audio Pro',
    description: 'Interfacce audio, monitor da studio e microfoni.',
    children: [
      {
        name: 'Interfacce Audio',
        attrs: [{ code: 'canali_in', label: 'Ingressi', t: 'n', f: true },
          { code: 'canali_out', label: 'Uscite', t: 'n' },
          { code: 'connessione', label: 'Connessione', t: 'e', f: true, options: ['USB-C', 'USB-B', 'Thunderbolt'] }],
      },
      {
        name: 'Microfoni',
        attrs: [{ code: 'tipo', label: 'Tipo', t: 'e', f: true, options: ['Dinamico', 'Condensatore', 'Nastro'] },
          { code: 'pattern', label: 'Diagramma polare', t: 'e', f: true, options: ['Cardioide', 'Omni', 'Figura 8', 'Multi'] }],
      },
      {
        name: 'Monitor da Studio',
        attrs: [{ code: 'woofer', label: 'Woofer', t: 'n', unit: '"', f: true },
          { code: 'potenza', label: 'Potenza', t: 'n', unit: 'W' }],
      },
    ],
  },
  {
    name: 'Amplificazione',
    description: 'Amplificatori per chitarra, basso e diffusori.',
    children: [
      {
        name: 'Ampli Chitarra',
        attrs: [{ code: 'potenza', label: 'Potenza', t: 'n', unit: 'W', f: true },
          { code: 'tecnologia', label: 'Tecnologia', t: 'e', f: true, options: ['Valvolare', 'Solid State', 'Modeling'] }],
      },
      {
        name: 'Ampli Basso',
        attrs: [{ code: 'potenza', label: 'Potenza', t: 'n', unit: 'W', f: true }],
      },
    ],
  },
  {
    name: 'Effetti & Pedali',
    description: 'Pedali ed effetti per chitarra e basso.',
    children: [
      {
        name: 'Pedali Singoli',
        attrs: [{ code: 'tipo_effetto', label: 'Tipo effetto', t: 'e', f: true, options: ['Overdrive', 'Distorsione', 'Delay', 'Reverb', 'Modulazione', 'Wah'] }],
      },
      {
        name: 'Multieffetto',
        attrs: [{ code: 'preset', label: 'Numero preset', t: 'n' }],
      },
    ],
  },
  {
    name: 'DJ',
    description: 'Controller, mixer e lettori per DJ.',
    children: [
      {
        name: 'Controller DJ',
        attrs: [{ code: 'canali', label: 'Canali', t: 'n', f: true },
          { code: 'software', label: 'Software incluso', t: 's' }],
      },
    ],
  },
  {
    name: 'Accessori',
    description: 'Corde, plettri, cavi, borse e supporti.',
    children: [
      { name: 'Corde', attrs: [{ code: 'strumento', label: 'Strumento', t: 'e', f: true, options: ['Chitarra elettrica', 'Chitarra acustica', 'Basso', 'Classica'] }, { code: 'scalatura', label: 'Scalatura', t: 's' }] },
      { name: 'Cavi', attrs: [{ code: 'lunghezza', label: 'Lunghezza', t: 'n', unit: 'm', f: true }, { code: 'connettori', label: 'Connettori', t: 's' }] },
      { name: 'Borse & Custodie', attrs: [{ code: 'compatibilita', label: 'Compatibilità', t: 's' }] },
    ],
  },
  {
    name: 'Spartiti',
    description: 'Spartiti, metodi e libri musicali.',
    children: [
      { name: 'Metodi & Libri', attrs: [{ code: 'strumento', label: 'Strumento', t: 's', f: true }, { code: 'livello', label: 'Livello', t: 'e', f: true, options: ['Principiante', 'Intermedio', 'Avanzato'] }] },
    ],
  },
];

module.exports = { brands, taxonomy };
