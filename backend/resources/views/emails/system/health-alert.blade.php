@component('mail::message')
# System Health Alert

@if(!empty($issues))
## 🚨 Critical Issues ({{ count($issues) }})

@foreach($issues as $issue)
- ❌ {{ $issue }}
@endforeach
@endif

@if(!empty($warnings))
## ⚠️ Warnings ({{ count($warnings) }})

@foreach($warnings as $warning)
- ⚠️ {{ $warning }}
@endforeach
@endif

## 📊 System Statistics

| Component | Status |
|-----------|--------|
@foreach($stats as $component => $data)
| **{{ ucfirst($component) }}** | {{ json_encode($data) }} |
@endforeach

---

**Timestamp:** {{ $timestamp }}
**Server:** {{ gethostname() }}
**Application:** {{ $appName }}

@component('mail::button', ['url' => $appUrl . '/admin/system'])
View Dashboard
@endcomponent

<p style="color: #666; font-size: 12px;">
This is an automated health alert from {{ $appName }}.
</p>
@endcomponent
