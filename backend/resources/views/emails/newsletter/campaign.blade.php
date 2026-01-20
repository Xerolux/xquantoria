@component('mail::message')
# {{ $newsletter->subject }}

{!! $newsletter->content !!}

@component('mail::subcopy')
You are receiving this email because you subscribed to our newsletter.
[Unsubscribe]({{ $unsubscribeUrl }})
@endcomponent
@endcomponent
