<#
  build-data.ps1 — (re)génère data/surahs.json et data/quran.json
  Télécharge les éditions depuis AlQuran Cloud, les fusionne, retire la basmala
  préfixée aux premiers versets, et calcule l'empreinte d'intégrité (SHA-256).

  Usage :  ./scripts/build-data.ps1
#>
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$dataDir = Join-Path $root "data"
New-Item -ItemType Directory -Force -Path $dataDir | Out-Null
$tmp = Join-Path $env:TEMP "nur-quran-build"
New-Item -ItemType Directory -Force -Path $tmp | Out-Null

$editions = @{
  ar = "https://api.alquran.cloud/v1/quran/quran-uthmani"
  fr = "https://api.alquran.cloud/v1/quran/fr.hamidullah"
  tr = "https://api.alquran.cloud/v1/quran/en.transliteration"
}
foreach ($k in $editions.Keys) {
  Write-Host "Téléchargement $k…"
  Invoke-WebRequest -Uri $editions[$k] -OutFile (Join-Path $tmp "raw_$k.json") -TimeoutSec 180
}

$ar = Get-Content (Join-Path $tmp "raw_ar.json") -Raw -Encoding UTF8 | ConvertFrom-Json
$fr = Get-Content (Join-Path $tmp "raw_fr.json") -Raw -Encoding UTF8 | ConvertFrom-Json
$tr = Get-Content (Join-Path $tmp "raw_tr.json") -Raw -Encoding UTF8 | ConvertFrom-Json

$bom = [char]0xFEFF
$clean = { param($s) ($s -replace [string]$bom, "") }
$basmala = & $clean $ar.data.surahs[0].ayahs[0].text

$frMap = @{}; foreach ($s in $fr.data.surahs) { foreach ($a in $s.ayahs) { $frMap[$a.number] = & $clean $a.text } }
$trMap = @{}; foreach ($s in $tr.data.surahs) { foreach ($a in $s.ayahs) { $trMap[$a.number] = & $clean $a.text } }

$surahs = New-Object System.Collections.ArrayList
$ayahs  = New-Object System.Collections.ArrayList
$sb = New-Object System.Text.StringBuilder

foreach ($s in $ar.data.surahs) {
  $num = [int]$s.number
  $hasBasmala = ($num -ne 1 -and $num -ne 9)
  [void]$surahs.Add([ordered]@{
    n=$num; name=(& $clean $s.name); en=$s.englishName; enm=$s.englishNameTranslation;
    rev=$s.revelationType; cnt=[int]$s.ayahs.Count; page=[int]$s.ayahs[0].page; bism=$hasBasmala
  })
  foreach ($a in $s.ayahs) {
    $text = & $clean $a.text
    if ($hasBasmala -and [int]$a.numberInSurah -eq 1 -and $text.StartsWith($basmala)) {
      $text = $text.Substring($basmala.Length).TrimStart()
    }
    [void]$sb.Append($text); [void]$sb.Append("`n")
    [void]$ayahs.Add([ordered]@{
      s=$num; a=[int]$a.numberInSurah; g=[int]$a.number; t=$text;
      f=$frMap[$a.number]; r=$trMap[$a.number];
      j=[int]$a.juz; p=[int]$a.page; h=[int]$a.hizbQuarter; sj=[bool]$a.sajda
    })
  }
}

$bytes = [System.Text.Encoding]::UTF8.GetBytes($sb.ToString())
$hash = ([System.Security.Cryptography.SHA256]::Create().ComputeHash($bytes) | ForEach-Object { $_.ToString("x2") }) -join ""

$meta = [ordered]@{
  source="AlQuran Cloud API (texte Tanzil Uthmani)"; edition_ar="quran-uthmani";
  edition_fr="fr.hamidullah (Muhammad Hamidullah)"; edition_tr="en.transliteration";
  reading="Hafs 'an 'Asim"; ayah_count=$ayahs.Count; surah_count=$surahs.Count;
  basmala=$basmala; sha256_ar=$hash; generated=(Get-Date -Format "yyyy-MM-dd")
}

$u8 = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText((Join-Path $dataDir "surahs.json"),
  ([ordered]@{meta=$meta; surahs=$surahs} | ConvertTo-Json -Depth 8 -Compress), $u8)
[System.IO.File]::WriteAllText((Join-Path $dataDir "quran.json"),
  ([ordered]@{meta=[ordered]@{ayah_count=$ayahs.Count; sha256_ar=$hash}; ayahs=$ayahs} | ConvertTo-Json -Depth 8 -Compress), $u8)

Write-Host "OK — $($ayahs.Count) versets, $($surahs.Count) sourates"
Write-Host "SHA-256 : $hash"
