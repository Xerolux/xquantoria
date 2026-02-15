<?php

namespace App\Http\Middleware;

use App\Models\Redirect;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RedirectMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $path = '/' . $request->path();

        $redirect = Redirect::findByUrl($path);

        if (!$redirect) {
            $redirect = Redirect::findByUrl(rtrim($path, '/'));
        }

        if ($redirect) {
            $redirect->incrementHit();
            return redirect($redirect->to_url, $redirect->status_code);
        }

        return $next($request);
    }
}
