#!/usr/bin/env node

/**
 * Test script to verify cache bypass is working
 */

const TEST_SHEET_ID = '1ved7ZLym5p-GKsNR2_3oDtgVS5Sr'
const ADMIN_KEY = 'pir2'
const API_BASE = 'http://localhost:3000'

async function testCacheBehavior() {
  console.log('🧪 Testing Sheet Metadata Cache Behavior')
  console.log('=' .repeat(50))
  
  // Test 1: First request (should miss cache)
  console.log('\n📝 Test 1: Initial request (expect cache MISS)')
  const start1 = Date.now()
  const response1 = await fetch(`${API_BASE}/api/forms?op=sheets_meta&id=${TEST_SHEET_ID}`, {
    headers: { 'x-admin-key': ADMIN_KEY }
  })
  const data1 = await response1.json()
  const time1 = Date.now() - start1
  console.log(`  ⏱️  Response time: ${time1}ms`)
  console.log(`  📊 Sheets found: ${data1.data?.sheets?.length || 0}`)
  if (data1.data?.sheets) {
    console.log(`  📋 Sheet names: ${data1.data.sheets.map(s => s.name).join(', ')}`)
  }
  
  // Test 2: Second request (should hit cache)
  console.log('\n📝 Test 2: Cached request (expect cache HIT)')
  const start2 = Date.now()
  const response2 = await fetch(`${API_BASE}/api/forms?op=sheets_meta&id=${TEST_SHEET_ID}`, {
    headers: { 'x-admin-key': ADMIN_KEY }
  })
  const data2 = await response2.json()
  const time2 = Date.now() - start2
  console.log(`  ⏱️  Response time: ${time2}ms`)
  console.log(`  📊 Sheets found: ${data2.data?.sheets?.length || 0}`)
  console.log(`  ✅ Cache speedup: ${Math.round((time1 - time2) / time1 * 100)}%`)
  
  // Test 3: Request with nocache parameter (should bypass cache)
  console.log('\n📝 Test 3: Refresh with nocache parameter (expect cache BYPASS)')
  const start3 = Date.now()
  const nocacheTimestamp = Date.now()
  const response3 = await fetch(`${API_BASE}/api/forms?op=sheets_meta&id=${TEST_SHEET_ID}&nocache=${nocacheTimestamp}`, {
    headers: { 'x-admin-key': ADMIN_KEY }
  })
  const data3 = await response3.json()
  const time3 = Date.now() - start3
  console.log(`  ⏱️  Response time: ${time3}ms`)
  console.log(`  📊 Sheets found: ${data3.data?.sheets?.length || 0}`)
  if (data3.data?.sheets) {
    console.log(`  📋 Sheet names: ${data3.data.sheets.map(s => s.name).join(', ')}`)
  }
  console.log(`  ⚠️  Should be slower than cached: ${time3 > time2 ? '✅ YES' : '❌ NO'}`)
  
  // Test 4: Another cached request after refresh
  console.log('\n📝 Test 4: Request after refresh (should be fast again)')
  const start4 = Date.now()
  const response4 = await fetch(`${API_BASE}/api/forms?op=sheets_meta&id=${TEST_SHEET_ID}`, {
    headers: { 'x-admin-key': ADMIN_KEY }
  })
  const data4 = await response4.json()
  const time4 = Date.now() - start4
  console.log(`  ⏱️  Response time: ${time4}ms`)
  console.log(`  📊 Sheets found: ${data4.data?.sheets?.length || 0}`)
  
  // Summary
  console.log('\n' + '=' .repeat(50))
  console.log('📊 SUMMARY:')
  console.log(`  Initial request:     ${time1}ms`)
  console.log(`  Cached request:      ${time2}ms (${Math.round((time1 - time2) / time1 * 100)}% faster)`)
  console.log(`  Bypass cache:        ${time3}ms`)
  console.log(`  After bypass:        ${time4}ms`)
  
  if (time2 < time1 * 0.5 && time3 > time2 * 2) {
    console.log('\n✅ Cache bypass is working correctly!')
  } else {
    console.log('\n⚠️  Cache bypass might not be working as expected')
    console.log('  Expected: cached < 50% of initial, bypass > 2x cached')
  }
}

// Run the test
testCacheBehavior().catch(console.error)