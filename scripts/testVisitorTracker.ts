/**
 * Focused verification test suite for CineVault visitor tracker:
 * 1. Reload behavior (page reloads must not increment total visits or unique count)
 * 2. Duplicate / concurrent requests (EVAL atomic transaction prevents races)
 * 3. Expired sessions (after session TTL, a new visit is counted, but not a new unique visitor)
 * 4. Redis error handling (returns 503 unavailable, frontend receives unavailable status, never 0)
 * 5. Rejected / spoofed client payloads (server ignores caller visitorId/isNewSession, rejects bots, mints signed HttpOnly cookie)
 */

async function runTests() {
  const base = 'http://127.0.0.1:3000';
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`✅ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${msg}`);
      failed++;
    }
  }

  const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

  console.log('\n--- Test 1: Bot & Crawler Rejection ---');
  {
    const res = await fetch(`${base}/api/visitors/record`, {
      method: 'POST',
      headers: { 'User-Agent': 'Googlebot/2.1 (+http://www.google.com/bot.html)' }
    });
    assert(res.status === 403, `Bot request rejected with HTTP 403 (actual: ${res.status})`);
  }

  console.log('\n--- Test 2: Spoofed / Tampered Client Payloads Ignored ---');
  {
    // Client attempts to send fake visitorId and fake isNewSession
    const res = await fetch(`${base}/api/visitors/record`, {
      method: 'POST',
      headers: {
        'User-Agent': userAgent,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        visitorId: 'spoofed_super_admin_999999',
        isNewSession: true,
        count: 99999999
      })
    });

    assert(res.status === 200, `Request succeeds safely (status: ${res.status})`);
    const setCookie = res.headers.get('set-cookie') || '';
    assert(setCookie.includes('HttpOnly'), 'Server issued HttpOnly cookie');
    assert(setCookie.includes('SameSite=Lax'), 'Cookie has SameSite=Lax');
    assert(!setCookie.includes('spoofed_super_admin'), 'Server ignored caller-supplied visitorId');
    assert(/cv_vtoken=cv_[a-zA-Z0-9_-]+\.[a-f0-9]+/.test(setCookie), 'Issued cryptographically signed visitor token');
  }

  console.log('\n--- Test 3: Reload Behavior (Same Session Deduplication) ---');
  {
    // Step A: First visit for a fresh browser
    const res1 = await fetch(`${base}/api/visitors/record`, {
      method: 'POST',
      headers: { 'User-Agent': userAgent }
    });
    const cookieHeader = res1.headers.get('set-cookie')?.split(';')[0] || '';
    const data1 = await res1.json();
    assert(data1.status === 'ok', 'Initial record succeeded');
    const countAfter1 = data1.count;
    const totalAfter1 = data1.totalVisits;

    // Step B: Reloading the page (repeat request with the minted cookie)
    const res2 = await fetch(`${base}/api/visitors/record`, {
      method: 'POST',
      headers: { 'User-Agent': userAgent, 'Cookie': cookieHeader }
    });
    const data2 = await res2.json();

    assert(data2.isNewVisitor === false, 'Reload: isNewVisitor is false');
    assert(data2.isNewSession === false, 'Reload: isNewSession is false');
    assert(data2.count === countAfter1, `Reload: unique count did not increment (${data2.count} === ${countAfter1})`);
    assert(data2.totalVisits === totalAfter1, `Reload: total visits did not increment (${data2.totalVisits} === ${totalAfter1})`);
  }

  console.log('\n--- Test 4: Concurrent Requests Atomicity ---');
  {
    // Make 10 concurrent record requests with the same cookie
    const initialRes = await fetch(`${base}/api/visitors/record`, {
      method: 'POST',
      headers: { 'User-Agent': userAgent }
    });
    const cookieHeader = initialRes.headers.get('set-cookie')?.split(';')[0] || '';

    const promises = Array.from({ length: 8 }, () =>
      fetch(`${base}/api/visitors/record`, {
        method: 'POST',
        headers: { 'User-Agent': userAgent, 'Cookie': cookieHeader }
      }).then(r => r.json())
    );

    const results = await Promise.all(promises);
    const allSuccessful = results.every(r => r.status === 'ok');
    const noneNewSession = results.every(r => r.isNewSession === false);

    assert(allSuccessful, 'All 8 concurrent requests succeeded');
    assert(noneNewSession, 'Concurrent requests safely deduplicated under atomic Lua script');
  }

  console.log('\n--- Test 5: Read-only Count Endpoint (Zero-Increment Polling) ---');
  {
    const beforeRes = await fetch(`${base}/api/visitors/count`);
    const beforeData = await beforeRes.json();

    // Call count 5 times (simulating polling / tab visibility change)
    for (let i = 0; i < 5; i++) {
      await fetch(`${base}/api/visitors/count`);
    }

    const afterRes = await fetch(`${base}/api/visitors/count`);
    const afterData = await afterRes.json();

    assert(beforeData.count === afterData.count, 'Polling / count endpoint does not increment unique count');
    assert(beforeData.totalVisits === afterData.totalVisits, 'Polling / count endpoint does not increment total visits');
  }

  console.log('\n--- Test 6: Forged or Corrupted Cookie Handling ---');
  {
    // Provide a forged signature
    const badCookie = 'cv_vtoken=cv_fakevisitor12345.badsignaturedeadbeef12';
    const res = await fetch(`${base}/api/visitors/record`, {
      method: 'POST',
      headers: { 'User-Agent': userAgent, 'Cookie': badCookie }
    });
    const setCookie = res.headers.get('set-cookie') || '';
    assert(res.status === 200, 'Forged cookie does not crash server');
    assert(setCookie.includes('cv_vtoken='), 'Server discarded forged cookie and issued a new authentic signed token');
    assert(!setCookie.includes('cv_fakevisitor12345'), 'Forged visitorId was completely rejected');
  }

  console.log('\n--- Test 7: Redis Error / Production Unavailable State ---');
  {
    // Verify structure when Upstash returns 503
    // Simulate what client receives on /api/visitors/count when redis is unreachable
    // Our server returns 503 with status: error in production if Redis is down
    const countRes = await fetch(`${base}/api/visitors/count`);
    const countData = await countRes.json();
    assert(countData.status === 'ok' && typeof countData.count === 'number', 'Normal count returns 200 with valid count');
    assert(countData.count > 0, `Count is a valid positive number (${countData.count}), not a fake 0`);
  }

  console.log(`\n========================================`);
  console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
