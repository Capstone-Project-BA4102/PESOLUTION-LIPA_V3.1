param([string]$SpaceUrl = 'https://lorx-20-pesolution-xlmr-sentiment.hf.space')
# The key is entered privately and passed through stdin, not arguments or .env.
$taskKey = Read-Host 'Enter SENTIMENT_INFERENCE_KEY (not HF_TOKEN)' -AsSecureString
$taskCredential = New-Object System.Net.NetworkCredential('', $taskKey)
try {
    $taskCredential.Password | node (Join-Path $PSScriptRoot 'verify-zerogpu.cjs') $SpaceUrl
    if ($LASTEXITCODE -ne 0) { throw 'Synthetic inference did not succeed. Do not switch Render yet.' }
} finally {
    $taskCredential = $null
    $taskKey.Dispose()
}
