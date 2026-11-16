// Smogon 이름 → PokeAPI identifier
const ALIAS = {
  'indeedee-f': 'indeedee-female', 'indeedee': 'indeedee-male',
  'basculegion-f': 'basculegion-female', 'basculegion': 'basculegion-male',
  'meowstic-f': 'meowstic-female', 'meowstic': 'meowstic-male',
  'oinkologne-f': 'oinkologne-female', 'oinkologne': 'oinkologne-male',
  'ogerpon-wellspring': 'ogerpon-wellspring-mask', 'ogerpon-hearthflame': 'ogerpon-hearthflame-mask',
  'ogerpon-cornerstone': 'ogerpon-cornerstone-mask', 'urshifu': 'urshifu-single-strike',
  'aegislash': 'aegislash-shield', 'mimikyu': 'mimikyu-disguised', 'lycanroc': 'lycanroc-midday',
  'toxtricity': 'toxtricity-amped', 'eiscue': 'eiscue-ice', 'morpeko': 'morpeko-full-belly',
  'tatsugiri': 'tatsugiri-curly', 'palafin': 'palafin-zero', 'maushold': 'maushold-family-of-four',
  'dudunsparce': 'dudunsparce-two-segment', 'squawkabilly': 'squawkabilly-green-plumage',
  'landorus': 'landorus-incarnate', 'tornadus': 'tornadus-incarnate', 'thundurus': 'thundurus-incarnate',
  'enamorus': 'enamorus-incarnate', 'giratina': 'giratina-altered', 'deoxys': 'deoxys-normal',
  'minior': 'minior-red-meteor', 'wishiwashi': 'wishiwashi-solo', 'darmanitan': 'darmanitan-standard',
  'zygarde': 'zygarde-50', 'gourgeist': 'gourgeist-average', 'pumpkaboo': 'pumpkaboo-average',
  'floette-mega': 'floette-mega', 'keldeo': 'keldeo-ordinary', 'meloetta': 'meloetta-aria',
  'wormadam': 'wormadam-plant', 'shaymin': 'shaymin-land', 'basculin': 'basculin-red-striped',
  'zacian': 'zacian', 'zamazenta': 'zamazenta', 'calyrex-shadow': 'calyrex-shadow', 'calyrex-ice': 'calyrex-ice',
};
export function makeToKey(dex) {
  const keys = new Set(dex.map(d => d.key));
  return function toKey(name) {
  let k = name.toLowerCase().replace(/[’'.:%]/g, '').replace(/é/g, 'e').replace(/\s+/g, '-');
  k = ALIAS[k] || k;
  if (keys.has(k)) return k;
  const pre = dex.find(d => d.key.startsWith(k + '-'));
  return pre ? pre.key : null;
  };
}

