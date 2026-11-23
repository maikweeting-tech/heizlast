# Heizlast-App: Räume direkt bearbeiten, Ergebnis und Ausdruck getrennt

Stand 23.11.2026 · Variante A (vom Nutzer gewählt)

## Warum

Die Raumeingabe ist umständlich. Ein Raum lebt heute an zwei Stellen: Er wird im Tab „5 Raum eingeben“ als Entwurf ausgefüllt, mit „Raum übernehmen“ in die Liste geschickt und zum Ändern im Tab „6 Raumtabelle“ mit „Bearbeiten“ zurückgeholt. Vergisst man „übernehmen“, fehlt die Änderung, und es kommen Rückfragen. Der Nutzer will außerdem Ergebnis und Rechnungen gut überblicken und als letzte Seite einen Ausdruck für PDF und Drucker.

## Ziele

- Ein Raum hat genau einen Ort. Jede Änderung gilt sofort, ohne „übernehmen“.
- Alle Räume mit ihrer Heizlast und ihrem Status sind beim Eingeben immer zu sehen.
- Die Ergebnisse (Gebäude und Räume) stehen auf einer eigenen Seite, und jede Rechnung lässt sich dort aufklappen.
- Die letzte Seite ist der Ausdruck.

## Nicht-Ziele

- Die Rechnung (calc.js) ändert sich nicht. Die Referenzfälle (Excel 18 287,24 W, wbs 5 696 W) bleiben gleich.
- Die Tabs 1–4 (Projekt, Wärmeschutz, Bauteile, Normwerte) bleiben inhaltlich, wie sie sind.
- Der Inhalt des Ausdrucks (heutige Vorzeigeseite) bleibt gleich, nur seine Lage und sein Rahmen ändern sich.

## Darf nicht passieren

- Alte Projektdateien lassen sich nicht mehr importieren, oder Räume gehen beim Import verloren.
- Ein halb ausgefüllter Entwurf aus einer alten Datei verschwindet still.
- Ein neuer, noch leerer Raum verfälscht die Gebäudeheizlast, ohne dass man es sieht.

## Ansätze

- **A – Tab „Räume“: Liste links, Raum rechts (gewählt).** Klick auf einen Raum öffnet ihn zum direkten Bearbeiten. Das löst das Hin- und Herschicken vollständig und hält die Übersicht beim Eingeben.
- B – Bearbeiten in der aufgeklappten Zeile der Raumtabelle. Das wurde verworfen, weil die breite Hüllflächen-Tabelle in einer Tabellenzeile zu eng wird.
- C – Entwurf behalten, aber automatisch übernehmen. Das wurde verworfen, weil die zwei Orte für einen Raum bleiben.

## Entwurf

**Tabs neu:** 1 Projekt · 2 Wärmeschutz · 3 Bauteile · 4 Normwerte · **5 Räume** · **6 Ergebnis** · **7 Ausdruck**

**5 Räume**
- Links eine Raumliste mit Nr., Name, Φ_HL in W und einem roten Punkt bei unvollständigen Räumen. Darunter die Summe bzw. Φ_HL,Geb in kW.
- Knöpfe: „+ Neuer Raum“ legt sofort einen leeren Raum an und wählt ihn aus. Dazu Duplizieren und Löschen (mit Rückfrage) für den gewählten Raum.
- Rechts das bisherige Raumformular (Raumdaten, Hüllflächen, Lüftung, Aufheizzuschlag), jetzt gebunden an den gewählten Raum. Am Ende stehen das Ergebnis des Raums mit der Fehlliste und ein aufklappbarer Rechenweg.
- Die Knöpfe „Raum übernehmen“ und „Formular leeren“ entfallen. Gespeichert wird wie überall sofort.
- Auf schmalen Bildschirmen steht die Liste als kompakte Auswahl über dem Formular.
- Der gewählte Raum wird gemerkt (S.raumAuswahl), damit er nach dem Neuladen wieder offen ist.

**6 Ergebnis** (ersetzt „Raumtabelle“)
- Oben eine Ergebnisleiste: Φ_HL,Geb in kW, Nachweis Wärmeerzeuger (η), Anzahl vollständiger/unvollständiger Räume.
- Darunter die bisherige Raumtabelle mit aufklappbarem Rechenweg je Raum und der Herleitung von Φ_HL,Geb.
- Statt „Bearbeiten“ springt ein Klick auf „Ändern“ in Tab 5 und wählt dort den Raum aus.

**7 Ausdruck** (ersetzt „Vorzeigeseite“)
- Inhalt wie heute. Oben die Raumauswahl für den Rechenweg und der Knopf „Drucken / als PDF speichern“, darunter das Blatt als Druckvorschau.

**Alte Dateien:** Beim Laden wird ein gefüllter Entwurf (S.entwurf mit Inhalt), der nicht zu einem bestehenden Raum gehört, als neuer Raum an die Liste angehängt und mit einer Meldung gezeigt. Danach wird S.entwurf nicht mehr verwendet. Der Export schreibt es nicht mehr.

**Neuer leerer Raum:** Er ist unvollständig, also rot in der Liste. Wie heute rechnet die Gebäudeheizlast nur, wenn alle Räume vollständig sind.

## Vom Builder zu entscheiden

- Genaue Gestaltung der Liste (Breite, Hervorhebung des gewählten Raums), angelehnt an die bestehenden Stile in app.css.
- Die Feldpfade wechseln von `entwurf.…` zu `raeume.#<id>.…`. Die Fehlermarkierung (raum.*-Pfade) wird für den gewählten Raum aus G.raeume genommen.
- Die Tests werden angepasst bzw. ergänzt: Altdatei mit Entwurf wird zu einem Raum, Raumanlage, Duplizieren, Löschen, keine Änderung der Referenzwerte.
