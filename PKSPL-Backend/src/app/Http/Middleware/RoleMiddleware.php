<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

/**
 * Middleware authorisasi berbasis role pengguna.
 */
class RoleMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @param  string|array  ...$roles
     * @return \Illuminate\Http\JsonResponse|mixed
     */
    public function handle(Request $request, Closure $next, ...$roles)
    {
        $user = $request->user();
        $flattened = [];
        foreach ($roles as $role) {
            foreach (explode(',', (string) $role) as $r) {
                $trimmed = trim($r);
                if ($trimmed !== '') {
                    $flattened[] = \App\Models\Role::normalize($trimmed);
                }
            }
        }
        $allowedRoles = array_unique($flattened);
        $userRoleName = optional($user->role)->nama_role;

        if (! $user || ! $userRoleName || ! in_array($userRoleName, $allowedRoles, true)) {
            return response()->json([
                'message' => 'Forbidden. You do not have permission to access this resource.',
            ], Response::HTTP_FORBIDDEN);
        }

        return $next($request);
    }
}
