[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$InputFile,

    [Parameter(Mandatory = $true)]
    [string]$Password,

    [ValidateSet("markdown", "html")]
    [string]$Format = "markdown",

    [int]$Iterations = 310000,

    [string]$OutputFile
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $InputFile -PathType Leaf)) {
    throw "Input file not found: $InputFile"
}

if ([string]::IsNullOrWhiteSpace($Password)) {
    throw "Password cannot be empty."
}

$plaintext = Get-Content -LiteralPath $InputFile -Raw -Encoding UTF8
if ([string]::IsNullOrWhiteSpace($plaintext)) {
    throw "Input file is empty. Refusing to generate an empty private article payload."
}

$salt = New-Object byte[] 16
$iv = New-Object byte[] 16
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()

try {
    $rng.GetBytes($salt)
    $rng.GetBytes($iv)
}
finally {
    $rng.Dispose()
}

$passwordBytes = [System.Text.Encoding]::UTF8.GetBytes($Password)
$kdf = [System.Security.Cryptography.Rfc2898DeriveBytes]::new(
    $passwordBytes,
    $salt,
    $Iterations,
    [System.Security.Cryptography.HashAlgorithmName]::SHA256
)

try {
$keyMaterial = $kdf.GetBytes(64)
}
finally {
    $kdf.Dispose()
}

$encryptionKey = New-Object byte[] 32
$macKey = New-Object byte[] 32
[Array]::Copy($keyMaterial, 0, $encryptionKey, 0, 32)
[Array]::Copy($keyMaterial, 32, $macKey, 0, 32)

$plainBytes = [System.Text.Encoding]::UTF8.GetBytes($plaintext)
$aes = [System.Security.Cryptography.Aes]::Create()
$aes.Mode = [System.Security.Cryptography.CipherMode]::CBC
$aes.Padding = [System.Security.Cryptography.PaddingMode]::PKCS7
$aes.KeySize = 256
$aes.BlockSize = 128
$aes.Key = $encryptionKey
$aes.IV = $iv
$encryptor = $aes.CreateEncryptor()

try {
    $cipherBytes = $encryptor.TransformFinalBlock($plainBytes, 0, $plainBytes.Length)
}
finally {
    $encryptor.Dispose()
    $aes.Dispose()
}

$macInput = New-Object byte[] ($iv.Length + $cipherBytes.Length)
[Array]::Copy($iv, 0, $macInput, 0, $iv.Length)
[Array]::Copy($cipherBytes, 0, $macInput, $iv.Length, $cipherBytes.Length)
$hmac = [System.Security.Cryptography.HMACSHA256]::new($macKey)

try {
    $mac = $hmac.ComputeHash($macInput)
}
finally {
    $hmac.Dispose()
}

$cipherWithMac = New-Object byte[] ($cipherBytes.Length + $mac.Length)
[Array]::Copy($cipherBytes, 0, $cipherWithMac, 0, $cipherBytes.Length)
[Array]::Copy($mac, 0, $cipherWithMac, $cipherBytes.Length, $mac.Length)

$saltBase64 = [Convert]::ToBase64String($salt)
$ivBase64 = [Convert]::ToBase64String($iv)
$ciphertextBase64 = [Convert]::ToBase64String($cipherWithMac)

$snippet = @"
private: true
privateFormat: $Format
privateIterations: $Iterations
privateSalt: "$saltBase64"
privateIv: "$ivBase64"
privateCiphertext: "$ciphertextBase64"
"@

if ($OutputFile) {
    Set-Content -LiteralPath $OutputFile -Value $snippet -Encoding UTF8
}

$snippet
