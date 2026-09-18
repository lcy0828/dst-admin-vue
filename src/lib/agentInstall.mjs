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
  return {
    linux,
    windows: `go build -o dst-admin-agent.exe ./agent/cmd/agent\n$agentSecret = Read-Host 'Agent key' -AsSecureString\n$env:DST_ADMIN_AGENT_SECURITY_KEY = [System.Net.NetworkCredential]::new('', $agentSecret).Password\n$env:DST_ADMIN_AGENT_SERVER_URL = ${psQuote(serverURL)}\n.\\dst-admin-agent.exe -config .\\agent.conf -state .\\runtime-state.json`,
    docker: `${prompt}\nexport DST_ADMIN_AGENT_SERVER_URL=${url}\ndocker run --pull always -d --name dst-admin-agent --restart unless-stopped \\\n  --group-add "$(stat -c '%g' /var/run/docker.sock)" \\\n  -e DST_ADMIN_AGENT_SERVER_URL -e DST_ADMIN_AGENT_SECURITY_KEY \\\n  -e TZ=Asia/Shanghai \\\n  -v dst-admin-agent:/var/lib/dst-admin-agent \\\n  -v /opt/dst:/opt/dst \\\n  -v /var/run/docker.sock:/var/run/docker.sock \\\n  ${AGENT_IMAGES[registry] || AGENT_IMAGES.aliyun}`
  }
}

export function agentNativeConfig(serverURL) {
  return `[agent]\nSERVER_URL = ${serverURL}\nSECURITY_KEY = REPLACE_WITH_YOUR_AGENT_KEY\n\n[runtime.native]\nDRIVER = native\nSAVE_PATH = /opt/dst/saves\nSERVER_PATH = /opt/dst/server\nSTEAMCMD_PATH = /usr/games/steamcmd\nUGC_PATH = /opt/dst/workshop/steamapps/workshop\nWORKSHOP_CONTENT_PATH = /opt/dst/workshop/steamapps/workshop/content/322330\nSERVER_MODE = 64`
}
