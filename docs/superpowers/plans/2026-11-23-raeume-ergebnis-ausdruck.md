# Räume direkt bearbeiten, Ergebnis und Ausdruck – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Räume werden in einem Tab „5 Räume“ (Liste + Formular) direkt bearbeitet; „6 Ergebnis“ und „7 Ausdruck“ ersetzen Raumtabelle und Vorzeigeseite.

**Architecture:** Reine Zustandsfunktionen (Altdatei-Übernahme, Raum anlegen/duplizieren/löschen) kommen nach `src/calc.js` und sind in Node testbar. `src/app.js` bindet das Raumformular statt an `S.entwurf` an den gewählten Raum `S.raeume.#<id>`; das Entwurfs-Hin-und-Her entfällt. Die Rechnung bleibt unverändert.

**Tech Stack:** Vanilla JS, eine gebaute `index.html` (`node build.js`), Tests `node tests.js`.

**Spec:** `docs/superpowers/specs/2026-11-23-raeume-ergebnis-ausdruck-design.md`

## Global Constraints

- calc.js-Rechnung unverändert: Excel-Referenz 18 287,24 W, wbs-Referenz 5 696 W, alle bestehenden Tests grün.
- Keine Vorbelegung von Zahlen; ein neuer Raum ist komplett leer (`leererRaum()`).
- Alte Projektdateien (mit `entwurf`/`entwurfVon`) bleiben importierbar, kein Raum geht verloren.
- Tab-Beschriftung exakt: „1 Projekt · 2 Wärmeschutz · 3 Bauteile · 4 Normwerte · 5 Räume · 6 Ergebnis · 7 Ausdruck“.
- Nach jeder Änderung: `node build.js`, `node tests.js`, Commit mit Co-Authored-By-Zeile.

## Review Focus

- Altdatei mit leerem Entwurf (nur IDs, keine Eingaben) → kein Phantomraum angehängt.
- Altdatei mit Entwurf, der ein bestehender Raum ist (`entwurfVon` gesetzt) → Raum wird mit dem Entwurfsstand ersetzt, nicht doppelt angehängt.
- Gewählter Raum wird gelöscht → Auswahl springt auf Nachbarraum bzw. leer, kein Fehler.
- `S.raumAuswahl` zeigt auf nicht mehr vorhandene ID (Import) → erster Raum gewählt.
- Leere Raumliste → Tab 5 zeigt nur „+ Neuer Raum“ und Hinweis, Tab 6/7 wie bisher ohne Absturz.

---

### Task 1: Zustandsfunktionen in calc.js

**Files:** Modify `src/calc.js` (bei `leererRaum`, Exporte Zeile ~519) · Test `tests.js`

**Interfaces – Produces:**
- `entwurfUebernehmen(S) -> { S, angehaengt: boolean }` – hat `S.entwurf` Eingaben (`raumHatEingaben`), wird er bei gesetztem `entwurfVon` (Raum existiert) an dessen Stelle gesetzt, sonst mit neuer ID angehängt; danach `delete S.entwurf; delete S.entwurfVon`.
- `raumHatEingaben(r) -> boolean` – true, wenn nr/name/geschoss/raumartId/L/B/A/hi/Lüftungswerte nicht leer oder `flaechen.length`/`teilflaechen.length` > 0.
- `neuerRaum(S) -> id` – hängt `leererRaum()` an, gibt dessen id zurück.
- `raumDuplizieren(S, id) -> id` – tiefe Kopie mit neuen IDs (Raum, Flächen, Teilflächen), Name + „ (Kopie)“, direkt hinter dem Original eingefügt.
- `raumLoeschen(S, id) -> naechsteId | ''` – entfernt, gibt die ID des Nachfolgers (sonst Vorgängers, sonst '') zurück; entfernt id aus `S.vorzeigeRaeume`.

- [ ] Step 1: Tests schreiben: `entwurfUebernehmen` mit gefülltem Entwurf ohne entwurfVon → raeume.length+1, angehaengt true, kein `entwurf`-Feld; mit leerem Entwurf → Länge gleich, angehaengt false; mit entwurfVon=id des Raums 2 und geändertem Namen → Länge gleich, Raum 2 hat neuen Namen. `raumDuplizieren` → neue ID ≠ alt, Flächen-IDs alle neu, Index = Original+1, Name endet auf „ (Kopie)“. `raumLoeschen` des mittleren von 3 → gibt ID des dritten zurück; des letzten → ID des vorletzten; des einzigen → ''. `neuerRaum` → Raum ist `leererRaum()`-Struktur, `rechneRaum` meldet unvollständig.
- [ ] Step 2: `node tests.js` → neue Tests FAIL (Funktion nicht definiert).
- [ ] Step 3: Funktionen implementieren und exportieren.
- [ ] Step 4: `node tests.js` → alle grün.
- [ ] Step 5: Commit „Raum-Zustandsfunktionen für direkte Bearbeitung“.

### Task 2: Tab „5 Räume“ (Liste + Formular am gewählten Raum)

**Files:** Modify `src/app.js` (`ergaenze`, `render`, `rRaum`, `teilflaechenHtml`, Aktionen `fl-neu/fl-weg/tf-neu/tf-weg/raum-*`, `aktualisiereRaum`/Ab-Selektor Zeile ~699, `entwurfBenutzt`, Bauteil-löschen Zeile ~737), `src/index.html` (Tab-Leiste, Sections), `src/app.css`

**Interfaces – Consumes:** Task 1. **Produces:** `S.raumAuswahl` (id), `waehleRaum(id)`, Aktion `raum-waehlen` (data-id), `raum-neu`, `raum-dup`, `raum-weg` (beziehen sich auf gewählten Raum bzw. data-id).

- [ ] Step 1: `ergaenze` ruft `entwurfUebernehmen`; bei `angehaengt` Toast „Ein nicht übernommener Raum aus der Datei wurde an die Liste angehängt.“. `S.raumAuswahl` auf vorhandene ID korrigieren (sonst erster Raum / '').
- [ ] Step 2: `render`: `RE` = Eintrag aus `G.raeume` des gewählten Raums (kein `rechneRaum(S.entwurf)` mehr). Fehlermarkierung `markiere()` nutzt RE wie bisher.
- [ ] Step 3: `rRaum` → zweispaltig: links `.raumliste` (Zeilen Nr · Name · Φ_HL W, roter Punkt bei unvollständig, gewählter hervorgehoben, darunter Σ bzw. Φ_HL,Geb kW, Knopf „+ Neuer Raum“); rechts bestehendes Formular mit Pfadpräfix `raeume.#<id>` statt `entwurf`, Kopf „Raum <Nr> – <Name>“ mit Knöpfen Duplizieren / Löschen; unten Raumergebnis + `<details>` Rechenweg (`rwTabelle(RE,false)`). Ohne Räume: nur Liste mit Knopf und Hinweis. Knöpfe „Raum übernehmen“/„Formular leeren“ entfallen. Unter 760 px Breite: Liste als `<select>` über dem Formular.
- [ ] Step 4: Aktionen auf gewählten Raum umstellen; `raum-edit` entfällt; `entwurfBenutzt` und alle `S.entwurf`-Verweise entfernen. Export (JSON) schreibt kein `entwurf`.
- [ ] Step 5: index.html: Tabs `raum`→„5 Räume“, `tabelle`→„6 Ergebnis“, `vorzeige`→„7 Ausdruck“ (IDs bleiben).
- [ ] Step 6: `node build.js && node tests.js` grün; im Browser (Vorschau, Testprojekt `pruefung/testprojekt_kita_eg.json`): Raum wählen, Wert ändern → Liste/Φ_HL aktualisiert sofort, Tab wechseln und zurück → Änderung da; Neuer Raum → rot in Liste; Duplizieren/Löschen; keine Konsolenfehler; mobile Breite 375 px.
- [ ] Step 7: Commit „Tab Räume: direkt bearbeiten statt Entwurf“.

### Task 3: „6 Ergebnis“ und „7 Ausdruck“

**Files:** Modify `src/app.js` (`rTabelle`, `rVorzeige`-Kopf), `src/app.css`

- [ ] Step 1: `rTabelle`: oben Ergebnisleiste (Φ_HL,Geb kW groß, Nachweis-Text, „n von m Räumen vollständig“), darunter bestehende Tabelle; Knopf „Bearbeiten“ → „Ändern“ = `waehleRaum(id)` + `zeigeTab('raum')`.
- [ ] Step 2: `rVorzeige`: Überschrift „Ausdruck“, Hinweiszeile wie bisher; Blatt bleibt Inhalt.
- [ ] Step 3: Build, Tests grün; Druck-PDF mit Edge headless über `pruefung/drucktest.html` (Kita-Datei (23)) → 8 Seiten, kein Leerblatt; Vorschau prüfen.
- [ ] Step 4: Commit „Ergebnis- und Ausdruck-Tab“; Push heizlast.
