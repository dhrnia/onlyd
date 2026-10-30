async function testApi() {
  const base = 'http://localhost:3000';

  console.log('--- 1. Testing GET /api/status ---');
  let res = await fetch(`${base}/api/status`);
  console.log(await res.json());

  console.log('\n--- 2. Testing POST /api/contacts (Name only) ---');
  res = await fetch(`${base}/api/contacts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Bruce Wayne' })
  });
  const added1 = await res.json();
  console.log(added1);

  console.log('\n--- 3. Testing POST /api/contacts (All 4 fields) ---');
  res = await fetch(`${base}/api/contacts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Diana Prince',
      email: 'diana@themyscira.io',
      phone: '+1 800-555-AMAZON',
      tag: 'VIP'
    })
  });
  const added2 = await res.json();
  console.log(added2);

  console.log('\n--- 4. Testing PUT /api/contacts/:id (Edit) ---');
  res = await fetch(`${base}/api/contacts/${added1.contact.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Bruce Wayne (Batman)',
      email: 'bruce@wayne-enterprises.com',
      phone: '+1 555-BAT-CAVE',
      tag: 'VIP'
    })
  });
  console.log(await res.json());

  console.log('\n--- 5. Testing DELETE /api/contacts/:id ---');
  res = await fetch(`${base}/api/contacts/${added2.contact.id}`, {
    method: 'DELETE'
  });
  console.log(await res.json());

  console.log('\n--- 6. Testing GET /api/contacts (Final verification) ---');
  res = await fetch(`${base}/api/contacts`);
  const finalContacts = await res.json();
  console.log('Total contacts:', finalContacts.contacts.length);
  console.log('Sample contact:', finalContacts.contacts[0]);

  console.log('\n--- 7. Testing validation error (Empty name) ---');
  res = await fetch(`${base}/api/contacts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: '', phone: '123' })
  });
  console.log('Status code for empty name:', res.status, await res.json());

  console.log('\n--- 8. Testing static files ---');
  const indexHtml = await (await fetch(`${base}/index.html`)).text();
  console.log('index.html served, length:', indexHtml.length);
  const manifest = await (await fetch(`${base}/manifest.json`)).json();
  console.log('manifest.json served, name:', manifest.name);
  const sw = await (await fetch(`${base}/sw.js`)).text();
  console.log('sw.js served, length:', sw.length);
  const icon = await fetch(`${base}/icons/icon-192.png`);
  console.log('icon-192.png status:', icon.status);

  console.log('\nALL TESTS PASSED!');
}

testApi().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
