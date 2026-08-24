# Mindfield

Mindfield ist eine App zur **psychischen und fitness-technischen Unterstützung von Sportlern**.

## Vision

Langfristiges Ziel: Sportler mental gesund halten und sie bei Bedarf an qualifizierte Psychiater vermitteln. Fitness-Tracking ist dabei der niedrigschwellige Einstieg – der eigentliche Mehrwert liegt in der mentalen Gesundheit.

## Zielnutzer

Ambitionierte Amateur- und Leistungssportler mit erhöhtem mentalem Belastungsrisiko (z. B. durch Leistungsdruck, Übertraining, Verletzungspausen).

## Aufbau der App

Die App gliedert sich in folgende Bereiche:

### Startseite (Dashboard)
Die oberste Ebene – zeigt eine kompakte Übersicht ausgewählter Daten aus den anderen Bereichen (Fitness, Kalender, Stimmung) sowie ganz oben ein **tägliches Update** als erste, wichtigste Information des Tages.

### Aktivitäten
Zeigt alle Daten, die der angebundene Fitness-Tracker liefert (z. B. Schritte, Puls, Schlaf, Trainingseinheiten).

### Kalender
Ein normaler Kalender (Monats-/Wochen-/Tagesansicht, geplante Trainings) – zusätzlich mit einer Anzeige der **Stimmung (Mood)**, die an dem jeweiligen Tag erfasst wurde. Verbindet damit Fitness- und Mental-Health-Tracking auf einer Zeitachse.

### KI-Assistent
Ein Chat-Bereich, über den man direkt mit dem KI-Assistenten kommunizieren kann – er begleitet im Alltag, erkennt Muster (z. B. Zusammenhänge zwischen Training, Schlaf und Stimmung) und warnt bei Auffälligkeiten.

### Kontakte
Ermöglicht es, direkt aus der App heraus mit Therapeuten/Psychiatern in Kontakt zu treten bzw. sie anzuschreiben – die konkrete Umsetzung des Vermittlungs-Use-Case.

### Geplante Integration: Fitness-Tracker-Anbindung
Langfristiges Ziel ist eine Anbindung per API an verschiedene gängige Fitness-Tracker, damit echte Trainings-, Puls- und Schlafdaten automatisch in die App einfließen (aktuell noch nicht umgesetzt).

## Kern-Use-Cases (übergreifend)

1. **Fitness-Tracking** – Sportler tracken Metriken (Schritte, Puls, Schlaf) und ihre Trainings.
2. **Mentale Gesundheit** – Sportler tracken ihre mentale Verfassung (Mood-Einträge, Journal, Selbst-Checks).
3. **KI-Assistent** – begleitet im Alltag, spiegelt Muster und warnt bei Auffälligkeiten.
4. **Vermittlung an Psychiater** – bei Bedarf Vermittlung an verifizierte Psychiater inkl. Terminbuchung und sicherer Kommunikation.

## Betreiber

Aktuell ein Ein-Personen-Projekt. Ziel ist, es professionell und wartbar auszubauen.

## Technischer Stand

- **Plattform**: Electron-Desktop-App (kein Web-Deployment).
- **Sprache**: TypeScript für den Electron-Main-Prozess (`src/main`); die UI (`src/renderer`) ist aktuell ein aus Claude Design importiertes `.dc.html`-Canvas.
- **Tests**: Vitest.
- **Fachlogik**: Der Daten-Layer für das Mental-Health-Tracking (Mood-Einträge, Journal, Selbst-Checks) ist implementiert – inklusive lokaler Speicherung und einer abgesicherten Brücke zur UI. Die zugehörigen Bildschirme fehlen noch: das UI-Grundgerüst zeigt weiterhin nur das Dashboard-Design mit Beispieldaten, die Bereiche Aktivitäten, Kalender, KI-Assistent und Kontakte sind noch nicht gebaut.
- **Speicherung**: Mental-Health-Daten liegen ausschließlich lokal auf dem Rechner des Nutzers (eine JSON-Datei im persönlichen App-Datenordner, nur für den eigenen Benutzer lesbar). Es werden keine Daten an einen Server gesendet. Eine Verschlüsselung dieser Datei ist vorgesehen, aber noch nicht umgesetzt.
- **Selbst-Checks**: Die Struktur für Fragebögen steht, es ist aber bewusst noch kein konkreter (klinisch validierter) Fragebogen hinterlegt – dessen Auswahl ist eine fachliche, keine technische Entscheidung.

Mehr technische Details, Konventionen und Kontext für die Entwicklung stehen in [`CLAUDE.md`](CLAUDE.md).

## Sensible Aspekte

Da es um psychische Gesundheitsdaten geht, sind Datenschutz, Sicherheit der Kommunikation (Sportler ↔ Psychiater) und eine verlässliche Erkennung von Auffälligkeiten (ohne Fehlalarm-Übermaß) zentrale, nicht-funktionale Anforderungen, die bei jeder Ausbaustufe mitgedacht werden sollten.
