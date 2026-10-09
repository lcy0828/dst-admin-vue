export const AGENT_IMAGES = {
  aliyun: 'registry.cn-hangzhou.aliyuncs.com/dstadmin/dst-admin-go:agent-latest',
  dockerhub: 'lcy0828/dst-admin-go:agent-latest'
}
export const AGENT_RELEASES_URL = 'https://github.com/lcy0828/dst-admin-go/releases/latest'
const shQuote = value => `'${String(value).replaceAll("'", "'\\''")}'`
const psQuote = value => `'${String(value).replaceAll("'", "''")}'`

export function agentInstallCommands(serverURL, registry = 'aliyun', downloadSource = 'proxy') {
  const url = shQuote(serverURL)
  const prompt = "printf 'Agent key: '; read -r DST_ADMIN_AGENT_SECURITY_KEY\nexport DST_ADMIN_AGENT_SECURITY_KEY"
  const downloadBase = `${downloadSource === 'direct' ? '' : 'https://ghfast.top/'}${AGENT_RELEASES_URL}/download`
  const linux = `(
set -eu
umask 077
[ "$(uname -s):$(uname -m)" = 'Linux:x86_64' ] || { printf '%s\\n' 'This package requires Linux x86_64.'; exit 1; }
dst_agent_tmp=$(mktemp -d)
trap 'rm -rf "$dst_agent_tmp"' EXIT
curl -fL --retry 2 --connect-timeout 10 '${downloadBase}/dst-admin-agent-linux-amd64.tar.gz' -o "$dst_agent_tmp/dst-admin-agent-linux-amd64.tar.gz"
curl -fL --retry 2 --connect-timeout 10 '${downloadBase}/dst-admin-agent-linux-amd64.tar.gz.sha256' -o "$dst_agent_tmp/dst-admin-agent-linux-amd64.tar.gz.sha256"
(cd "$dst_agent_tmp" && sha256sum -c dst-admin-agent-linux-amd64.tar.gz.sha256 && tar -xzf dst-admin-agent-linux-amd64.tar.gz dst-admin-agent agent.conf.example)
chmod 755 "$dst_agent_tmp/dst-admin-agent"
mv "$dst_agent_tmp/dst-admin-agent" ./dst-admin-agent
if [ ! -e agent.conf ]; then cp "$dst_agent_tmp/agent.conf.example" ./agent.conf; fi
${prompt}
[ -n "$DST_ADMIN_AGENT_SECURITY_KEY" ]
export DST_ADMIN_AGENT_SERVER_URL=${url}
./dst-admin-agent -config ./agent.conf -state ./runtime-state.json
)`
  const windows = `& {
$ErrorActionPreference = 'Stop'
if ($env:PROCESSOR_ARCHITECTURE -ne 'AMD64') { throw 'This package requires Windows x86_64.' }
$dstAgentTemp = Join-Path ([System.IO.Path]::GetTempPath()) ('dst-agent-' + [guid]::NewGuid())
New-Item -ItemType Directory -Path $dstAgentTemp | Out-Null
try {
  $dstAgentArchive = Join-Path $dstAgentTemp 'dst-admin-agent-windows-amd64.tar.gz'
  Invoke-WebRequest '${downloadBase}/dst-admin-agent-windows-amd64.tar.gz' -OutFile $dstAgentArchive
  Invoke-WebRequest '${downloadBase}/dst-admin-agent-windows-amd64.tar.gz.sha256' -OutFile ($dstAgentArchive + '.sha256')
  $dstAgentDigest = (Get-Content ($dstAgentArchive + '.sha256') -Raw).Trim() -split '\\s+'
  if ($dstAgentDigest.Count -ne 2 -or $dstAgentDigest[0] -notmatch '^[a-fA-F0-9]{64}$' -or $dstAgentDigest[1] -ne 'dst-admin-agent-windows-amd64.tar.gz' -or (Get-FileHash $dstAgentArchive -Algorithm SHA256).Hash -ne $dstAgentDigest[0]) { throw 'Agent checksum verification failed.' }
  $dstAgentEntries = @(& tar -tzf $dstAgentArchive)
  if ($LASTEXITCODE -ne 0 -or $dstAgentEntries.Count -ne 2 -or $dstAgentEntries -notcontains 'dst-admin-agent.exe' -or $dstAgentEntries -notcontains 'agent.conf.example') { throw 'Invalid Agent archive.' }
  & tar -xzf $dstAgentArchive -C $dstAgentTemp dst-admin-agent.exe agent.conf.example
  if ($LASTEXITCODE -ne 0) { throw 'Agent extraction failed.' }
  Move-Item (Join-Path $dstAgentTemp 'dst-admin-agent.exe') .\\dst-admin-agent.exe -Force
  if (!(Test-Path .\\agent.conf)) { Copy-Item (Join-Path $dstAgentTemp 'agent.conf.example') .\\agent.conf }
} finally { Remove-Item $dstAgentTemp -Recurse -Force }
$agentSecret = Read-Host 'Agent key' -AsSecureString
$env:DST_ADMIN_AGENT_SECURITY_KEY = [System.Net.NetworkCredential]::new('', $agentSecret).Password
$env:DST_ADMIN_AGENT_SERVER_URL = ${psQuote(serverURL)}
try { .\\dst-admin-agent.exe -config .\\agent.conf -state .\\runtime-state.json }
finally { Remove-Item Env:DST_ADMIN_AGENT_SECURITY_KEY -ErrorAction SilentlyContinue }
}`
  return {
    linux,
    windows,
    docker: `${prompt}\nexport DST_ADMIN_AGENT_SERVER_URL=${url}\ndocker run --pull always -d --name dst-admin-agent --restart unless-stopped \\\n  --group-add "$(stat -c '%g' /var/run/docker.sock)" \\\n  -e DST_ADMIN_AGENT_SERVER_URL -e DST_ADMIN_AGENT_SECURITY_KEY \\\n  -e TZ=Asia/Shanghai \\\n  -v dst-admin-agent:/var/lib/dst-admin-agent \\\n  -v /opt/dst:/opt/dst \\\n  -v /var/run/docker.sock:/var/run/docker.sock \\\n  ${AGENT_IMAGES[registry] || AGENT_IMAGES.aliyun}`
  }
}

export function agentNativeConfig(serverURL) {
  return `[agent]\nSERVER_URL = ${serverURL}\nSECURITY_KEY = REPLACE_WITH_YOUR_AGENT_KEY\n\n[runtime.native]\nDRIVER = native\nSAVE_PATH = /opt/dst/saves\nSERVER_PATH = /opt/dst/server\nSTEAMCMD_PATH = /usr/games/steamcmd\nUGC_PATH = /opt/dst/workshop/steamapps/workshop\nWORKSHOP_CONTENT_PATH = /opt/dst/workshop/steamapps/workshop/content/322330\nSERVER_MODE = 64`
}
