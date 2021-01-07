const fs = require('fs');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const municipalitiesRaw = fs.readFileSync(
  '../mergeGeospatialData/output/places.json',
  'utf8'
);
const municipalities = JSON.parse(municipalitiesRaw);

const slugs1 = [];
const slugs2 = [];

const slugInfo = [];

const stateMap = [
  { original: 'Baden-Württemberg', short: 'bw' },
  { original: 'Bayern', short: 'bayern' },
  { original: 'Berlin', short: 'berlin' },
  { original: 'Brandenburg', short: 'bb' },
  { original: 'Bremen', short: 'bremen' },
  { original: 'Hamburg', short: 'hamburg' },
  { original: 'Hessen', short: 'hessen' },
  { original: 'Mecklenburg-Vorpommern', short: 'meckpom' },
  { original: 'Niedersachsen', short: 'niedersachsen' },
  { original: 'Nordrhein-Westfalen', short: 'nrw' },
  { original: 'Rheinland-Pfalz', short: 'rp' },
  { original: 'Saarland', short: 'saarland' },
  { original: 'Sachsen', short: 'sachsen' },
  { original: 'Sachsen-Anhalt', short: 'sachsen-anhalt' },
  { original: 'Schleswig-Holstein', short: 'sh' },
  { original: 'Thüringen', short: 'thueringen' },
];

const addState = (slug, municipality) => {
  return (
    slug +
    '-' +
    cleanString(stateMap.find(x => x.original === municipality.state).short)
  );
};

const addDistrict = (slug, municipality) => {
  return slug + '-' + cleanString(municipality.district);
};

const cleanString = string => {
  return (
    string
      // Individual cases
      .replaceAll('b.', 'bei ')
      .replaceAll('a.d.Aisch', 'an der Aisch')
      .replaceAll('a.d.Brend', 'an der Brend')
      .replaceAll('a.d.Brenz', 'an der Brenz')
      .replaceAll('a.d.Donau', 'an der Donau')
      .replaceAll('a.d.Iller', 'an der Iller')
      .replaceAll('a.d. Isar', 'an der Isar')
      .replaceAll('a.d.Kammel', 'an der Kammel')
      .replaceAll('a. d. Lahn', 'an der Lahn')
      .replaceAll('a. d. Laaber', 'an der Laaber')
      .replaceAll('a.d.Lederhecke', 'an der Lederhecke')
      .replaceAll('a.d.Pegnitz', 'an der Pegnitz')
      .replaceAll('a.d.Rhön', 'an der Rhön')
      .replaceAll('a.d.Rhot', 'an der Rhot')
      .replaceAll('a.d.Rodach', 'an der Rodach')
      .replaceAll('a.d.Rott', 'an der Rott')
      .replaceAll('a.d.Saale', 'an der Saale')
      .replaceAll('a.d. Uecker', 'an der Uecker')
      .replaceAll('a.d.Zenn', 'an der Zenn')
      .replaceAll('a.Auerberg', 'am Auerberg')
      .replaceAll('a.Brand', 'am Brand')
      .replaceAll('a.Darß', 'auf dem Darß')
      .replaceAll('a.Forst', 'am Forst')
      .replaceAll('a.Inn', 'am Inn')
      .replaceAll('a.Lech', 'am Lech')
      .replaceAll('a.Main', 'am Main')
      .replaceAll('a.Ries', 'am Ries')
      .replaceAll('a. Sand', 'am Sand')
      .replaceAll('a.See', 'am See')
      .replaceAll('i.Allgäu', 'im Allgäu')
      .replaceAll('i.Rottal', 'im Rottal')
      .replaceAll('i.Steigerwald', 'im Steigerwald')
      .replaceAll('i.Wald', 'im Wald')
      .replaceAll('i.Bay.', 'in Bayern')
      .replaceAll('i.NB', 'in Niederbayern')
      .replaceAll('i.UFr.', 'in Unterfranken')
      .replaceAll('i.d.OPf.', 'opf')
      .replaceAll('v.d.Rhön.', 'von der Rhön')
      .replaceAll('v. d. Höhe.', 'von der Höhe')
      .replaceAll('O.L.', 'Oberlausitz')
      .replaceAll('Erzgeb.', 'Erzgebirge')
      .replaceAll('Hann.', 'Hannoversch')
      .replaceAll('Thür.', 'Thüringen')
      .replaceAll('Vogtl.', 'Vogtland')
      .replaceAll('Westf.', 'Westfalen')
      // standardize
      .toLowerCase()
      .replaceAll(' - ', ' ')
      .replaceAll(/\s+/g, ' ')
      // special characters
      .replaceAll(' ', '-')
      .replaceAll('/', '-')
      .replaceAll('/', '-')
      .replaceAll('.', '')
      .replaceAll('(', '')
      .replaceAll(')', '')
      .replaceAll('ä', 'ae')
      .replaceAll('ü', 'ue')
      .replaceAll('ö', 'oe')
      .replaceAll('ß', 'ss')
      .replaceAll('ć', 'c')
      .replaceAll('č', 'c')
      .replaceAll('ě', 'e')
      .replaceAll('ó', 'o')
      .replaceAll('ł', 'l')
      .replaceAll('Ł', 'l')
      .replaceAll('ń', 'n')
      .replaceAll('ś', 's')
      .replaceAll('š', 's')
      .replaceAll('ž', 'z')
      .replaceAll('ź', 'z')
      // shorten Landkreis
      .replaceAll('landkreis', 'kreis')
      // safety
      .replaceAll(/-+/g, '-')
      .replaceAll(/\s+/g, '')
      .trim()
  );
};

const getSlugOption1 = municipality => {
  let slug = cleanString(municipality.name);

  let slugAddOns = 0;

  if (slugs1.includes(slug)) {
    slug = addState(slug, municipality);
    ++slugAddOns;
    if (slugs1.includes(slug)) {
      slug = addDistrict(slug, municipality);
      ++slugAddOns;
    }
  }
  slugs1.push(slug);

  return [slug, slugAddOns];
};

const getSlugOption2 = municipality => {
  let slug = municipality.name.toLowerCase().replace(' ', '-');
  slug = cleanString(slug);
  let slugAddOns = 0;

  if (slugs2.includes(slug)) {
    slug = addDistrict(slug, municipality);
    ++slugAddOns;
    if (slugs2.includes(slug)) {
      slug = addState(slug, municipality);
      ++slugAddOns;
    }
  }
  slugs2.push(slug);

  return [slug, slugAddOns];
};

for (const municipality of municipalities) {
  const [slug1, slugAddOns1] = getSlugOption1(municipality);
  const slugLength1 = slug1.length;
  const [slug2, slugAddOns2] = getSlugOption2(municipality);
  const slugLength2 = slug2.length;
  const { name, ags, state, district, population } = municipality;
  const zipCodes = municipality.zipCodes.join('; ');
  slugInfo.push({
    slug1,
    slugAddOns1,
    slugLength1,
    slug2,
    slugAddOns2,
    slugLength2,
    name,
    state,
    district,
    population,
    ags,
    zipCodes,
  });
}
console.log(slugInfo.slice(0, 1));
const uniqueSlugs1 = new Set(slugs1);
const uniqueSlugs2 = new Set(slugs2);
console.log('Slug alternative 1 unique :', slugs1.length === uniqueSlugs1.size);
console.log('Slug alternative 2 unique :', slugs2.length === uniqueSlugs2.size);

const csvWriter = createCsvWriter({
  path: './slug-comparison.csv',
  header: [
    { id: 'slug1', title: 'Slug Alt 1 (Bundesland, Kreis)' },
    { id: 'slugAddOns1', title: 'Slug Alt 1 Komplexität' },
    { id: 'slugLength1', title: 'Slug Alt 1 Länge' },
    { id: 'slug2', title: 'Slug Alt 2 (Kreis, Bundesland)' },
    { id: 'slugAddOns2', title: 'Slug Alt 2 Komplexität' },
    { id: 'slugLength2', title: 'Slug Alt 2 Länge' },
    { id: 'name', title: 'Stadt- oder Gemeindename' },
    { id: 'state', title: 'Bundesland' },
    { id: 'district', title: 'Kreis' },
    { id: 'population', title: 'Einwohner:innenzahl' },
    { id: 'ags', title: 'Allgemeiner Gemeindeschlüssel' },
    { id: 'zipCodes', title: 'Postleitzahlen' },
  ],
});

csvWriter
  .writeRecords(slugInfo) // returns a promise
  .then(() => {
    console.log('...Done');
  });
