$ErrorActionPreference = 'Stop'

$root = Join-Path $env:LOCALAPPDATA 'RuaToan\PostgreSQL18'
$data = Join-Path $root 'data-ruatoan'
$pgCtl = Join-Path $root 'pgsql\bin\pg_ctl.exe'

if (-not (Test-Path -LiteralPath $pgCtl) -or -not (Test-Path -LiteralPath $data)) {
  throw 'Local PostgreSQL for Rùa Toán is not installed or initialized.'
}

& $pgCtl -D $data -m fast -w stop
if ($LASTEXITCODE -ne 0) {
  throw 'Could not stop Rùa Toán PostgreSQL.'
}
