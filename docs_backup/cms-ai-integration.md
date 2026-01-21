# Konzept: KI-Integration im CMS

## Zielbild
Die KI-Integration soll Redakteur:innen und Autor:innen in **allen Phasen der Inhaltserstellung** unterstützen: von der Ideengenerierung über das Schreiben und Verbessern bis zur Bildgenerierung und dem Einfügen der Medien ins CMS. Dabei bleibt der/die Nutzer:in stets in Kontrolle (Preview, Freigabe, Änderungswünsche).

Unterstützte (oder leicht erweiterbare) Provider sind z. B.:
- **OpenAI (ChatGPT)**
- **Anthropic (Claude)**
- **Google (Gemini)**
- **Zhipu (z.ai)**

Die Architektur muss **provider-agnostisch** sein, damit neue Modelle und Anbieter ohne tiefgreifende Änderungen integriert werden können.

---

## Anforderungen (Funktionsumfang)

### Inhalte erstellen
- Beiträge auf Basis eines Prompts generieren (Thema, Zielgruppe, Tonalität, Länge, Struktur).
- Automatische Beiträge nach Wunsch (z. B. „Erstelle mir wöchentlich einen News-Post zu Thema X“).

### Inhalte verbessern
- Bestehende Beiträge (Entwürfe) verbessern, zusammenfassen oder umschreiben.
- Stil/Format anpassen (z. B. SEO-optimiert, sachlich, werblich, technisch).

### Bilder generieren und einfügen
- Bildvorschläge zu einem Thema generieren.
- Bilder via Anbieter (z. B. OpenAI Images, Gemini) erstellen und ins CMS einfügen.
- Alternativ: Benutzer lädt eigene Bilder hoch, KI schlägt passende Bildunterschrift/ALT-Text vor.

### Benutzerkontrolle
- Jeder KI-Output bleibt ein **Vorschlag**, der vor der Veröffentlichung bestätigt wird.
- Vorlagen/Presets für wiederkehrende Aufgaben (Tonfall, SEO, Struktur etc.).

---

## Schnittstellen-Konzept (API + Datenmodell)

### 1) Einheitliche Provider-API (Abstraktionsschicht)
Definiere eine interne, einheitliche Schnittstelle, die **alle Provider gleich anspricht**. Beispiel:

```ts
// Pseudocode / TypeScript
interface AiProvider {
  name: "openai" | "anthropic" | "gemini" | "zai" | string;
  generateText(input: TextGenerationRequest): Promise<TextGenerationResponse>;
  improveText(input: TextImprovementRequest): Promise<TextGenerationResponse>;
  generateImage(input: ImageGenerationRequest): Promise<ImageGenerationResponse>;
}
```

Damit können neue Anbieter eingebunden werden, ohne dass das CMS selbst umgebaut werden muss.

---

### 2) Request-Formate (CMS-intern)
Die CMS-Schicht nutzt eigene, **provider-neutrale** Modelle:

```json
{
  "task": "generate_text",
  "language": "de",
  "style": "journalistisch",
  "length": "700",
  "topic": "Nachhaltigkeit in der Logistik",
  "keywords": ["CO2", "Transport", "Green Logistics"],
  "structure": ["Einleitung", "Hauptteil", "Fazit"],
  "format": "markdown"
}
```

Für Bildgenerierung:

```json
{
  "task": "generate_image",
  "prompt": "Moderne Logistikhalle bei Sonnenuntergang, nachhaltige Technik",
  "style": "realistisch",
  "ratio": "16:9",
  "count": 1
}
```

---

## Technische Umsetzung (Backend)

### 1) Service-Layer: `ai_service`
- Zentrale Komponente, die **Provider wählt**, Credentials verwaltet und Requests validiert.
- Beispiel-Pipeline:
  1. CMS-Request empfangen
  2. Validieren
  3. Provider auswählen (Default oder Nutzerwahl)
  4. API-Call ausführen
  5. Ergebnis normalisieren
  6. Ergebnis speichern + Rückgabe

### 2) Provider-Adapter
Für jeden Anbieter wird ein Adapter implementiert:
- `OpenAiAdapter`
- `ClaudeAdapter`
- `GeminiAdapter`
- `ZaiAdapter`

Jeder Adapter mappt das CMS-Request-Format auf das jeweilige Provider-Format.

### 3) Credential-Handling
- API-Keys werden **verschlüsselt** gespeichert.
- Nutzung von **Secrets Manager** oder `.env` (je nach Deployment)
- Jeder Anbieter benötigt eigene Credentials:
  - OpenAI: `OPENAI_API_KEY`
  - Anthropic: `ANTHROPIC_API_KEY`
  - Google Gemini: `GEMINI_API_KEY`
  - Z.ai: `ZAI_API_KEY`

---

## Technische Umsetzung (Frontend)

### 1) Editor-UI
- KI-Button im Editor ("Text verbessern", "Neu generieren", "Bild erstellen").
- Prompt-Panel mit Parametern (Tonfall, Länge, Sprache, Stil).
- Vorschau + Vergleich (Diff-Ansicht zwischen Original und KI-Version).

### 2) Workflow im UI
1. User wählt Aktion (z. B. „Verbessern“)
2. User gibt optional Parameter ein
3. CMS sendet Request an Backend
4. Ergebnis erscheint als Vorschlag
5. User kann übernehmen, ablehnen oder bearbeiten

---

## Datenhaltung & Logging

### Speicherung
- KI-Ergebnisse können als **Entwurfsversionen** gespeichert werden.
- Jede Antwort wird historisiert (z. B. `ai_generation_logs`).

### Audit & Transparenz
- Log der Prompts + Antworten (wenn erlaubt, DSGVO beachten).
- Kennzeichnung von KI-generierten Beiträgen möglich.

---

## Sicherheit & Compliance
- Rollenbasierte Berechtigungen (wer darf KI nutzen?).
- DSGVO: keine personenbezogenen Daten an KI senden ohne Zustimmung.
- Content-Filterung gegen sensible Inhalte.

---

## Beispiel-Implementierung (High-Level)

```python
# ai_service.py (vereinfachtes Beispiel)
class AIService:
    def __init__(self, provider: AiProvider):
        self.provider = provider

    def generate_article(self, request):
        return self.provider.generateText(request)

    def improve_article(self, request):
        return self.provider.improveText(request)

    def generate_image(self, request):
        return self.provider.generateImage(request)
```

---

## Erweiterbarkeit
- Neue Provider können per Adapter ergänzt werden.
- Unterstützung weiterer Features möglich (z. B. Audio/Video-Generierung).
- Multi-Provider-Fallbacks (z. B. wenn Claude ausfällt, automatisch OpenAI nutzen).

---

## Fazit
Mit einer **provider-agnostischen Schnittstelle**, klaren Workflows und einer sicheren Credential-Verwaltung lässt sich die KI-Integration flexibel umsetzen. Die Redaktion kann Beiträge schneller erstellen, verbessern und multimodale Inhalte (Text + Bild) direkt im CMS erzeugen – komplett steuerbar über den/die Nutzer:in.
