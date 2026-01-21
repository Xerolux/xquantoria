# Beiträge teilen – Leitfaden für die Implementierung

Dieses Dokument beschreibt, wie Beiträge aus dem CMS über verschiedene Kanäle geteilt werden können. Ziel ist, der KI klare Hinweise zu geben, **welche Daten nötig sind** und **welche Share-Mechanismen** pro Plattform sinnvoll sind.

## 1. Grundlagen

### Pflichtdaten für alle Share-Optionen
- **Beitrags-URL** (öffentlich erreichbar, canonical URL)
- **Beitrags-Titel**
- **Kurzbeschreibung/Excerpt**
- **Beitragsbild** (Open Graph / Twitter Card)

### Technische Basis
- **Open Graph (OG) Tags** im HTML, damit Vorschauen korrekt funktionieren (Facebook, WhatsApp, Signal, Telegram, LinkedIn usw.).
- **Twitter Card Tags** für X (ehemals Twitter).
- **Canonical URL** für stabile Linkvorschau.

## 2. Plattformen & Share-URLs

Die meisten Plattformen unterstützen URL-basiertes Teilen über Query-Parameter. Typisch ist ein `shareUrl`-Link.

### 2.1 WhatsApp
- **Schema:** `https://wa.me/?text=<TEXT>`
- **TEXT** sollte URL-encodet sein, meist: `Titel + " " + URL`
- **Beispiel:** `https://wa.me/?text=Mein%20Beitrag%20https%3A%2F%2Fexample.com%2Fpost`

### 2.2 Signal
- **Schema:** `https://signal.me/#p/<TEXT>`
- **TEXT** URL-encodet (Titel + URL)
- Hinweis: Signal nutzt kein offizielles Web-Share-API, Share-Link öffnet Signal nur auf Geräten mit installiertem Signal.

### 2.3 Telegram
- **Schema:** `https://t.me/share/url?url=<URL>&text=<TEXT>`
- `url` und `text` URL-encodet

### 2.4 E-Mail
- **Schema:** `mailto:?subject=<SUBJECT>&body=<BODY>`
- `subject` = Titel, `body` = Kurztext + URL

### 2.5 X (Twitter)
- **Schema:** `https://twitter.com/intent/tweet?url=<URL>&text=<TEXT>`
- Unterstützt optionale Parameter wie `hashtags` und `via`

### 2.6 Facebook
- **Schema:** `https://www.facebook.com/sharer/sharer.php?u=<URL>`
- Vorschau basiert auf OG-Tags, nicht auf Query-Parametern.

### 2.7 Instagram
- **Kein offizieller Web-Share-Link** wie bei Facebook/Twitter.
- Optionen:
  - **Copy-Link**-Button anbieten (URL in Zwischenablage kopieren).
  - **Instagram Story Share** ist nur via Mobile App/API möglich, nicht per Web-URL.
  - Für Web: Nutzer informieren „Link kopieren und in Instagram einfügen“.

## 3. Web Share API (Fallback-fähig)

Viele Mobile-Browser unterstützen das native Teilen:

```js
if (navigator.share) {
  navigator.share({
    title: postTitle,
    text: postExcerpt,
    url: postUrl,
  });
} else {
  // Fallback: eigene Share-Buttons
}
```

## 4. UX-Empfehlung

- **Share-Buttons** mit Icon + Tooltip
- **Copy-Link** immer anbieten (für Instagram/Fallback)
- Auf Mobile zuerst Web Share API anbieten
- Auf Desktop klassische Share-URLs nutzen

## 5. Beispiel-Datenstruktur (für KI-Logik)

```json
{
  "title": "Beispieltitel",
  "url": "https://example.com/blog/beitrag-123",
  "excerpt": "Kurzbeschreibung des Beitrags...",
  "image": "https://example.com/images/beitrag-123.jpg"
}
```

## 6. Zusammenfassung

- WhatsApp, Signal, Telegram, X, Facebook und E-Mail können über URL-Schemata geteilt werden.
- Instagram benötigt Copy-Link oder Mobile-App-Support.
- Gute Linkvorschauen erfordern OG-/Twitter-Metadaten.
- Die KI soll aus Titel, URL und Kurztext die passenden Share-Links generieren.
