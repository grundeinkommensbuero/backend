# Merge zwischen OpenDataLab Gemeindedaten und suche-postleitzahl.org PLZ-Daten

## 1. Datenquellen

1. Download der OpenDataLab .geojson-Datei hier: http://opendatalab.de/projects/geojson-utilities/
2. Download der suche-postleitzahl.org .csv-Datei hier: https://www.suche-postleitzahl.org/downloads
3. Manuelle Sammlung der Koordinaten und Einwohnerzahl der fehlenden Gemeinden (Felix) `./data/manualData.json`

## 2. Script

```bash
npm i
node merge.js
```

## 3. Ergebnis

Ergbnisse sind in `./output/places.json` im `./output` Ordner sind auch noch logs und errors
