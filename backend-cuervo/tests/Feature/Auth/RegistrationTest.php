<?php

test('public registration is disabled', function () {
    $this->assertFalse(Route::has('register'));
    $this->assertFalse(Route::has('register.store'));

    $this->get('/register')->assertNotFound();
    $this->post('/register', [
        'nombre' => 'Usuario nuevo',
        'email' => 'nuevo@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ])->assertNotFound();
});

test('the landing page sends guests to the Cuervo login', function () {
    $this->get('/')->assertRedirect(route('login'));
});
