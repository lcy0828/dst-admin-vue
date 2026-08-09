import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  applyWorldSettingsLabels,
  worldSettingsCatalogPath,
} from '../src/lib/worldSettingsLocale.mjs'

async function readCatalog(name) {
  return JSON.parse(await readFile(new URL(`../public/static/json/${name}`, import.meta.url), 'utf8'))
}

function assertCatalogShapeAndProtocolValues(zhValue, enValue, path = []) {
  if (zhValue && typeof zhValue === 'object' && !Array.isArray(zhValue)) {
    assert.ok(enValue && typeof enValue === 'object' && !Array.isArray(enValue), path.join('.'))
    const zhKeys = Object.keys(zhValue).sort()
    const enKeys = Object.keys(enValue).sort()
    assert.deepEqual(enKeys, zhKeys, path.join('.'))
    for (const key of zhKeys) {
      assertCatalogShapeAndProtocolValues(zhValue[key], enValue[key], [...path, key])
    }
    return
  }

  const isDisplayText = path.at(-1) === 'text' || path.includes('desc')
  if (!isDisplayText) assert.deepEqual(enValue, zhValue, path.join('.'))
}

function assertEnglishDisplayText(value, path = []) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) {
      assertEnglishDisplayText(child, [...path, key])
    }
    return
  }

  const isDisplayText = path.at(-1) === 'text' || path.includes('desc')
  if (isDisplayText && typeof value === 'string') {
    assert.doesNotMatch(value, /[\u3400-\u9fff]/, path.join('.'))
  }
}

test('world setting catalogs follow the active locale', () => {
  assert.equal(worldSettingsCatalogPath('zh-CN'), '/static/json/dst_world_setting_zh.json')
  assert.equal(worldSettingsCatalogPath('en-US'), '/static/json/dst_world_setting_en.json')
  assert.equal(worldSettingsCatalogPath('custom'), '/static/json/dst_world_setting_zh.json')
})

test('world setting localization replaces labels without changing protocol values', () => {
  const target = {
    WORLDGEN_GROUP: {
      resources: {
        text: '资源',
        desc: { default: '默认' },
        items: {
          moon_berrybush: {
            text: '石果灌木丛',
            value: 'often',
            desc: { default: '默认', often: '较多' },
          },
        },
      },
    },
  }
  const catalog = {
    WORLDGEN_GROUP: {
      resources: {
        text: 'Resources',
        desc: { default: 'Default' },
        items: {
          moon_berrybush: {
            text: 'Juicy Berry Bushes',
            value: 'never',
            desc: { default: 'Default', often: 'More' },
          },
        },
      },
    },
  }

  applyWorldSettingsLabels(target, catalog)

  assert.equal(target.WORLDGEN_GROUP.resources.text, 'Resources')
  assert.equal(target.WORLDGEN_GROUP.resources.items.moon_berrybush.text, 'Juicy Berry Bushes')
  assert.equal(target.WORLDGEN_GROUP.resources.items.moon_berrybush.value, 'often')
  assert.deepEqual(target.WORLDGEN_GROUP.resources.items.moon_berrybush.desc, {
    default: 'Default',
    often: 'More',
  })
})

test('localized world setting catalogs preserve every protocol field and structural key', async () => {
  const [zhCatalog, enCatalog] = await Promise.all([
    readCatalog('dst_world_setting_zh.json'),
    readCatalog('dst_world_setting_en.json'),
  ])

  assertCatalogShapeAndProtocolValues(zhCatalog, enCatalog)
  assertEnglishDisplayText(enCatalog)
})
