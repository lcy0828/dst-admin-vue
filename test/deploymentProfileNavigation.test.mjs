import assert from 'node:assert/strict'
import test from 'node:test'

import { navigationForFeatures } from '../src/v2/navigation.js'

function navigationItems(features) {
  return navigationForFeatures(features).flatMap(section => section.items)
}

test('all deployment profiles expose centralized node management', () => {
  for (const features of [{ agentControl: false }, { agentControl: true }, {}]) {
    assert.equal(navigationItems(features).some(item => item.labelKey === 'navigation.agents'), true)
  }
})
