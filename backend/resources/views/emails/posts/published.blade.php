<x-mail::message>
# Neuer Beitrag veröffentlicht

Hallo {{ $subscriber->name }},

ein neuer Beitrag wurde gerade veröffentlicht:

## {{ $post->title }}

@if($post->excerpt)
{{ $post->excerpt }}
@endif

<x-mail::button :url="$url">
 Beitrag lesen
</x-mail::button>

@if($post->author)
<p style="color: #666; font-size: 12px;">
 Von {{ $post->author->name }} am {{ $post->published_at->format('d.m.Y') }}
</p>
@endif

---

<small>
 Sie erhalten diese E-Mail, weil Sie unseren Newsletter abonniert haben.
 <a href="{{ $unsubscribeUrl }}">Abbestellen</a>
</small>
</x-mail::message>
