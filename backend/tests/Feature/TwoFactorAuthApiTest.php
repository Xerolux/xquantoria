<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PragmaRX\Google2FA\Google2FA;
use Tests\TestCase;

class TwoFactorAuthApiTest extends TestCase
{
    use RefreshDatabase;

    protected string $apiVersion = 'api/v1';
    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    public function test_user_can_get_2fa_status()
    {
        $response = $this->actingAs($this->user)
            ->getJson("{$this->apiVersion}/2fa/status");

        $response->assertStatus(200)
            ->assertJson([
                'enabled' => false,
                'has_recovery_codes' => false,
            ]);
    }

    public function test_user_can_setup_2fa()
    {
        $response = $this->actingAs($this->user)
            ->postJson("{$this->apiVersion}/2fa/setup");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'secret',
                'qr_code_url',
                'recovery_codes',
            ]);

        $this->assertNotNull($response->json('secret'));
        $this->assertIsArray($response->json('recovery_codes'));
        $this->assertCount(8, $response->json('recovery_codes'));
    }

    public function test_user_can_confirm_2fa_with_valid_code()
    {
        $google2fa = new Google2FA();
        $secret = $google2fa->generateSecretKey();

        $this->user->two_factor_secret = encrypt($secret);
        $this->user->save();

        $validCode = $google2fa->getCurrentOtp($secret);

        $response = $this->actingAs($this->user)
            ->postJson("{$this->apiVersion}/2fa/confirm", [
                'code' => $validCode,
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Two-factor authentication enabled successfully.',
            ]);

        $this->user->refresh();
        $this->assertNotNull($this->user->two_factor_confirmed_at);
    }

    public function test_user_cannot_confirm_2fa_with_invalid_code()
    {
        $google2fa = new Google2FA();
        $secret = $google2fa->generateSecretKey();

        $this->user->two_factor_secret = encrypt($secret);
        $this->user->save();

        $response = $this->actingAs($this->user)
            ->postJson("{$this->apiVersion}/2fa/confirm", [
                'code' => '000000',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['code']);
    }

    public function test_user_can_verify_2fa_code()
    {
        $google2fa = new Google2FA();
        $secret = $google2fa->generateSecretKey();

        $this->user->two_factor_secret = encrypt($secret);
        $this->user->two_factor_confirmed_at = now();
        $this->user->save();

        $validCode = $google2fa->getCurrentOtp($secret);

        $response = $this->actingAs($this->user)
            ->postJson("{$this->apiVersion}/2fa/verify", [
                'code' => $validCode,
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'valid' => true,
            ]);
    }

    public function test_user_can_disable_2fa()
    {
        $this->user->two_factor_secret = encrypt('secret');
        $this->user->two_factor_confirmed_at = now();
        $this->user->two_factor_recovery_codes = encrypt(json_encode(['code1', 'code2']));
        $this->user->save();

        $response = $this->actingAs($this->user)
            ->postJson("{$this->apiVersion}/2fa/disable");

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Two-factor authentication disabled successfully.',
            ]);

        $this->user->refresh();
        $this->assertNull($this->user->two_factor_secret);
        $this->assertNull($this->user->two_factor_confirmed_at);
    }

    public function test_user_can_get_recovery_codes()
    {
        $recoveryCodes = ['ABCD1234', 'EFGH5678', 'IJKL9012'];
        $this->user->two_factor_recovery_codes = encrypt(json_encode($recoveryCodes));
        $this->user->save();

        $response = $this->actingAs($this->user)
            ->getJson("{$this->apiVersion}/2fa/recovery-codes");

        $response->assertStatus(200)
            ->assertJson([
                'recovery_codes' => $recoveryCodes,
            ]);
    }

    public function test_user_can_regenerate_recovery_codes()
    {
        $oldCodes = ['OLD1234', 'OLD5678'];
        $this->user->two_factor_recovery_codes = encrypt(json_encode($oldCodes));
        $this->user->save();

        $response = $this->actingAs($this->user)
            ->postJson("{$this->apiVersion}/2fa/recovery-codes/regenerate");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'recovery_codes',
            ]);

        $newCodes = $response->json('recovery_codes');
        $this->assertCount(8, $newCodes);
        $this->assertNotEquals($oldCodes, $newCodes);
    }

    public function test_user_can_authenticate_with_recovery_code()
    {
        $recoveryCodes = ['ABCD1234', 'EFGH5678'];
        $this->user->two_factor_recovery_codes = encrypt(json_encode($recoveryCodes));
        $this->user->two_factor_confirmed_at = now();
        $this->user->save();

        $response = $this->actingAs($this->user)
            ->postJson("{$this->apiVersion}/2fa/verify", [
                'recovery_code' => 'ABCD1234',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'valid' => true,
            ]);

        $this->user->refresh();
        $remainingCodes = json_decode(decrypt($this->user->two_factor_recovery_codes), true);
        $this->assertNotContains('ABCD1234', $remainingCodes);
    }

    public function test_recovery_code_can_only_be_used_once()
    {
        $recoveryCodes = ['ABCD1234', 'EFGH5678'];
        $this->user->two_factor_recovery_codes = encrypt(json_encode($recoveryCodes));
        $this->user->two_factor_confirmed_at = now();
        $this->user->save();

        $this->actingAs($this->user)
            ->postJson("{$this->apiVersion}/2fa/verify", [
                'recovery_code' => 'ABCD1234',
            ]);

        $response = $this->actingAs($this->user)
            ->postJson("{$this->apiVersion}/2fa/verify", [
                'recovery_code' => 'ABCD1234',
            ]);

        $response->assertStatus(422);
    }
}
