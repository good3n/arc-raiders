import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const BASE = 'https://metaforge.app/api/arc-raiders'
const ENDPOINTS = ['items', 'arcs', 'quests'] // Regular paginated endpoints
const MAPS = ['Dam', 'Spaceport', 'Buried City', 'Blue Gate'] // Maps to fetch
const OUTPUT_DIR = path.resolve(__dirname, '../public/data')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
}

// Helper function to normalize subcategory
function normalizeSubcategory(weapon) {
  let subcategory = weapon.subcategory || ''

  if (subcategory) {
    subcategory = subcategory.trim()

    // Apply renaming rules
    if (subcategory === 'Hand Cannon') {
      subcategory = 'Pistol'
    } else if (subcategory === 'Battle Rifle') {
      subcategory = 'Rifle'
    }
  }

  // Check weapon names for specific subcategories
  if (weapon.name) {
    if (weapon.name.includes('Ferro') || weapon.name.includes('Renegade')) {
      subcategory = 'Rifle'
    } else if (weapon.name.includes('Torrente')) {
      subcategory = 'LMG'
    } else if (weapon.name.includes('Osprey')) {
      subcategory = 'Sniper Rifle'
    } else if (weapon.name.includes('Stitcher')) {
      subcategory = 'SMG'
    } else if (weapon.name.includes('Il Toro')) {
      subcategory = 'Shotgun'
    }
  }

  return subcategory
}

// Helper function to calculate modified stat
function calculateModifiedStat(baseStat, modifier, isReduction = false) {
  if (!baseStat || !modifier) return baseStat

  if (isReduction) {
    return baseStat * (1 - modifier / 100)
  }

  return baseStat * (1 + modifier / 100)
}

// Process weapons data into a cleaner structure
function processWeapons(weapons) {
  const weaponGroups = {}

  // Group weapons by base name
  weapons.forEach((weapon) => {
    const baseName = weapon.name.replace(/\s+(I|II|III|IV|V)$/i, '').trim()

    if (!weaponGroups[baseName]) {
      weaponGroups[baseName] = []
    }

    weaponGroups[baseName].push(weapon)
  })

  // Process each weapon group
  const processedWeapons = []

  Object.entries(weaponGroups).forEach(([baseName, variants]) => {
    // Sort variants by level
    variants.sort((a, b) => {
      const levelA = a.name.match(/(I|II|III|IV|V)$/i)?.[0] || 'I'
      const levelB = b.name.match(/(I|II|III|IV|V)$/i)?.[0] || 'I'
      const romanToNumber = { I: 1, II: 2, III: 3, IV: 4, V: 5 }
      return (romanToNumber[levelA] || 1) - (romanToNumber[levelB] || 1)
    })

    const baseWeapon = variants[0]
    const normalizedSubcategory = normalizeSubcategory(baseWeapon)

    // Create the weapon group object
    const weaponGroup = {
      id: baseWeapon.id.replace(/-i$/, ''), // Remove level suffix from ID
      baseName,
      description: baseWeapon.description || baseWeapon.flavor_text || '',
      icon: baseWeapon.icon,
      rarity: baseWeapon.rarity,
      subcategory: normalizedSubcategory,
      ammoType: (baseWeapon.ammo_type || baseWeapon.stat_block?.ammo || '').toLowerCase(),
      baseStats: {
        damage: baseWeapon.stat_block?.damage || 0,
        fireRate: baseWeapon.stat_block?.fireRate || 0,
        range: baseWeapon.stat_block?.range || 0,
        stability: baseWeapon.stat_block?.stability || 0,
        agility: baseWeapon.stat_block?.agility || 0,
        stealth: baseWeapon.stat_block?.stealth || 0,
        magazineSize: baseWeapon.stat_block?.magazineSize || 0,
        weight: baseWeapon.stat_block?.weight || 0,
        firingMode: baseWeapon.stat_block?.firingMode || null,
        damagePerSecond: baseWeapon.stat_block?.damagePerSecond || 0,
      },
      levels: [],
    }

    // Process each level
    variants.forEach((variant, levelIndex) => {
      const level = variant.name.match(/(I|II|III|IV|V)$/i)?.[0] || 'I'
      const stats = variant.stat_block || {}

      // Track all modifiers for this level
      const modifiers = {
        increasedFireRate: stats.increasedFireRate || 0,
        reducedReloadTime: stats.reducedReloadTime || 0,
        increasedBulletVelocity: stats.increasedBulletVelocity || 0,
        reducedDurabilityBurnRate: stats.reducedDurabilityBurnRate || 0,
        reducedMaxShotDispersion: stats.reducedMaxShotDispersion || 0,
        reducedPerShotDispersion: stats.reducedPerShotDispersion || 0,
        reducedDispersionRecoveryTime: stats.reducedDispersionRecoveryTime || 0,
        reducedRecoilRecoveryTime: stats.reducedRecoilRecoveryTime || 0,
        increasedRecoilRecoveryTime: stats.increasedRecoilRecoveryTime || 0,
      }

      // Calculate modified stats
      const baseFireRate = weaponGroup.baseStats.fireRate
      const baseDPS = weaponGroup.baseStats.damagePerSecond

      // Check for direct stat overrides (like Arpeggio II)
      const hasDirectFireRateOverride =
        levelIndex > 0 &&
        stats.fireRate &&
        stats.fireRate !== baseFireRate &&
        !modifiers.increasedFireRate

      const calculatedFireRate = hasDirectFireRateOverride
        ? stats.fireRate
        : calculateModifiedStat(baseFireRate, modifiers.increasedFireRate)

      const calculatedDPS = calculateModifiedStat(baseDPS, modifiers.increasedFireRate)

      // Get cumulative modifiers from previous levels
      const cumulativeModifiers = {}
      for (let i = 0; i <= levelIndex; i++) {
        const levelStats = variants[i].stat_block || {}
        Object.keys(modifiers).forEach((key) => {
          if (levelStats[key] && levelStats[key] > (cumulativeModifiers[key] || 0)) {
            cumulativeModifiers[key] = levelStats[key]
          }
        })
      }

      weaponGroup.levels.push({
        level,
        levelNumber: levelIndex + 1,
        id: variant.id,
        value: variant.value,
        workbench: variant.workbench,
        icon: variant.icon || weaponGroup.icon,
        stats: {
          // Core stats that might change between levels
          damage: stats.damage || weaponGroup.baseStats.damage,
          fireRate: calculatedFireRate || weaponGroup.baseStats.fireRate,
          range: stats.range || weaponGroup.baseStats.range,
          stability: stats.stability || weaponGroup.baseStats.stability,
          agility: stats.agility || weaponGroup.baseStats.agility,
          stealth: stats.stealth || weaponGroup.baseStats.stealth,
          magazineSize: stats.magazineSize || weaponGroup.baseStats.magazineSize,
          weight: stats.weight || weaponGroup.baseStats.weight,
          damagePerSecond: calculatedDPS || weaponGroup.baseStats.damagePerSecond,
        },
        modifiers: cumulativeModifiers,
        activeModifiers: modifiers, // Modifiers specific to this level
        hasDirectOverrides: {
          fireRate: hasDirectFireRateOverride,
        },
      })
    })

    processedWeapons.push(weaponGroup)
  })

  return processedWeapons
}

async function fetchAll(endpoint) {
  let page = 1
  let all = []

  while (true) {
    const url = `${BASE}/${endpoint}?page=${page}`
    console.log('Fetching', url)

    try {
      const res = await fetch(url)

      if (res.status === 429) {
        console.warn('⏳ Rate limited, waiting 10s then retrying...')
        await sleep(10_000)
        continue
      }

      if (!res.ok) {
        throw new Error(`Failed ${res.status} on ${url}`)
      }

      const data = await res.json()
      const arr = Array.isArray(data) ? data : data?.data || []

      if (arr.length === 0) break

      // Filter out Misc items immediately for the items endpoint
      if (endpoint === 'items') {
        const filteredArr = arr.filter((item) => item.item_type !== 'Misc')
        all = all.concat(filteredArr)
        console.log(
          `→ Page ${page}: ${arr.length} records (${filteredArr.length} after filtering, total ${all.length})`
        )
      } else {
        all = all.concat(arr)
        console.log(`→ Page ${page}: ${arr.length} records (total ${all.length})`)
      }

      // If we got less than 50 items, we're likely at the end
      if (arr.length < 50) break

      page++

      // Be nice to the API
      await sleep(1500)
    } catch (err) {
      console.error('❌ Error on page', page, ':', err.message)

      // If we have some data, save what we have
      if (all.length > 0) {
        console.warn(`⚠️  Saving partial data for ${endpoint} (${all.length} records)`)
        break
      }

      // Wait longer on errors
      await sleep(5000)
    }
  }

  // Final stats for items endpoint
  if (endpoint === 'items') {
    console.log(`✅ Filtered out all Misc items from ${endpoint}`)
  }

  // Save to file with pretty formatting
  const outPath = path.join(OUTPUT_DIR, `${endpoint}.json`)
  fs.writeFileSync(outPath, JSON.stringify(all, null, 2))
  console.log(`✅ Saved ${all.length} records to ${outPath}`)

  // Also create a minified version for production
  const minPath = path.join(OUTPUT_DIR, `${endpoint}.min.json`)
  fs.writeFileSync(minPath, JSON.stringify(all))
  console.log(`✅ Saved minified version to ${minPath}`)

  return all
}

async function fetchMapData() {
  const allMaps = {}

  for (const mapName of MAPS) {
    console.log(`\n🗺️  Fetching map data for: ${mapName}`)

    try {
      // Try the game-map-data endpoint structure
      const url = `https://metaforge.app/api/game-map-data?tableID=arc-raiders&mapID=${encodeURIComponent(mapName)}`
      console.log('Fetching', url)

      const res = await fetch(url)

      if (res.status === 429) {
        console.warn('⏳ Rate limited, waiting 10s then retrying...')
        await sleep(10_000)
        // Retry the same map
        const retryRes = await fetch(url)
        if (retryRes.ok) {
          const data = await retryRes.json()
          allMaps[mapName] = Array.isArray(data) ? data : data?.data || data
          console.log(`✅ Got ${allMaps[mapName].length || 0} locations for ${mapName}`)
        }
      } else if (res.ok) {
        const data = await res.json()
        allMaps[mapName] = Array.isArray(data) ? data : data?.data || data
        console.log(`✅ Got ${allMaps[mapName].length || 0} locations for ${mapName}`)
      } else {
        console.error(`❌ Failed to fetch ${mapName}: ${res.status}`)
        allMaps[mapName] = []
      }

      // Be nice to the API
      await sleep(1500)
    } catch (err) {
      console.error(`❌ Error fetching ${mapName}:`, err.message)
      allMaps[mapName] = []
    }
  }

  // Save combined map data
  const outPath = path.join(OUTPUT_DIR, 'maps.json')
  fs.writeFileSync(outPath, JSON.stringify(allMaps, null, 2))
  console.log(`\n✅ Saved all map data to ${outPath}`)

  // Also create a minified version
  const minPath = path.join(OUTPUT_DIR, 'maps.min.json')
  fs.writeFileSync(minPath, JSON.stringify(allMaps))
  console.log(`✅ Saved minified version to ${minPath}`)
}

// Main execution
console.log('🚀 Starting MetaForge data fetch...')
console.log(`📁 Output directory: ${OUTPUT_DIR}`)

// Fetch regular endpoints
let allItems = []
for (const ep of ENDPOINTS) {
  console.log(`\n📦 Fetching endpoint: ${ep}`)
  const data = await fetchAll(ep)

  // Store items data for weapon processing
  if (ep === 'items') {
    allItems = data
  }
}

// Process weapons separately
console.log('\n⚔️ Processing weapons data...')
const weapons = allItems.filter((item) => item.item_type === 'Weapon')
const processedWeapons = processWeapons(weapons)

// Save processed weapons
const weaponsPath = path.join(OUTPUT_DIR, 'weapons.json')
fs.writeFileSync(weaponsPath, JSON.stringify(processedWeapons, null, 2))
console.log(`✅ Saved ${processedWeapons.length} weapon groups to ${weaponsPath}`)

// Also create minified version
const weaponsMinPath = path.join(OUTPUT_DIR, 'weapons.min.json')
fs.writeFileSync(weaponsMinPath, JSON.stringify(processedWeapons))
console.log(`✅ Saved minified weapons to ${weaponsMinPath}`)

// Fetch map data
console.log('\n📍 Starting map data fetch...')
await fetchMapData()

console.log('\n🎉 All data fetched and saved to public/data')

// Create a manifest file with metadata
const manifest = {
  lastUpdated: new Date().toISOString(),
  endpoints: ENDPOINTS,
  maps: MAPS,
  weaponCount: processedWeapons.length,
  version: '1.0.0',
}

fs.writeFileSync(path.join(OUTPUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2))

console.log('📄 Created manifest.json')
