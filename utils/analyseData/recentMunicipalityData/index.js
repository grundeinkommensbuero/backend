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
        GEMEINDE_LAT: lat,
        GEMEINDE_LON: lon,
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
          lat,
          lon,
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
    // TODO: can be cleaned up here,
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
    // SearchZipCodes seems complete
    // const agsInDestatis = dataDestatis.map(e => e.ags);
    // const agsInSearchZipCodes = dataSearchZipCodes.map(e => e.ags);
    // const notMatching = agsInDestatis.filter(
    //   e => !agsInSearchZipCodes.includes(e)
    // );

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
  console.log('success', dataMerged[0]);
};

run();
