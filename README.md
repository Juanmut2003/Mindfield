# Mindfield

Mindfield ist eine App zur **psychischen und fitness-technischen Unterstützung von Sportlern**.

## Vision

Langfristiges Ziel: Sportler mental gesund halten und sie bei Bedarf an qualifizierte Psychiater vermitteln. Fitness-Tracking ist dabei der niedrigschwellige Einstieg – der eigentliche Mehrwert liegt in der mentalen Gesundheit.

## Zielnutzer

Ambitionierte Amateur- und Leistungssportler mit erhöhtem mentalem Belastungsrisiko (z. B. durch Leistungsdruck, Übertraining, Verletzungspausen).

## Kern-Use-Cases (über alle Ausbaustufen)

1. **Fitness-Tracking** – Sportler tracken Metriken (Schritte, Puls, Schlaf) und ihre Trainings.
2. **Mentale Gesundheit** – Sportler tracken ihre mentale Verfassung (Mood-Einträge, Journal, Selbst-Checks).
3. **KI-Assistent** – begleitet im Alltag, spiegelt Muster (z. B. Zusammenhang Training/Schlaf/Stimmung) und warnt bei Auffälligkeiten.
4. **Vermittlung an Psychiater** – bei Bedarf Vermittlung an verifizierte Psychiater inkl. Terminbuchung und sicherer Kommunikation.

## Betreiber

Aktuell ein Ein-Personen-Projekt. Ziel ist, es professionell und wartbar auszubauen – Entscheidungen (Architektur, Datenschutz, Skalierung) sollten das im Hinterkopf behalten.

## Entwicklungsstand

Der Aufbau erfolgt schrittweise, Feature für Feature, in Abstimmung mit dem Betreiber.

- **UI**: Erstes Dashboard-Screen-Design (`Homescreen.dc.html`) aus Claude Design importiert und als Desktop-App umgesetzt.
- **Plattform**: Electron-Desktop-App (`main.js`, `package.json`) – kein Web-Deployment, echtes natives Fenster.
- **Fachlogik**: Noch nicht implementiert (Stand: UI-Grundgerüst). Tracking, Journal, KI-Assistent und Psychiater-Vermittlung sind als nächste Ausbaustufen vorgesehen, aber noch nicht begonnen.

## Sensible Aspekte

Da es um psychische Gesundheitsdaten geht, sind Datenschutz, Sicherheit der Kommunikation (Sportler ↔ Psychiater) und eine verlässliche Erkennung von Auffälligkeiten (ohne Fehlalarm-Übermaß) zentrale, nicht-funktionale Anforderungen, die bei jeder Ausbaustufe mitgedacht werden sollten.
