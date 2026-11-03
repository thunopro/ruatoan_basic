$ErrorActionPreference = 'Stop'

$root = Join-Path $env:LOCALAPPDATA 'RuaToan\PostgreSQL18'
$data = Join-Path $root 'data-ruatoan'
$pgCtl = Join-Path $root 'pgsql\bin\pg_ctl.exe'
$log = Join-Path $root 'postgresql-ruatoan.log'

if (-not (Test-Path -LiteralPath $pgCtl) -or -not (Test-Path -LiteralPath $data)) {
  throw 'Local PostgreSQL for Rùa Toán is not installed or initialized.'
}

& $pgCtl -D $data status *> $null
if ($LASTEXITCODE -eq 0) {
  Write-Output 'Rùa Toán PostgreSQL is already running on 127.0.0.1:5433.'
  exit 0
}

& $pgCtl -D $data -l $log -o '-h 127.0.0.1 -p 5433' -w start
if ($LASTEXITCODE -ne 0) {
  throw "Could not start Rùa Toán PostgreSQL. See $log"
}
