<x-mail::message>
# Wöchentlicher Report

## Übersicht ({{ $period['start'] }} - {{ $period['end'] }})

### 📝 Beiträge
- Gesamt: {{ $posts['total'] }}
- Veröffentlicht: {{ $posts['published'] }}
- Geplant: {{ $posts['scheduled'] }}

### 💬 Kommentare
- Gesamt: {{ $comments['total'] }}
- Genehmigt: {{ $comments['approved'] }}
- Spam: {{ $comments['spam'] }}

### 👥 Benutzer
- Neue Registrierungen: {{ $users['new'] }}

@if($newsletter['new_subscribers'] > 0)
### 📧 Newsletter
- Neue Abonnenten: {{ $newsletter['new_subscribers'] }}
@endif

### 🔥 Meistgelesene Beiträge
@foreach($most_viewed_posts as $post)
- {{ $post['title'] }} ({{ $post['views'] }} Aufrufe)
@endforeach

---

<small>Dies ist ein automatisierter wöchentlicher Bericht.</small>
</x-mail::message>
