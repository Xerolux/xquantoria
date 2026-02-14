<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('document.{documentId}', function ($user, $documentId) {
    return [
        'id' => $user->id,
        'name' => $user->name,
        'email' => $user->email,
        'avatar' => $user->avatar ?? null,
    ];
});

Broadcast::channel('post.{postId}', function ($user, $postId) {
    $post = \App\Models\Post::find($postId);
    
    if (!$post) {
        return false;
    }

    if ($user->can('edit', $post)) {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'avatar' => $user->avatar ?? null,
        ];
    }

    return false;
});

Broadcast::channel('page.{pageId}', function ($user, $pageId) {
    $page = \App\Models\StaticPage::find($pageId);
    
    if (!$page) {
        return false;
    }

    if ($user->can('edit', $page)) {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'avatar' => $user->avatar ?? null,
        ];
    }

    return false;
});

Broadcast::channel('media.{mediaId}', function ($user, $mediaId) {
    return [
        'id' => $user->id,
        'name' => $user->name,
        'email' => $user->email,
    ];
});

Broadcast::channel('global', function ($user) {
    if (in_array($user->role, ['admin', 'super_admin'])) {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'role' => $user->role,
        ];
    }

    return false;
});
