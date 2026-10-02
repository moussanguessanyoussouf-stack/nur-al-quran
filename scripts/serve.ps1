<#
  serve.ps1 — serveur HTTP statique minimal pour le développement local.
  Aucune dépendance (ni Node, ni Python). Usage :  ./scripts/serve.ps1 [-Port 8787]
#>
param([int]$Port = 8787)
$Root = Split-Path -Parent $PSScriptRoot

$mime = @{
  ".html"="text/html; charset=utf-8"; ".js"="text/javascript; charset=utf-8";
  ".mjs"="text/javascript; charset=utf-8"; ".css"="text/css; charset=utf-8";
  ".json"="application/json; charset=utf-8"; ".webmanifest"="application/manifest+json; charset=utf-8";
  ".svg"="image/svg+xml"; ".png"="image/png"; ".woff2"="font/woff2"; ".ico"="image/x-icon";
  ".txt"="text/plain; charset=utf-8"; ".md"="text/plain; charset=utf-8"
}

$listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $Port)
$listener.Start()
Write-Host "Nûr al-Qur'ân servi sur  http://127.0.0.1:$Port/   (Ctrl+C pour arrêter)"

while ($true) {
  $client = $listener.AcceptTcpClient()
  try {
    $stream = $client.GetStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $requestLine = $reader.ReadLine()
    if (-not $requestLine) { $client.Close(); continue }
    while ($true) { $l = $reader.ReadLine(); if ($null -eq $l -or $l -eq "") { break } }

    $parts = $requestLine -split " "
    $method = $parts[0]
    $path = ([System.Uri]::UnescapeDataString((($parts[1]) -split "\?")[0]))
    if ($path -eq "/" -or $path -eq "") { $path = "/index.html" }
    $full = Join-Path $Root $path.TrimStart("/")

    $writer = New-Object System.IO.BinaryWriter($stream)
    if ((Test-Path $full) -and -not (Get-Item $full).PSIsContainer) {
      $ext = [System.IO.Path]::GetExtension($full).ToLower()
      $ct = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { "application/octet-stream" }
      $bytes = [System.IO.File]::ReadAllBytes($full)
      $head = "HTTP/1.1 200 OK`r`nContent-Type: $ct`r`nContent-Length: $($bytes.Length)`r`nCache-Control: no-cache`r`nConnection: close`r`n`r`n"
      $writer.Write([System.Text.Encoding]::ASCII.GetBytes($head))
      if ($method -ne "HEAD") { $writer.Write($bytes) }
    } else {
      $body = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $path")
      $head = "HTTP/1.1 404 Not Found`r`nContent-Type: text/plain; charset=utf-8`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n"
      $writer.Write([System.Text.Encoding]::ASCII.GetBytes($head)); $writer.Write($body)
    }
    $writer.Flush()
  } catch { } finally { $client.Close() }
}
