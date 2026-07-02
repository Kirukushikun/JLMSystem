<?php

use Illuminate\Support\Facades\Broadcast;

// Each user's private notification channel — only the user themselves can subscribe
Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});
