# Heizlast-Rechner

Raumweise Norm-Heizlast nach DIN EN 12831-1:2017-09 mit DIN/TS 12831-1:2020-04. Lern- und Vorplanungswerkzeug auf Technikerniveau; ersetzt keine TGA-Fachplanung. Nicht enthalten sind Rohrnetz, Heizflächenauslegung und Kühllast.

Die App ist eine einzige Datei, `index.html`. Sie läuft offline und speichert im Browser (localStorage).

## Rechenverfahren

Im Tab „1 Projekt“ wird eines gewählt:

- **DIN/TS 12831-1:2020**: Lüftung über die Hüllfläche (q_env,50, f_env, A_env), Zuluft mit WRG-Temperatur, Überströmluft, Gebäudeheizlast mit f_Geb. Rechenweg aus dem wbs-Musterbeispiel rückgerechnet; Referenzfall 13 Räume, 5 696 W (`pruefung/referenz_wbs_efh.json`, erzeugt mit `node pruefung/wbs_musterbeispiel.js`). f_env und f_Geb sind ohne Normtext nicht belegt.
- **DIN EN 12831:2003 mit Beiblatt 1**, nach Laasch, T.; Laasch, E.: *Haustechnik*, 13. Aufl., Springer Vieweg 2013, Kap. 8.3. Rechnet mit Mindestluftwechsel, Abluftüberschuss, U_equiv und f_RH. Referenzfall: Küche S. 558 (`pruefung/referenz_laasch_kueche.json`).
- **Excel-Blatt „Heizlast“**: Testfall Kita Wesel, 18,29 kW (`pruefung/testprojekt_kita_eg.json`).

Das allgemeine Lüftungsverfahren der DIN EN 12831-1:2017 (Gl. 18–31, Tab. B.8, B.2.14) ist nicht gegen den Normtext geprüft. Das Verfahren DIN/TS bildet nur den Rechenweg des wbs-Musterbeispiels nach.

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
