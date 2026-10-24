param([switch]$Probe)
$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = New-Object System.Text.UTF8Encoding($false)
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
try {
    Add-Type -AssemblyName System.Speech
    $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
    $voices = @($synth.GetInstalledVoices() | Where-Object { $_.Enabled -and $_.VoiceInfo.Culture.Name -eq 'pt-BR' })
    if ($Probe) {
        @{ ready = ($voices.Count -gt 0) } | ConvertTo-Json -Compress
        exit 0
    }
    if ($voices.Count -eq 0) { exit 2 }
    $payload = [Console]::In.ReadToEnd() | ConvertFrom-Json
    $text = [string]$payload.text
    if ([string]::IsNullOrWhiteSpace($text) -or $text.Length -gt 8000) { exit 3 }
    $synth.SelectVoice($voices[0].VoiceInfo.Name)
    $synth.Rate = -1
    $synth.Speak($text)
    $synth.Dispose()
    exit 0
} catch { exit 4 }
