<x-mail::message>
# Neuer Kommentar

Ein neuer Kommentar wartet auf Moderation:

**Beitrag:** {{ $postTitle }}<br>
**Autor:** {{ $authorName }}<br>
**Inhalt:**

<div style="background: #f5f5f5; padding: 12px; border-radius: 4px; margin: 16px 0;">
 {{ $comment->content }}
</div>

<x-mail::button :url="$approveUrl">
 Kommentar freigeben
</x-mail::button>

---

<small>
 Dieser Kommentar wartet auf Ihre Freigabe.
</small>
</x-mail::message>
