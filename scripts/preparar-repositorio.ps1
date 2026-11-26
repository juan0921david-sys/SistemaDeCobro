param(
    [Parameter(Mandatory = $true)]
    [string]$Destino
)
$ErrorActionPreference = 'Stop'
$Origen = Split-Path -Parent $PSScriptRoot
$Origen = [System.IO.Path]::GetFullPath($Origen)
$Destino = [System.IO.Path]::GetFullPath($Destino)
if ((Test-Path -LiteralPath $Destino) -or
    $Destino.StartsWith($Origen + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw 'Usa una carpeta NUEVA y fuera de la carpeta actual. No se sobrescribe ni borra nada.'
}
$Archivos = & git -c core.quotepath=false -C $Origen ls-files --cached --others --exclude-standard
if ($LASTEXITCODE -ne 0) { throw 'No se pudo consultar el repositorio de origen.' }
New-Item -ItemType Directory -Path $Destino | Out-Null
$Copiados = 0
foreach ($Archivo in ($Archivos | Sort-Object -Unique)) {
    $Hoja = Split-Path $Archivo -Leaf
    if (($Hoja -match '^\.env($|\.)' -and $Hoja -ne '.env.example') -or
        $Hoja -eq 'credentials.json' -or
        $Hoja -match '\.(pem|key|p8|p12|jks|mobileprovision|apk|aab|ipa|dump)$' -or
        $Archivo -match '(^|/)(\.git|node_modules|\.expo|postgres-data|backups|_backup)(/|$)') {
        continue
    }
    $Fuente = Join-Path $Origen $Archivo
    if (-not (Test-Path -LiteralPath $Fuente -PathType Leaf)) { continue }
    $Salida = Join-Path $Destino $Archivo
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $Salida) | Out-Null
    Copy-Item -LiteralPath $Fuente -Destination $Salida -Force
    $Copiados++
}
Write-Host "Se copiaron $Copiados archivos a $Destino."
Write-Host 'Se conservaron los cambios sin commit y los .env.example; no se copiaron .git, .env ni credenciales de firma.'
Write-Host 'Revisa el contenido antes de git add. No se inicializo Git, no se instalaron paquetes y no se subio nada.'
