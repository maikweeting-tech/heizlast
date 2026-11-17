/* Begriffe und Formelzeichen für die i-Erklärungen.
   Nur Bedeutung und Herkunft – bewusst KEINE Zahlenwerte aus Normen. */
'use strict';
const BEGRIFFE = {
  // Temperaturen
  theta_int: { z: 'θ_int', n: 'Norm-Innentemperatur', e: '°C', t: 'Raumtemperatur, für die die Heizung ausgelegt wird. Sie hängt von der Nutzung des Raums ab (Raumart) und steht in einer Tabelle der DIN/TS 12831-1. Eine höhere Temperatur ist mit dem Bauherrn zu vereinbaren und zu dokumentieren.' },
  theta_e: { z: 'θ_e', n: 'Norm-Außentemperatur', e: '°C', t: 'Tiefe Außentemperatur, für die die Heizung am Standort ausgelegt wird. Die DIN/TS 12831-1 gibt sie je Postleitzahl an (Klimadaten im elektronischen Anhang).' },
  theta_me: { z: 'θ_m,e', n: 'Jahresmittel der Außentemperatur', e: '°C', t: 'Mittlere Außentemperatur über das ganze Jahr am Standort (DIN/TS 12831-1, Klimadaten). Wird für Bauteile gegen Erdreich gebraucht, weil das Erdreich träge ist und im Winter wärmer bleibt als die Außenluft.' },
  dtheta: { z: 'Δθ', n: 'Auslegungs-Temperaturdifferenz', e: 'K', t: 'Unterschied zwischen innen und außen: Δθ = θ_int − θ_e. Temperaturdifferenzen gibt man in Kelvin (K) an; 1 K entspricht 1 °C Unterschied.' },
  theta_u: { z: 'θ_u', n: 'Temperatur im unbeheizten Raum', e: '°C', t: 'Temperatur, die sich im angrenzenden unbeheizten Raum einstellt (z. B. Keller, Dachboden, Garage). Eingabe je Hüllfläche, mit eigener Begründung oder Quelle.' },
  theta_j: { z: 'θ_j', n: 'Temperatur im beheizten Nachbarraum', e: '°C', t: 'Norm-Innentemperatur des angrenzenden beheizten Raums. Ist der Nachbarraum kälter, verliert der Raum Wärme dorthin. Ist er wärmer, wird Φ negativ: der Raum bekommt Wärme (Gewinn). Bei gleicher Temperatur ist Φ = 0.' },
  theta_su: { z: 'θ_su', n: 'Zulufttemperatur', e: '°C', t: 'Temperatur der Zuluft, mit der die Lüftungsanlage die Luft in den Raum bläst – nach der Wärmerückgewinnung, aber ohne Nachheizregister. Entweder direkt eingeben oder aus η_WRG berechnen lassen.' },
  // Bauteile
  U: { z: 'U', n: 'Wärmedurchgangskoeffizient (U-Wert)', e: 'W/(m²·K)', t: 'Wärmestrom durch 1 m² Bauteil bei 1 K Temperaturunterschied. Je kleiner, desto besser gedämmt. Kommt aus der Wärmeschutz-App (Bauteilaufbau nach DIN EN ISO 6946) oder wird mit Quelle eingetragen.' },
  dUWB: { z: 'ΔU_WB', n: 'Wärmebrückenzuschlag', e: 'W/(m²·K)', t: 'Pauschaler Zuschlag auf den U-Wert für Wärmebrücken (Ecken, Anschlüsse, Deckenauflager, Fensterlaibungen). Der Wert hängt davon ab, wie sorgfältig die Anschlüsse geplant sind, und steht in der DIN/TS 12831-1.' },
  Uc: { z: 'U_c', n: 'korrigierter U-Wert', e: 'W/(m²·K)', t: 'U-Wert einschließlich Wärmebrückenzuschlag: U_c = U + ΔU_WB. Mit diesem Wert rechnet die App die Transmission.' },
  Uequiv: { z: 'U_equiv', n: 'äquivalenter U-Wert gegen Erdreich', e: 'W/(m²·K)', t: 'Ersatz-U-Wert für Bauteile gegen Erdreich (Bodenplatte, Kellerwand). Er berücksichtigt den Wärmeweg durch das Erdreich und hängt vom Bauteil-U-Wert, vom charakteristischen Maß B′ der Bodenplatte und von der Tiefe z ab. Nur bei der Variante „Norm“ einzugeben.' },
  bauteilart: { z: '', n: 'Bauteilart', e: '', t: 'Art des Bauteils (Außenwand, Fenster, Dach …). Dient zur Ordnung im Katalog und auf der Vorzeigeseite; rechnerisch ohne Einfluss.' },
  schichtwerte: { z: 'λ, R', n: 'Schichtwerte geprüft', e: '', t: 'Erscheint, wenn ein Bauteil aus der Wärmeschutz-App Schichten ohne belegte Quelle enthält: λ-Werte, die dort als „ungeprüft“ markiert sind, eigene Eingaben ohne Quelle oder Luftschichten (R aus Tabelle). Erst wenn du diese Werte mit der Tabelle verglichen und den Haken gesetzt hast, rechnet die App mit dem Bauteil.' },
  waermeschutz: { z: 'U', n: 'Tab Wärmeschutz', e: '', t: 'Die komplette Wärmeschutz-App: Schichtaufbau mit λ und d, U-Wert nach DIN EN ISO 6946, Temperaturverlauf, Mindestwärmeschutz, Tauwasser nach Glaser und GModG-Prüfung. „An Heizlast-App übergeben“ legt das Bauteil direkt im Bauteilkatalog ab. Die eigenständige Wärmeschutz-App gibt es weiterhin.' },
  herkunft: { z: '', n: 'Herkunft', e: '', t: '„Wärmeschutz-App“: U-Wert aus dem Bauteilaufbau übernommen, schreibgeschützt. „manuell“: U-Wert von Hand eingetragen – dann ist eine Quelle Pflicht.' },
  // Geometrie
  A: { z: 'A', n: 'Grundfläche des Raums', e: 'm²', t: 'Fußbodenfläche des Raums (Innenmaße). Bezugsgröße für die spezifische Heizlast φ und für das Raumvolumen.' },
  L: { z: 'L', n: 'Länge', e: 'm', t: 'Raumlänge (Innenmaß).' },
  B: { z: 'B', n: 'Breite', e: 'm', t: 'Raumbreite (Innenmaß).' },
  teilflaeche: { z: 'A_i', n: 'Teilfläche', e: 'm²', t: 'Für Räume, die kein Rechteck sind (z. B. L-förmig): den Raum in Rechtecke zerlegen und jedes mit L × B eintragen. Aussparungen (Treppenloch, Schacht) mit „abziehen“ markieren. A = Σ (± L_i · B_i).' },
  hi: { z: 'h_i', n: 'lichte Raumhöhe', e: 'm', t: 'Höhe von Oberkante Fußboden bis Unterkante Decke. Dient zur Berechnung des Raumvolumens V_i.' },
  Vi: { z: 'V_i', n: 'Raumvolumen (Innenvolumen)', e: 'm³', t: 'Luftvolumen des Raums: V_i = A · h_i. Grundlage für den Infiltrationsluftstrom.' },
  Ab: { z: 'A_brutto', n: 'Bruttofläche', e: 'm²', t: 'Fläche des Bauteils einschließlich der Öffnungen (Fenster, Türen), die darin liegen.' },
  Az: { z: 'A_Öffn.', n: 'Abzug Öffnungen', e: 'm²', t: 'Fläche der Fenster und Türen, die in diesem Bauteil liegen. Sie werden als eigene Hüllfläche mit ihrem eigenen U-Wert eingetragen. „0“ eintragen, wenn es keine gibt.' },
  An: { z: 'A_k', n: 'Nettofläche', e: 'm²', t: 'Fläche, mit der gerechnet wird: A_k = A_brutto − A_Öffnungen.' },
  ausrichtung: { z: '', n: 'Ausrichtung', e: '', t: 'Himmelsrichtung des Bauteils. Nur zur Dokumentation – auf die Heizlast hat sie keinen Einfluss (Sonne wird bei der Heizlast nicht angerechnet).' },
  angrenzend: { z: '', n: 'angrenzend an', e: '', t: 'Was auf der anderen Seite des Bauteils liegt: außen (Außenluft), Erdreich, unbeheizter Raum (θ_u eingeben) oder beheizter Nachbarraum mit anderer Temperatur (θ_j eingeben). Danach richtet sich der Faktor f.' },
  // Faktoren
  f: { z: 'f_k', n: 'Temperatur-Korrekturfaktor', e: '–', t: 'Berücksichtigt, dass nicht jedes Bauteil an die kalte Außenluft grenzt. Außen: f = 1. Erdreich: f = f_g1 · f_g2 · G_w. Unbeheizt: f = b_u. Beheizter Nachbarraum: f = (θ_int − θ_j) / (θ_int − θ_e).' },
  fg1: { z: 'f_g1', n: 'Korrekturfaktor jährliche Temperaturschwankung', e: '–', t: 'Berücksichtigt bei Bauteilen gegen Erdreich den Einfluss der Schwankung der Außentemperatur über das Jahr. Wert aus DIN EN 12831-1 / DIN/TS 12831-1.' },
  fg2: { z: 'f_g2', n: 'Temperatur-Reduktionsfaktor Erdreich', e: '–', t: 'f_g2 = (θ_int − θ_m,e) / (θ_int − θ_e). Das Erdreich ist im Mittel so warm wie das Jahresmittel der Außentemperatur, nicht so kalt wie θ_e.' },
  Gw: { z: 'G_w', n: 'Korrekturfaktor Grundwasser', e: '–', t: 'Berücksichtigt den Einfluss des Grundwassers, wenn es nah unter der Bodenplatte steht (Grundwasser leitet Wärme ab). Wert aus der Norm, abhängig vom Abstand des Grundwassers.' },
  bu: { z: 'b_u', n: 'Temperatur-Reduktionsfaktor unbeheizt', e: '–', t: 'b_u = (θ_int − θ_u) / (θ_int − θ_e). Je wärmer der unbeheizte Nachbarraum, desto kleiner der Wärmeverlust dorthin.' },
  // Lüftung
  Vsu: { z: 'V̇_su', n: 'Zuluftvolumenstrom', e: 'm³/h', t: 'Luftmenge, die eine Lüftungsanlage pro Stunde in den Raum bläst. Aus der Lüftungsplanung. „0“ eintragen, wenn der Raum keine Zuluft hat (z. B. Fensterlüftung).' },
  Vex: { z: 'V̇_ex', n: 'Abluftvolumenstrom', e: 'm³/h', t: 'Luftmenge, die pro Stunde aus dem Raum abgesaugt wird (z. B. WC, Küche). In dieser App nur zur Information; ist V̇_ex größer als V̇_su, erscheint ein Hinweis.' },
  eta: { z: 'η_WRG', n: 'Rückwärmzahl der Wärmerückgewinnung', e: '–', t: 'Anteil der Wärme, den die Wärmerückgewinnung aus der Abluft zurückholt (Wert zwischen 0 und 1, Herstellerangabe des Lüftungsgeräts). Daraus: θ_su = θ_e + η_WRG · (θ_int − θ_e).' },
  n50: { z: 'n_50', n: 'Luftwechsel bei 50 Pa', e: '1/h', t: 'Maß für die Luftdichtheit der Gebäudehülle. Gemessen mit dem Blower-Door-Test bei 50 Pa Druckunterschied: wie oft pro Stunde das Luftvolumen durch Undichtheiten ausgetauscht wird. Kleiner = dichter.' },
  e: { z: 'e', n: 'Abschirmungskoeffizient', e: '–', t: 'Berücksichtigt, wie stark der Raum dem Wind ausgesetzt ist (freie Lage oder durch Nachbarbebauung abgeschirmt) und wie viele Außenflächen mit Öffnungen er hat. Wert aus der Norm-Tabelle.' },
  eps: { z: 'ε', n: 'Höhenkorrekturfaktor', e: '–', t: 'Berücksichtigt, dass der Wind in größerer Höhe stärker weht: Räume weit über dem Gelände bekommen mehr Infiltration. Wert aus der Norm-Tabelle, abhängig von der Höhe des Raums über Gelände.' },
  Vinf: { z: 'V̇_inf', n: 'Infiltrationsvolumenstrom', e: 'm³/h', t: 'Kalte Außenluft, die durch Undichtheiten der Hülle (Fugen, Anschlüsse) in den Raum strömt. Excel-Ansatz: V̇_inf = 2 · V_i · n_50 · e · ε.' },
  nmin: { z: 'n_min', n: 'Mindestluftwechsel', e: '1/h', t: 'Luftwechsel, der aus hygienischen Gründen mindestens nötig ist, je nach Raumart (Tabelle der DIN/TS 12831-1). Wird nur bei der Variante „Norm“ verwendet: V̇_min = n_min · V_i.' },
  rhocp: { z: 'ρ·c_p', n: 'volumenbezogene Wärmekapazität der Luft', e: 'Wh/(m³·K)', t: 'Produkt aus Dichte ρ und spezifischer Wärmekapazität c_p der Luft. Wandelt einen Luftstrom in m³/h und eine Temperaturdifferenz in K in eine Wärmeleistung in W um.' },
  // Ergebnisse
  PhiT: { z: 'Φ_T', n: 'Transmissionswärmeverlust', e: 'W', t: 'Wärme, die durch die Bauteile (Wände, Fenster, Boden, Decke) nach außen oder in kältere Nachbarräume geht: Summe aller Φ_T,k = A_k · U_c,k · f_k · Δθ.' },
  PhiV: { z: 'Φ_V', n: 'Lüftungswärmeverlust', e: 'W', t: 'Wärme, die nötig ist, um einströmende kalte Luft (Infiltration und Zuluft) auf Raumtemperatur zu bringen: Φ_V = ρ·c_p · [V̇_inf · Δθ + V̇_su · (θ_int − θ_su)].' },
  PhiRH: { z: 'Φ_RH', n: 'Aufheizzuschlag', e: 'W', t: 'Zusätzliche Leistung, um den Raum nach einer Absenkung (Nacht, Wochenende) in vertretbarer Zeit wieder aufzuheizen. Wird nur angesetzt, wenn er vereinbart ist und du einen Wert einträgst.' },
  PhiHL: { z: 'Φ_HL', n: 'Norm-Heizlast', e: 'W', t: 'Wärmeleistung, die die Heizung bei Norm-Außentemperatur liefern muss, damit der Raum seine Norm-Innentemperatur hält: Φ_HL = Φ_T + Φ_V + Φ_RH.' },
  phi: { z: 'φ', n: 'spezifische Heizlast', e: 'W/m²', t: 'Heizlast je m² Grundfläche: φ = Φ_HL / A. Gut zum Vergleichen von Räumen und Gebäuden.' },
  PhiGeb: { z: 'Σ Φ_HL', n: 'Gebäudeheizlast', e: 'W bzw. kW', t: 'Summe der Raumheizlasten aller Räume, hier ohne Abminderungen (z. B. für Gleichzeitigkeit). Damit wird der Wärmeerzeuger geprüft.' },
  PhiWE: { z: 'Φ_WE', n: 'Leistung des Wärmeerzeugers', e: 'kW', t: 'Nennwärmeleistung des Wärmeerzeugers (Wärmepumpe, Kessel) bei Auslegungsbedingungen, aus Planung oder Herstellerangabe.' },
  eta_nw: { z: 'η', n: 'Ausnutzungsgrad (Nachweis)', e: '–', t: 'η = E_d / R_d = Σ Φ_HL / Φ_WE. Der Nachweis ist erfüllt, wenn η ≤ 1,0 – der Wärmeerzeuger also mindestens so viel leistet wie gebraucht wird.' },
  // Organisation
  raumart: { z: '', n: 'Raumart', e: '', t: 'Nutzung des Raums (z. B. Gruppenraum, WC, Flur). Jede Raumart hat in der Normwert-Tabelle ihre θ_int und ihren Mindestluftwechsel. Raumarten legst du im Tab „4 Normwerte“ an.' },
  standort: { z: '', n: 'Standort', e: '', t: 'Ort des Gebäudes. Für jeden Standort trägst du im Tab „4 Normwerte“ θ_e und θ_m,e aus der DIN/TS 12831-1 ein (nach Postleitzahl).' },
  quelle: { z: '', n: 'Quelle', e: '', t: 'Wo der Wert steht: Norm mit Ausgabe, Tabelle und Seite (z. B. „DIN/TS 12831-1:2020-04, Tab. …, S. …“). Ohne Quelle rechnet die App nicht.' },
  geprueft: { z: '', n: 'geprüft', e: '', t: 'Haken erst setzen, wenn du den Wert mit der Norm verglichen hast. Nur geprüfte Normwerte gehen in die Rechnung ein.' },
  klasse: { z: '', n: 'Klasse / Bedingung', e: '', t: 'Wofür der Wert gilt, so wie es in der Norm-Tabelle steht (z. B. Abschirmung und Anzahl der Außenflächen mit Öffnungen bei e oder Höhenbereich bei ε).' },
  kennwert: { z: '', n: 'Kennwert und Faktor im Rechenweg', e: '', t: 'Jede Zeile rechnet Φ = Bezugsgröße · Kennwert · Faktor · Δθ. Bei Bauteilen: Fläche · U_c · f · Δθ. Bei der Lüftung: Luftstrom · ρ·c_p · Faktor · Δθ.' },
  variante: { z: '', n: 'Rechenansatz Excel / Norm', e: '', t: '„Excel“ rechnet wie das Blatt „Heizlast“ deiner Excel-Mappe. „Norm“ folgt DIN EN 12831-1:2017, wo das Excel-Blatt abweicht. Der Testfall 18,29 kW gilt für den Excel-Ansatz.' }
};
if (typeof module !== 'undefined') module.exports = { BEGRIFFE };
