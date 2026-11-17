# Prüfbericht Heizlast-App

Stand: 17.11.2026 · Bearbeiter: Maik Weeting, Klasse FH 21 · geprüft mit `node tests.js` (66 Prüfungen), im Browser (Vorschau) und in Excel (COM-Neuberechnung)

## Grundlagen

- Excel-Mappe: `FH21\Endprojekt\LP 3\TGA\TGA_Kita_Wesel_Berechnung_1.xlsx` (Stand 17.11.2026, 16:46 Uhr), Blätter „Heizlast“, „Eingaben“ und „Folienwerte“ (Bereich F2_Rechenweg = `Folienwerte!A15:G23`)
- Wärmeschutz-App: `GModG\waermeschutz`, neuer Knopf „An Heizlast-App übergeben“
- Regelwerk: DIN EN 12831-1:2017-09 mit DIN/TS 12831-1:2020-04, raumweises Verfahren

## Ausgabestand der Normen (online geprüft am 17.11.2026)

| Norm | Status in der App | Befund |
|---|---|---|
| DIN/TS 12831-1:2020-04 | ✓ geprüft | Laut DIN Media: Ausgabe 2020-04, Vornorm, ersetzt DIN EN 12831 Beiblatt 1 bis 3. Kein Nachfolger genannt. |
| DIN EN 12831-1:2017-09 | prüfen | Die Produktseite bei DIN Media war nicht erreichbar (404). Laut Oschatz (ITG Dresden, 2020) gilt sie zusammen mit der DIN/TS als Regel der Technik und ersetzt DIN EN 12831:2003-08. Den aktuellen Stand bitte einmal bei DIN Media nachsehen. |

## Abweichungen des Excel-Ansatzes von der Norm (in der App zur Wahl)

| Punkt | Excel-Blatt „Heizlast“ | DIN EN 12831-1:2017 | In der App |
|---|---|---|---|
| Infiltration | V̇_inf = 2 · V_i · n_50 · e · ε (Struktur aus der Ausgabe 2003) | zonenweise über q_env,50, Volumenstromfaktor (Tab. B.8), Orientierungsfaktor (B.2.14), Gl. (18) bis (31) | Nur der Excel-Ansatz ist wählbar. Der Normtext war online nur als Bild verfügbar und ließ sich nicht prüfen. Die Norm-Variante ist sichtbar, aber gesperrt. |
| Erdreich | U_c = U + ΔU_WB des Bauteils | äquivalenter U-Wert U_equiv (abhängig von B′ und z) | Wahlschalter. Bei „Norm“ wird U_equiv je Fläche mit Quelle verlangt. Formelstruktur nicht gegen den Normtext geprüft. |
| Mindestluftwechsel | keine Prüfung | Gl. (17): max(V̇_inf ; V̇_min − V̇_su) | Wahlschalter. Die Symbole von Gl. (17) sind online geprüft, der Formeltext liegt nur als Bild vor. |
| Abluftüberschuss V̇_ex > V̇_su | nicht berücksichtigt | eigener Term (q_v,exh) | nicht gerechnet. Die App zeigt einen Hinweis, wenn V̇_ex > V̇_su. |

## Prüfung 1: Testfall „Kita EG (eine Zone)“

Die Eingangswerte stammen aus dem Blatt „Eingaben“. Ich habe sie über die Oberfläche eingetragen, nicht als Vorbelegung im Code. Das Projekt liegt als `testprojekt_kita_eg.json` bei.

- Normwerte (Quelle „Excel-Mappe Kita Wesel, Blatt Eingaben (ungeprüft)“, nur für diesen Abgleich als geprüft markiert): θ_e = −8,5 °C; θ_m,e = 10,5 °C; θ_int = 20 °C; f_g1 = 1,45; G_w = 1; e = 0,02; ε = 1; ρ·c_p = 0,34 Wh/(m³·K)
- Bauteile, jeweils mit ΔU_WB = 0,05 W/(m²·K): Außenwand U = 0,20; Fenster 0,90; Bodenplatte 0,25; Wand zur Gastro 0,20
- Raum: L = 38,475 m; B = 19,875 m; h_i = 3,6 m (Gegenprobe mit Teilflächen 20 · 19,875 + 18,475 · 19,875: gleiches Φ_HL)
- Hüllflächen: Außenwand 387,30 m² brutto − 116,19 m² Fenster; Fenster 116,19 m²; Bodenplatte 764,69 m² (Erdreich); Wand zur Gastro 79,50 m² (beheizter Nachbarraum, θ_j = 20 °C)
- Lüftung: V̇_su = 3 708 m³/h; η_WRG = 0,75; n_50 = 1 h⁻¹
- Wärmeerzeuger Φ_WE = 16 kW

| Größe | Soll (Excel-Zelle) | Ist (App) | Abweichung |
|---|---|---|---|
| A_G | 764,6906 m² (D7) | 764,6906 m² | 0 |
| V_i | 2 752,886 m³ (D12) | 2 752,886 m³ | 0 |
| Φ_T,AW | 1 931,66 W (D26) | 1 931,66 W | 0 |
| Φ_T,W | 3 145,84 W (D27) | 3 145,84 W | 0 |
| f_g | 0,4833 (D17) | 0,4833 | 0 |
| Φ_T,G | 3 160,08 W (D28) | 3 160,08 W | 0 |
| Φ_T | 8 237,59 W (D29) | 8 237,59 W | 0 |
| V̇_inf | 110,115 m³/h (D34) | 110,115 m³/h | 0 |
| Φ_V,mech | 8 982,63 W (D37) | 8 982,63 W | 0 |
| Φ_V,inf | 1 067,02 W (D38) | 1 067,02 W | 0 |
| **Φ_HL** | **18 287,24 W = 18,29 kW (D42)** | **18 287,24 W** | **0,000 %** (zulässig 0,1 %) |
| φ | 23,91 W/m² (D43) | 23,91 W/m² | 0 |
| η = Φ_HL / Φ_WE | 1,143, „nein“ (D46/D47) | 1,143, „NICHT erfüllt“ | 0 |

Diese Werte zeigt die Oberfläche (Raumtabelle und Vorzeigeseite), und der Rechenkern im Test kommt auf dieselben Zahlen.

## Prüfung 2: unvollständige Eingaben

- **Im Test:** Im Testprojekt waren h_i, der Abzug der Öffnungen und η_WRG gelöscht, f_g1 war nicht abgehakt und bei ρ·c_p fehlte die Quelle. Ergebnis: kein Φ_HL, keine Gebäudesumme. Die Fehlliste hat genau diese 5 Einträge.
- **In der Oberfläche:** Ich habe einen Raum mit Nr., Name, L und einer Hüllfläche angelegt. Die App zeigt kein Ergebnis und listet 9 fehlende Angaben auf: Raumart, Breite B, h_i, Abzug, „angrenzend an“, η_WRG, n_50, e, ε. Alle 9 Felder sind rot markiert.
- **Normwert nicht geprüft:** Ich habe beim ρ·c_p den Haken „geprüft“ entfernt. Der Raum wird dann „unvollständig“, Ergebnis und Gebäudeheizlast verschwinden, und das Kästchen ist rot. Mit Haken ist das Ergebnis wieder da.
- **Leeres Projekt:** Alle Normwert-Tabellen sind leer, und es gibt keine Zahlen-Vorbelegung (geprüft im Test).

## Prüfung 3: Übernahme aus der Wärmeschutz-App

1. In der Wärmeschutz-App (`localhost:8768/waermeschutz/`) habe ich das Beispiel „Außenwand KS + WDVS“ geladen und „An Heizlast-App übergeben“ gedrückt. Als Name habe ich „AW 1 – KS + WDVS“ angegeben.
2. Gespeichert wird unter dem localStorage-Schlüssel `fh21.bauteile`: U = 0,234 W/(m²·K) (= 1 / 4,275), mit der Quelle „Wärmeschutz-App, Bauteil „AW 1 – KS + WDVS“, U nach DIN EN ISO 6946 inkl. ΔU (17.11.2026)“. Zusätzlich wird eine JSON-Datei heruntergeladen.
3. In der Heizlast-App zeigt „Aus Wärmeschutz-App übernehmen“ das Bauteil an, und nach der Übernahme steht es im Katalog. Der U-Wert ist schreibgeschützt, die Herkunft lautet „Wärmeschutz-App“, ΔU_WB bleibt leer und ist als fehlend markiert.
4. Den JSON-Weg (Format `fh21.bauteile`) prüft der Test ebenfalls.

Wichtig: Der gemeinsame Speicher funktioniert nur, wenn beide Apps unter derselben Adresse laufen, z. B. beide auf GitHub Pages. Bei lokal geöffneten Dateien bleibt nur die JSON-Datei.

## Prüfung 4: Einheitenkontrolle

Jeder Rechenschritt ist in `calc.js` mit seinen Einheiten hinterlegt, und die Dimensionen werden als Exponenten von m, K, W und h nachgerechnet. Alle 14 Schritte sind stimmig (Test und Tab „Projekt“ → „Einheitenkontrolle“). Zwei Beispiele:

- Φ_T: m² · W/(m²·K) · – · K = W
- Φ_V: Wh/(m³·K) · m³/h · K = W

## Prüfung 5: Druckvorschau A4

Ich habe die Vorzeigeseite des Testprojekts mit Edge (headless) als PDF gedruckt: `vorzeigeseite_testprojekt.pdf`.

- **Format:** 3 Seiten, je 210 × 297 mm hoch. Keine Tabelle läuft über den Rand.
- **Kopfzeile:** auf jeder Seite „Projekt · Pos.“ und „Seite n von N“.
- **Fußzeile:** auf jeder Seite „ersetzt keine TGA-Fachplanung“, dazu Bearbeiter und Datum.
- **Seitenumbrüche:** Der Rechenweg-Block (Überschrift und Tabelle) bleibt zusammen, Tabellenzeilen werden nicht getrennt.
- **PNG-Export:** im Browser geprüft (html2canvas, A4-Breite, 2-fache Auflösung).

## Prüfung 6: xlsx-Export mit Formeln

`heizlast_testprojekt.xlsx` wurde mit dem Exportcode der App erzeugt (`node pruefung/xlsx_test.js …`). Danach habe ich in Excel alle Formeln neu gesetzt und vollständig neu gerechnet: Räume!X5 = 18 287,24 W, X10 = η = 1,143, Y10 = „nein“. Keine Fehlerzellen.

Die Formeln verweisen über die Blätter hinweg: Räume → Hüllflächen → Bauteile → Normwerte.

## Rechtschreibung

Ich habe die sichtbaren Texte in App und Vorzeigeseite durchgesehen und auf Ersatzschreibungen (ae/oe/ue) geprüft. Gefunden habe ich nur interne Bezeichner.

## Offene Punkte

- DIN EN 12831-1:2017-09: Ausgabestand bei DIN Media bestätigen.
- Norm-Varianten (Infiltration nach Gl. 18 bis 31, U_equiv, Gl. 17) mit dem Normtext abgleichen, sobald er vorliegt.
- Die Normwerte im Testprojekt stammen aus der Excel-Mappe und sind dort als „aus dem Gedächtnis, prüfen“ vermerkt. Für die Mappe bitte durch die Werte aus DIN/TS 12831-1 ersetzen und erst dann abhaken.

## Nachtrag 17.11.2026: Tab „2 Wärmeschutz“

- Die komplette Wärmeschutz-App ist als Tab eingebaut. `build.js` liest sie beim Bauen aus dem Ordner `waermeschutz`, es gibt keine zweite Kopie. Die eigenständige Wärmeschutz-App bleibt unverändert nutzbar.
- Im Tab ist die Kopfzeile ausgeblendet, ebenso der Teilen-Link und der Service Worker. Die Eingaben werden im Browser gesichert (`fh21.heizlast.ws`) und waren nach dem Neuladen wieder da (4 Schichten).
- „An Heizlast-App übergeben“ legt das Bauteil direkt im Bauteilkatalog ab, ohne Download. Geprüft mit dem Beispiel „Außenwand KS + WDVS“: U = 0,234 W/(m²·K).
- Schichten ohne belegte Quelle meldet die App beim Bauteil: λ „ungeprüft“, eigene Eingabe ohne Quelle oder Luftschicht. Das Bauteil braucht dann den Haken „Schichtwerte geprüft“, sonst ist der Raum unvollständig. Geprüft mit Zellulose-Einblasdämmung 040 (in der Baustoffliste als ungeprüft markiert).
- Tests: Heizlast 69/69, Wärmeschutz 117/117.
- Im Tab „Wärmeschutz“ starten die Randbedingungen leer: Bauteil, Raumnutzung, Wärmestromrichtung, θ_i, θ_e, DIN-4108-2-Ausgabe, GModG-Anforderung und Maßnahme. Auch „Beispiel laden“ setzt dort keine Standardwerte. „Berechnen“ zählt die fehlenden Angaben auf und markiert sie rot. Geprüft: 7 Felder rot und leer, nach dem Ausfüllen U = 0,23 W/(m²·K). Die eigenständige Wärmeschutz-App ist unverändert (20 °C / −5 °C vorbelegt).
- Auch die Korrekturstufe ΔU_g (Luftspalte) und ΔU_r (Umkehrdach) starten im Tab leer und müssen gewählt bzw. eingetragen werden (Stufe 0 bzw. 0 = keine Korrektur). ΔU_r entfällt, wenn eine Schichtnummer für Tafel 4.6b angegeben ist. Fehlen sie, öffnet sich „Korrekturwerte ΔU“ und beide Felder werden rot. Geprüft im Browser.
