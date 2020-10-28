# Vergleich zwischen OpenDataLab Gemeindedaten und suche-postleitzahl.org PLZ-Daten

Prüfen der Annahme, dass die beiden Datensätze mit einender kombinierbar sind über die UID (Schlüssel) AGS.

## 1. Datenquellen

1. Download der OpenDataLab .geojson-Datei hier: http://opendatalab.de/projects/geojson-utilities/
2. Download der suche-postleitzahl.org .csv-Datei hier: https://www.suche-postleitzahl.org/downloads

## 2. Script

```bash
npm i
node compare.js
```

Für ein paar extra Logs, gibt es eine Variable in der Utils-Sektion, die beim Weiterarbeiten interessant sind, aber für das Ergebnis nicht so wichtig.

## 3. Ergebnis

- Die Anzahl der individuellen AGS ist bei den OpenDataLab Gemeindedaten um 395 größer, darin sind aber auch gemeindefreie Gebiete enthalten.
- Die PLZ-Daten werden vollständig von den OpenDataLab Gemeindedaten abgedeckt. 24 fehlen bei einer Überprüfung der AGS, 8 weitere können über den Gemeindenamen verknüpft werden.
