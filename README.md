# Heizlast-Rechner

Raumweise Norm-Heizlast nach DIN EN 12831-1:2017-09 mit DIN/TS 12831-1:2020-04. Lern- und Vorplanungswerkzeug auf Technikerniveau; ersetzt keine TGA-Fachplanung. Nicht enthalten sind Rohrnetz, Heizflächenauslegung und Kühllast.

Die App ist eine einzige Datei, `index.html`. Sie läuft offline und speichert im Browser (localStorage).

## Grundregel: keine Annahmen

- Die App enthält keine Normwerte. Alle Felder starten leer.
- Jeder Wert ist entweder eine Eingabe, ein U-Wert aus der Wärmeschutz-App oder ein Normwert aus den Tabellen im Tab „4 Normwerte“, mit Quelle und Haken „geprüft“.
- Wenn etwas fehlt oder nicht geprüft ist, wird das Feld rot und der Raum „unvollständig“. Er bekommt dann kein Ergebnis, sondern eine Liste der fehlenden Angaben.

## Aufbau

| Datei | Inhalt |
|---|---|
| `src/calc.js` | Rechenkern: Formeln, Varianten, Normstand, Einheitenkontrolle |
| `src/begriffe.js` | Erklärungen für die i-Symbole (Begriff, Formelzeichen, Einheit) – ohne Normwerte |
| `src/app.js`, `src/app.css`, `src/index.html` | Oberfläche, Vorzeigeseite, Druck, PNG- und xlsx-Export |
| `vendor/` | SheetJS 0.18.5 (mini) und html2canvas 1.4.1, werden eingebettet |
| `build.js` | erzeugt `index.html` aus `src/` und `vendor/` |
| `tests.js` | Prüfungen (Excel-Testfall 18,29 kW, unvollständige Eingaben, Import, Einheiten) |
| `pruefung/` | Prüfbericht, Testprojekt, Druck-PDF, xlsx-Prüfdatei |

```bash
node build.js
```

```bash
node tests.js
```

## Übernahme aus der Wärmeschutz-App

In der Wärmeschutz-App den Knopf „An Heizlast-App übergeben“ drücken. Das Bauteil landet dann auf zwei Wegen bei der Heizlast-App:

- im gemeinsamen localStorage-Schlüssel `fh21.bauteile`; das geht nur, wenn beide Apps unter derselben Adresse laufen,
- als JSON-Datei (`format: "fh21.bauteile"`), die man im Tab „3 Bauteile“ importiert.
