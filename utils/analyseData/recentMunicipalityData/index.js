const fs = require('fs');
const csv = require('csv-parser');

// Params
const excludeMunicipalitiesWithoutPopulation = true;
const runDataTransform = false; // re runs initial data transform (takes longer)
const runDataMerge = false; // re runs initial data merge (takes longer)

// Utility
const readCSV = path => {
  return new Promise(res => {
    const arr = [];
    fs.createReadStream(path)
      .pipe(csv())
      .on('data', data => arr.push(data))
      .on('end', () => {
        res(arr);
      });
  });
};

// Steps
const transformGeodataGermany = async path => {
  const data = await readCSV(path);
  return new Promise(res => {
    const municipalities = [];
    const agsSet = [];
    for (const element of data) {
      const {
        GEMEINDE_AGS: ags,
        GEMEINDE_NAME: name,
        GEMEINDE_LAT: latitudeGeodataGermany,
        GEMEINDE_LON: longitudeGeodataGermany,
        POSTLEITZAHL: zipCode,
        ORT_NAME: municipalityDistrict,
        BUNDESLAND_NAME: state,
        REGIERUNGSBEZIRK_NAME: administrativeRegion,
        KREIS_NAME: district,
        KREIS_TYP: districtType,
        GEMEINDE_TYP: municipalityType,
      } = element;
      const existingIndex = agsSet.indexOf(ags);
      if (existingIndex === -1) {
        agsSet.push(ags);
        municipalities.push({
          ags,
          name,
          latitudeGeodataGermany,
          longitudeGeodataGermany,
          zipCodes: [zipCode],
          municipalityDistricts: [
            { name: municipalityDistrict, zipCodes: [zipCode] },
          ],
          state,
          administrativeRegion,
          district,
          districtType,
          municipalityType,
        });
      } else {
        municipalities[existingIndex].zipCodes.push(zipCode);
        const districtIndex = municipalities[
          existingIndex
        ].municipalityDistricts.findIndex(x => x.name === municipalityDistrict);

        if (districtIndex === -1) {
          municipalities[existingIndex].municipalityDistricts.push({
            name: municipalityDistrict,
            zipCodes: [zipCode],
          });
        } else {
          municipalities[existingIndex].municipalityDistricts[
            districtIndex
          ].zipCodes.push(zipCode);
        }
      }
    }
    console.log(municipalities[0]);
    res(municipalities);
  });
};

const transformDestatis = async path => {
  const data = await readCSV(path);
  return new Promise(res => {
    let municipalities = data.filter(el => el.gemeinde);
    municipalities = municipalities.map(el => {
      const {
        gemeindename: name,
        bezeichnung: travelRegion,
        verstaedterungschluessel: urbanicityCode,
        verstaedterungbezeichnung: urbanicity,
        laengengrad: longitude,
        breitengrad: latitude,
      } = el;
      const ags = `${el.land}${el.rb}${el.kreis}${el.gemeinde}`;
      const population = parseInt(el.bevoelkerung.replace(/\s/g, ''), 10);
      const populationMale = parseInt(el.maennlich.replace(/\s/g, ''), 10);
      const populationFemale = parseInt(el.weiblich.replace(/\s/g, ''), 10);
      const populationPerSquareKm = parseInt(el.jekm2.replace(/\s/g, ''), 10);

      return {
        ags,
        name,
        population,
        populationMale,
        populationFemale,
        populationPerSquareKm,
        longitude,
        latitude,
        travelRegion,
        urbanicity,
        urbanicityCode,
      };
    });
    if (excludeMunicipalitiesWithoutPopulation) {
      municipalities = municipalities.filter(e => e.population);
    }
    console.log(municipalities[0]);
    res(municipalities);
  });
};

const transformSearchZipCodes = async path => {
  const data = await readCSV(path);
  return new Promise(res => {
    const municipalities = [];
    const agsSet = [];
    for (const element of data) {
      const {
        osm_is: osmId,
        ags,
        ort: name,
        plz: zipCode,
        landkreis: district,
        bundesland: state,
      } = element;
      const existingIndex = agsSet.indexOf(ags);
      if (existingIndex === -1) {
        agsSet.push(ags);
        municipalities.push({
          ags,
          name,
          zipCodes: [zipCode],
          district,
          state,
          osmId,
        });
      } else {
        municipalities[existingIndex].zipCodes.push(zipCode);
      }
    }
    console.log(municipalities[0]);
    res(municipalities);
  });
};

const transformOpenGeoDb = async path => {
  const data = await readCSV(path);

  return new Promise(res => {
    // NOTE: can be cleaned up here,
    // but we’re just matching the ags
    // to get the name
    const municipalities = data.map(e => {
      const ags = `0${e.ags}`;
      return { ...e, ags };
    });
    res(municipalities);
  });
};

const transformData = async (shouldRunDataTransform = runDataTransform) => {
  if (shouldRunDataTransform) {
    // First run
    const dataGeodataGermany = await transformGeodataGermany(
      './data/4530_geodatendeutschland_1001_20210215.csv'
    );
    fs.writeFileSync(
      './output/logs/dataGeodataGermany.json',
      JSON.stringify(dataGeodataGermany, null, 2)
    );
    const dataDestatis = await transformDestatis(
      './data/AuszugGV4QAktuell.csv'
    );
    fs.writeFileSync(
      './output/logs/dataDestatis.json',
      JSON.stringify(dataDestatis, null, 2)
    );
    const dataSearchZipCodes = await transformSearchZipCodes(
      './data/zuordnung_plz_ort_landkreis.csv'
    );
    fs.writeFileSync(
      './output/logs/dataSearchZipCodes.json',
      JSON.stringify(dataSearchZipCodes, null, 2)
    );
    const dataOpenGeoDb = await transformOpenGeoDb('./data/DE.csv');
    fs.writeFileSync(
      './output/logs/dataOpenGeoDb.json',
      JSON.stringify(dataOpenGeoDb, null, 2)
    );
    return new Promise(res => {
      res({
        dataGeodataGermany,
        dataDestatis,
        dataSearchZipCodes,
        dataOpenGeoDb,
      });
    });
  }
  const rawGeodataGermany = fs.readFileSync(
    './output/logs/dataGeodataGermany.json',
    'utf8'
  );
  const dataGeodataGermany = JSON.parse(rawGeodataGermany);
  const rawDestatis = fs.readFileSync(
    './output/logs/dataDestatis.json',
    'utf8'
  );
  const dataDestatis = JSON.parse(rawDestatis);
  const rawSearchZipCodes = fs.readFileSync(
    './output/logs/dataSearchZipCodes.json',
    'utf8'
  );
  const dataSearchZipCodes = JSON.parse(rawSearchZipCodes);
  const rawOpenGeoDb = fs.readFileSync(
    './output/logs/dataOpenGeoDb.json',
    'utf8'
  );
  const dataOpenGeoDb = JSON.parse(rawOpenGeoDb);
  return new Promise(res => {
    res({
      dataGeodataGermany,
      dataDestatis,
      dataSearchZipCodes,
      dataOpenGeoDb,
    });
  });
};

const mergeData = async ({
  dataGeodataGermany,
  dataDestatis,
  dataSearchZipCodes,
  dataOpenGeoDb,
  shouldRunDataMerge = runDataMerge,
}) => {
  if (shouldRunDataMerge) {
    const dataMerged = dataDestatis.map(el => {
      const elementGeodataGermany = dataGeodataGermany.find(
        x => x.ags === el.ags
      );
      const elementSearchZipCodes = dataSearchZipCodes.find(
        x => x.ags === el.ags
      );
      const elementOpenGeoDb = dataOpenGeoDb.find(x => x.ags === el.ags);

      const nameGeodataGermany = elementGeodataGermany
        ? elementGeodataGermany.name
        : '';
      const nameSearchZipCodes = elementSearchZipCodes
        ? elementSearchZipCodes.name
        : '';
      const nameOpenGeoDb = elementOpenGeoDb ? elementOpenGeoDb.name : '';
      const nameDestatis = el.name;
      return {
        nameGeodataGermany,
        nameSearchZipCodes,
        nameDestatis,
        nameOpenGeoDb,
        ...elementGeodataGermany,
        ...elementSearchZipCodes,
        ...el,
      };
    });
    fs.writeFileSync(
      './output/logs/dataMerged.json',
      JSON.stringify(dataMerged, null, 2)
    );
    return dataMerged;
  }
  const rawDataMerged = fs.readFileSync(
    './output/logs/dataMerged.json',
    'utf8'
  );
  const dataMerged = JSON.parse(rawDataMerged);
  return dataMerged;
};

// Names
const resolveAbbreviations = string => {
  return (
    string
      // Individual cases
      .replace('b.', 'bei ')
      .replace('a.d.Aisch', 'an der Aisch')
      .replace('a.d.Alz', 'an der Alz')
      .replace('a.d.Brend', 'an der Brend')
      .replace('a.d.Brenz', 'an der Brenz')
      .replace('a.d.Donau', 'an der Donau')
      .replace('a.d.Iller', 'an der Iller')
      .replace('a.d. Isar', 'an der Isar')
      .replace('a.d.Kammel', 'an der Kammel')
      .replace('a. d. Lahn', 'an der Lahn')
      .replace('a.d. Lahn', 'an der Lahn')
      .replace('a. d. Laaber', 'an der Laaber')
      .replace('a.d.Lederhecke', 'an der Lederhecke')
      .replace('a.d.Pegnitz', 'an der Pegnitz')
      .replace('a.d.Rhön', 'an der Rhön')
      .replace('a.d.Rhot', 'an der Rhot')
      .replace('a.d.Rodach', 'an der Rodach')
      .replace('a.d.Rott', 'an der Rott')
      .replace('a.d.Glonn', 'an der Glonn')
      .replace('a.d.Saale', 'an der Saale')
      .replace('a. d. Fulda', 'an der Fulda')
      .replace('a.d. Uecker', 'an der Uecker')
      .replace('a.d.Zenn', 'an der Zenn')
      .replace('a.d.Zenn', 'an der Zenn')
      // NOTE: a.d. will be resolved generically
      .replace('a. d.', 'an der ')
      .replace('a.d.', 'an der ')
      .replace('a.Auerberg', 'am Auerberg')
      .replace('a.Brand', 'am Brand')
      .replace('a.Darß', 'auf dem Darß')
      .replace('a.Forst', 'am Forst')
      .replace('a.Inn', 'am Inn')
      .replace('a.Lech', 'am Lech')
      .replace('a.Main', 'am Main')
      .replace('a.Ries', 'am Ries')
      .replace('a. Sand', 'am Sand')
      .replace('a.See', 'am See')
      .replace('a.Königssee', 'am Königssee')
      .replace('a. Herzberg', 'am Herzberg')
      .replace('a.Buchrain', 'am Buchrain')
      // NOTE: a. will be resolved generically
      .replace('a.', 'am ')
      .replace('i.gäu', 'im gäu')
      .replace('i.OB', 'in Oberbayern')
      .replace('i.Rottal', 'im Rottal')
      .replace('i.Steigerwald', 'im Steigerwald')
      .replace('i.Wald', 'im Wald')
      .replace('i.Bay.', 'in Bayern')
      .replace('i.NB', 'in Niederbayern')
      .replace('i.UFr.', 'in Unterfranken')
      .replace('i.d.OPf.', 'in der Oberpfalz')
      // NOTE i.d. generically
      .replace('i. d.', 'in der ')
      .replace('i.d.', 'in der ')
      .replace('i. Odw.', 'im Odenwald')
      .replace('i.Grabfeld', 'in Grabfeld')
      .replace('i.OFr.', 'in Oberfranken')
      .replace('i.Schw.', 'in Schwaben')
      // NOTE i. generically
      .replace('i.', 'im ')
      .replace('opf', 'Oberpfalz')
      .replace('v.d.Rhön.', 'von der Rhön')
      .replace('v. d. Höhe', 'von der Höhe')
      .replace('v. d. Höhe', 'von der Höhe')
      // NOTE: v.d. generically
      .replace('v. d.', 'von der ')
      .replace('v.d.', 'von der ')
      .replace('O.L.', 'Oberlausitz')
      .replace('Erzgeb.', 'Erzgebirge')
      .replace('Hann.', 'Hannoversch')
      .replace('Thür.', 'Thüringen')
      .replace('Vogtl.', 'Vogtland')
      .replace('Westf.', 'Westfalen')
      .replace(', gemfr. Bezirk', '')
      .replace('Rhld.', 'Rheinland')
      .replace('St.', 'Sankt')
      .replace(/, St\$/, ', Stadt')
      .replace('GKSt', 'große Kreisstadt')
      .replace(', M', ', München')
      .replace('bei Hl.Blut', 'beim Heiligen Blut')
      .replace('Sächs. Schw.', 'Sächsisches Schwaben')
      .replace('st.', 'stadt')
      .replace('Krst.', 'Kreisstadt')

      // standardize
      .replace(/\s-\s/g, ' ')
      .replace(/\s+/g, ' ')
      // shorten Landkreis
      .replace('landkreis', 'kreis')
      // safety
      .replace(/-+/g, '-')
      .trim()
  );
};

const getNameCounts = (data, nameAttribute) => {
  const nameCounts = [];
  for (const element of data) {
    const existingIndex = nameCounts.findIndex(
      x => x.name === element[nameAttribute]
    );
    if (existingIndex === -1) {
      nameCounts.push({ name: element[nameAttribute], nameCounts: 1 });
    } else {
      nameCounts[existingIndex].nameCounts++;
    }
  }
  return nameCounts;
};

const resolveDuplicateNames = data => {
  // 1. Resolve abbreviations in the destatis names -> nameDestatisLong
  // 2. Remove everything after the first comme -> nameDestatisShort
  const dataNames = data.map(e => {
    const nameDestatisLong = resolveAbbreviations(e.nameDestatis);
    const nameDestatisShort = nameDestatisLong.replace(/,(.*)/, '');
    return { nameDestatisLong, nameDestatisShort, ...e };
  });
  // 3. Check for duplicates on nameDestatisShort

  const allNameCounts = getNameCounts(dataNames, 'nameDestatisShort');
  // 4. If duplicate occurs
  //    1. resolve with openGeoDb (if available)
  //    2. resolve with nameDestatisLong
  //    3. resolve with district
  let countOpenGeoDb = 0;
  const dataResolvedNames = dataNames.map(e => {
    const nameCounts = allNameCounts.find(x => x.name === e.nameDestatisShort)
      .nameCounts;
    let nameUnique = e.nameDestatisShort;
    if (nameCounts > 1) {
      if (e.nameOpenGeoDb !== '') {
        countOpenGeoDb++;
        nameUnique = e.nameOpenGeoDb;
      } else if (e.nameDestatisShort !== e.nameDestatisLong) {
        nameUnique = e.nameDestatisLong;
      } else {
        // Currently happens 168 times
        nameUnique = `${e.nameDestatisShort}, ${e.district.replace(
          'Landkreis',
          'Kreis'
        )}`;
      }
    }

    // TODO: define nameShort here
    const nameShort = e.nameSearchZipCodes;
    const name = nameShort;
    return { nameUnique, ...e, nameShort, name };
  });
  console.log('Unique names from OpenGeoDb: ', countOpenGeoDb);

  // 5. Check for duplicates again
  const allNameCountsAfterResolve = getNameCounts(
    dataResolvedNames,
    'nameUnique'
  );
  const remainingDuplicates = allNameCountsAfterResolve.filter(
    x => x.counts > 1
  );
  console.log('Remaining duplicates should be empty: ', remainingDuplicates);

  return dataResolvedNames;
};

const removeSpecialChars = string => {
  return string
    .replace(/,/g, '')
    .replace(/\./g, '')
    .replace(/\//g, '')
    .replace(/\(/g, '')
    .replace(/\)/g, '')
    .replace(/ä/g, 'ae')
    .replace(/ü/g, 'ue')
    .replace(/ö/g, 'oe')
    .replace(/ß/g, 'ss')
    .replace(/ć/g, 'c')
    .replace(/č/g, 'c')
    .replace(/ě/g, 'e')
    .replace(/ó/g, 'o')
    .replace(/ł/g, 'l')
    .replace(/Ł/g, 'l')
    .replace(/ń/g, 'n')
    .replace(/ś/g, 's')
    .replace(/š/g, 's')
    .replace(/ž/g, 'z')
    .replace(/ź/g, 'z');
};

const convertToSlug = string => {
  return string
    .toLowerCase()
    .replace(/\//g, '-')
    .replace(/\s+/g, ' ')
    .replace(/\s/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

const addSlugs = data => {
  const dataWithSlugs = data.map(e => {
    let slug = removeSpecialChars(e.nameUnique);
    slug = convertToSlug(slug);
    return { slug, ...e };
  });

  const slugs = dataWithSlugs.map(e => {
    const {
      slug,
      // uniqueName,
      // nameDestatisLong,
      // nameDestatisShort,
      // nameOpenGeoDb,
      // district,
    } = e;
    // return {
    //   slug,
    //   uniqueName,
    //   nameDestatisLong,
    //   nameDestatisShort,
    //   nameOpenGeoDb,
    //   district,
    // };
    return slug;
  });
  fs.writeFileSync('./output/logs/slugs.json', JSON.stringify(slugs, null, 2));

  return dataWithSlugs;
};

const selectAttributesForFrontend = data => {
  // {"longitude":10.745801,"latitude":53.430286,"ags":"13076054","name":"Gresse","zipCodes":["19258"],"district":"Landkreis Ludwigslust-Parchim","state":"Mecklenburg-Vorpommern","population":724}
  return data.map(e => {
    const { ags, slug, name, population, district, state, zipCodes } = e;
    const longitude = +e.longitude.replace(',', '.');
    const latitude = +e.latitude.replace(',', '.');
    return {
      ags,
      slug,
      name,
      population,
      longitude,
      latitude,
      district,
      state,
      zipCodes,
    };
  });
};

const run = async () => {
  const {
    dataGeodataGermany,
    dataDestatis,
    dataSearchZipCodes,
    dataOpenGeoDb,
  } = await transformData();
  const dataMerged = await mergeData({
    dataGeodataGermany,
    dataDestatis,
    dataSearchZipCodes,
    dataOpenGeoDb,
  });

  const dataNamesUnique = resolveDuplicateNames(dataMerged);
  const dataWithSlugs = addSlugs(dataNamesUnique);
  fs.writeFileSync(
    './output/municipalities-master.json',
    JSON.stringify(dataWithSlugs, null, 2)
  );
  const dataFrontend = selectAttributesForFrontend(dataWithSlugs);
  fs.writeFileSync(
    './output/municipalities-frontend.json',
    JSON.stringify(dataFrontend)
  );
};

run();
