param(
    [Parameter(Mandatory = $true)]
    [string]$SftpHandoffPath,

    [Parameter(Mandatory = $true)]
    [string]$SiteUrl,

    [Parameter(Mandatory = $true)]
    [string]$HostKey,

    [Parameter(Mandatory = $true)]
    [string]$PLinkPath,

    [Parameter(Mandatory = $true)]
    [string]$EvidencePath
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Invoke-RemotePhp {
    param([Parameter(Mandatory = $true)][string]$Source)

    $result = $Source | & $PLinkPath -batch -ssh -hostkey $HostKey -l $script:SshUser -pw $script:SshPassword $script:SshHost 'cd /html && wp eval-file - --path=/html'
    if ($LASTEXITCODE -ne 0) {
        throw 'Remote WordPress PHP execution failed.'
    }

    return ($result -join "`n").Trim()
}

function Invoke-JsonRequest {
    param(
        [Parameter(Mandatory = $true)][string]$Uri,
        [Parameter(Mandatory = $true)][string]$Method,
        [hashtable]$Headers = @{},
        [string]$Body = ''
    )

    $parameters = @{
        Uri             = $Uri
        Method          = $Method
        Headers         = $Headers
        UseBasicParsing = $true
        TimeoutSec      = 30
    }
    if ('' -ne $Body) {
        $parameters.ContentType = 'application/json'
        $parameters.Body = $Body
    }

    $response = Invoke-WebRequest @parameters
    return @{
        StatusCode = [int]$response.StatusCode
        Json       = $response.Content | ConvertFrom-Json
    }
}

$lines = Get-Content -LiteralPath $SftpHandoffPath
if ($lines.Count -lt 6 -or $lines[1].Trim() -notmatch '^ssh\s+([^@\s]+)@([^\s]+)$') {
    throw 'The SFTP handoff file does not contain the expected SSH command.'
}

$script:SshUser = $Matches[1]
$script:SshHost = $Matches[2]
$script:SshPassword = $lines[5].Trim()
if ('' -eq $script:SshPassword) {
    throw 'The SFTP handoff password is empty.'
}

$suffix = [Guid]::NewGuid().ToString('N')
$eventId = "codex-webhook-$suffix"
$backupOption = "tcg_codex_webhook_backup_$suffix"
$applicationName = "Codex webhook smoke $suffix"
$webhookSecret = 'whsec_' + ([Guid]::NewGuid().ToString('N')) + ([Guid]::NewGuid().ToString('N'))
$site = $SiteUrl.TrimEnd('/')
$setup = $null
$cleanup = $null
$evidence = $null

try {
    $setupPhp = @'
<?php
$backup_option = '__BACKUP_OPTION__';
$application_name = '__APPLICATION_NAME__';
$secret = '__WEBHOOK_SECRET__';
$settings = get_option('tcg_store_platform_settings', array());
update_option($backup_option, array('settings' => $settings, 'app_user_id' => 0, 'app_uuid' => ''), false);
if (!isset($settings['scrydex_provider']) || !is_array($settings['scrydex_provider'])) {
    $settings['scrydex_provider'] = array();
}
$settings['scrydex_provider']['webhook_receiver_enabled'] = true;
$settings['scrydex_provider']['webhook_secret'] = $secret;
update_option('tcg_store_platform_settings', $settings, false);
$admins = get_users(array('role' => 'administrator', 'number' => 1, 'orderby' => 'ID', 'order' => 'ASC'));
if (!$admins || !class_exists('WP_Application_Passwords')) {
    throw new RuntimeException('Unable to prepare temporary authenticated relay credentials.');
}
$user = $admins[0];
$created = WP_Application_Passwords::create_new_application_password($user->ID, array('name' => $application_name));
if (is_wp_error($created)) {
    throw new RuntimeException('Unable to create temporary authenticated relay credentials.');
}
$backup = get_option($backup_option, array());
$backup['app_user_id'] = (int) $user->ID;
$backup['app_uuid'] = (string) ($created[1]['uuid'] ?? '');
update_option($backup_option, $backup, false);
echo wp_json_encode(array(
    'user_login' => $user->user_login,
    'application_password' => $created[0],
));
'@
    $setupPhp = $setupPhp.Replace('__BACKUP_OPTION__', $backupOption).Replace('__APPLICATION_NAME__', $applicationName).Replace('__WEBHOOK_SECRET__', $webhookSecret)
    $setup = Invoke-RemotePhp -Source $setupPhp | ConvertFrom-Json

    $basicToken = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("$($setup.user_login):$($setup.application_password)"))
    $authHeaders = @{ Authorization = "Basic $basicToken" }
    $body = (@{
        id   = $eventId
        name = 'pokemon.expansions.prices.raw_updated'
        data = @{ expansion_ids = @('codex-test-expansion') }
    } | ConvertTo-Json -Depth 5 -Compress)
    $timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
    $hmac = [Security.Cryptography.HMACSHA256]::new([Text.Encoding]::UTF8.GetBytes($webhookSecret))
    try {
        $digest = [BitConverter]::ToString(
            $hmac.ComputeHash([Text.Encoding]::UTF8.GetBytes("$timestamp.$body"))
        ).Replace('-', '').ToLowerInvariant()
    }
    finally {
        $hmac.Dispose()
    }

    $receive = Invoke-JsonRequest -Uri "$site/wp-json/tcg-store/v1/scrydex/webhooks" -Method POST -Headers @{
        'X-Scrydex-Signature' = "t=$timestamp,v1=$digest"
    } -Body $body
    if ($receive.StatusCode -ne 202 -or $receive.Json.data.status -ne 'accepted' -or $receive.Json.data.event_log.status -notin @('logged', 'duplicate')) {
        throw 'The signed webhook was not durably accepted.'
    }

    $diagnosticPhp = @'
<?php
$event_id = '__EVENT_ID__';
global $wpdb;
$table = $wpdb->prefix . 'tcg_webhook_events';
$row = $wpdb->get_row($wpdb->prepare(
    "SELECT provider_event_id, signature_status, processing_status, relay_attempt_count, next_attempt_at, received_at FROM `{$table}` WHERE provider_name = %s AND provider_event_id = %s",
    'scrydex',
    $event_id
), ARRAY_A);
echo wp_json_encode(array('row' => $row, 'database_time_utc' => $wpdb->get_var('SELECT UTC_TIMESTAMP(6)')));
'@
    $diagnosticPhp = $diagnosticPhp.Replace('__EVENT_ID__', $eventId)
    $dbEvent = Invoke-RemotePhp -Source $diagnosticPhp | ConvertFrom-Json

    $due = Invoke-JsonRequest -Uri "$site/wp-json/tcg-store/v1/scrydex/webhook-events?limit=100" -Method GET -Headers $authHeaders
    $matchingEvents = @($due.Json.data.events | Where-Object { $_.id -eq $eventId })
    $relayBacklogAtLimit = ($due.StatusCode -eq 200 -and [int]$due.Json.data.count -eq 100 -and $matchingEvents.Count -eq 0 -and $dbEvent.row.processing_status -eq 'queued')
    if ($due.StatusCode -ne 200 -or ($matchingEvents.Count -ne 1 -and -not $relayBacklogAtLimit)) {
        $safeDiagnostic = [ordered]@{
            relay_http_status = $due.StatusCode
            relay_count = $due.Json.data.count
            matching_count = $matchingEvents.Count
            stored_event = $dbEvent.row
            database_time_utc = $dbEvent.database_time_utc
        } | ConvertTo-Json -Depth 5 -Compress
        throw "The accepted webhook was not available to the authenticated LAN relay: $safeDiagnostic"
    }

    $encodedEventId = [Uri]::EscapeDataString($eventId)
    $claim = Invoke-JsonRequest -Uri "$site/wp-json/tcg-store/v1/scrydex/webhook-events/$encodedEventId" -Method PATCH -Headers $authHeaders -Body '{"status":"processing"}'
    if ($claim.StatusCode -ne 200 -or $claim.Json.data.status -ne 'ok') {
        throw 'The LAN relay could not claim the webhook event.'
    }

    $complete = Invoke-JsonRequest -Uri "$site/wp-json/tcg-store/v1/scrydex/webhook-events/$encodedEventId" -Method PATCH -Headers $authHeaders -Body '{"status":"processed","result_reference":"codex-reversible-smoke"}'
    if ($complete.StatusCode -ne 200 -or $complete.Json.data.status -ne 'ok') {
        throw 'The LAN relay could not complete the webhook event.'
    }

    $after = Invoke-JsonRequest -Uri "$site/wp-json/tcg-store/v1/scrydex/webhook-events?limit=100" -Method GET -Headers $authHeaders
    $stillDue = @($after.Json.data.events | Where-Object { $_.id -eq $eventId }).Count

    $evidence = [ordered]@{
        test                              = 'wordpress_scrydex_webhook_roundtrip'
        site                              = $site
        passed                            = ($stillDue -eq 0)
        schema_version                    = 18
        receive_http_status               = $receive.StatusCode
        receive_status                    = $receive.Json.data.status
        durable_event_log_status          = $receive.Json.data.event_log.status
        relay_poll_http_status            = $due.StatusCode
        relay_matching_event_count        = $matchingEvents.Count
        relay_backlog_at_limit             = $relayBacklogAtLimit
        relay_claim_status                = $claim.Json.data.status
        relay_complete_status             = $complete.Json.data.status
        event_due_after_completion        = $stillDue
        targeted_expansion_sync           = [bool]$receive.Json.data.targeted_expansion_sync
        full_catalog_polling_requested    = [bool]$receive.Json.data.full_catalog_polling_requested
        credentials_written_to_evidence   = $false
        reversible_temporary_state_only   = $true
    }

    if (-not $evidence.passed) {
        throw 'The completed webhook remained in the due relay queue.'
    }
}
finally {
    $cleanupPhp = @'
<?php
$backup_option = '__BACKUP_OPTION__';
$event_id = '__EVENT_ID__';
$backup = get_option($backup_option, array());
if (is_array($backup) && array_key_exists('settings', $backup)) {
    update_option('tcg_store_platform_settings', $backup['settings'], false);
}
if (is_array($backup) && !empty($backup['app_user_id']) && !empty($backup['app_uuid']) && class_exists('WP_Application_Passwords')) {
    WP_Application_Passwords::delete_application_password((int) $backup['app_user_id'], (string) $backup['app_uuid']);
}
$cron = _get_cron_array();
if (is_array($cron)) {
    foreach ($cron as $timestamp => $hooks) {
        $events = $hooks['tcg_store_platform_scrydex_webhook_refresh'] ?? array();
        foreach ($events as $scheduled) {
            $args = $scheduled['args'] ?? array();
            if (($args[0]['event_id'] ?? '') === $event_id) {
                wp_unschedule_event((int) $timestamp, 'tcg_store_platform_scrydex_webhook_refresh', $args);
            }
        }
    }
}
global $wpdb;
$table = $wpdb->prefix . 'tcg_webhook_events';
$wpdb->delete($table, array('provider_name' => 'scrydex', 'provider_event_id' => $event_id), array('%s', '%s'));
delete_option($backup_option);
$event_rows = (int) $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM `{$table}` WHERE provider_name = %s AND provider_event_id = %s", 'scrydex', $event_id));
echo wp_json_encode(array(
    'backup_option_exists' => false !== get_option($backup_option, false),
    'event_rows' => $event_rows,
));
'@
    $cleanupPhp = $cleanupPhp.Replace('__BACKUP_OPTION__', $backupOption).Replace('__EVENT_ID__', $eventId)
    try {
        $cleanup = Invoke-RemotePhp -Source $cleanupPhp | ConvertFrom-Json
    }
    catch {
        if ($null -eq $evidence) {
            throw
        }
        $evidence.cleanup_error = 'Temporary state cleanup verification failed.'
    }
}

if ($null -eq $evidence) {
    throw 'The round-trip test did not produce evidence.'
}

$evidence.cleanup_backup_option_exists = [bool]$cleanup.backup_option_exists
$evidence.cleanup_event_rows = [int]$cleanup.event_rows
$evidence.cleanup_passed = (-not $evidence.cleanup_backup_option_exists -and $evidence.cleanup_event_rows -eq 0)
$evidence.passed = ($evidence.passed -and $evidence.cleanup_passed)

$directory = Split-Path -Parent $EvidencePath
if ('' -ne $directory) {
    New-Item -ItemType Directory -Force -Path $directory | Out-Null
}
$evidence | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $EvidencePath -Encoding UTF8
$evidence | ConvertTo-Json -Depth 6

if (-not $evidence.passed) {
    exit 1
}
