import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('formal routes use the shadcn layout and real dashboard', async () => {
  const router = await source('src/router/index.js')

  assert.doesNotMatch(router, /import MainLayout from/)
  assert.match(router, /component:\s*MainLayoutV2/)
  assert.match(router, /views\/v2\/DashboardV2\.vue/)
  assert.doesNotMatch(router, /views\/Dashboard\.vue/)
})

test('legacy preview URLs redirect while navigation stays on formal paths', async () => {
  const [router, navigation, layout, sidebar] = await Promise.all([
    source('src/router/index.js'),
    source('src/v2/navigation.js'),
    source('src/layouts/MainLayoutV2.vue'),
    source('src/components/v2/AppSidebarV2.vue')
  ])

  assert.match(router, /path:\s*'\/preview-v2\/:pathMatch\(\.\*\)\*'/)
  assert.doesNotMatch(navigation, /\/preview-v2/)
  assert.doesNotMatch(layout, /返回旧界面|\/preview-v2/)
  assert.doesNotMatch(sidebar, /\/preview-v2/)
  assert.match(navigation, /to:\s*'\/dashboard'/)
})

test('runtime navigation exposes one room control entry and redirects the legacy server list', async () => {
  const [router, navigation] = await Promise.all([
    source('src/router/index.js'),
    source('src/v2/navigation.js')
  ])

  assert.match(navigation, /to:\s*'\/servers\/workspace'/)
  assert.doesNotMatch(navigation, /to:\s*'\/servers\/list'/)
  assert.match(router, /path:\s*'list',[\s\S]*?redirect:\s*to\s*=>\s*\(\{\s*path:\s*'\/servers\/workspace',\s*query:\s*to\.query,\s*hash:\s*to\.hash\s*\}\)/)
})
