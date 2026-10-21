const http = require('http');

function testUrl(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject);
  });
}

async function run() {
  console.log('=== Endpoints Verification ===');
  const root = await testUrl('http://127.0.0.1:5500/');
  console.log('1. Root Hub (http://127.0.0.1:5500/): status', root.status);
  console.log('   - Has QR button (nav-btn-qr):', root.data.includes('nav-btn-qr'));
  console.log('   - Has URL Short button (nav-btn-short):', root.data.includes('nav-btn-short'));

  const urlShort = await testUrl('http://127.0.0.1:5500/urlShort/');
  console.log('2. URL Shortener (http://127.0.0.1:5500/urlShort/): status', urlShort.status);
  console.log('   - Has URL input (id="url-input"):', urlShort.data.includes('id="url-input"'));
  console.log('   - Has shorten button disabled (id="btn-shorten" disabled):', urlShort.data.includes('id="btn-shorten" disabled'));
  console.log('   - Has readonly output (id="output-url" ... readonly):', urlShort.data.includes('id="output-url"') && urlShort.data.includes('readonly'));
  console.log('   - Has copy button (id="btn-copy"):', urlShort.data.includes('id="btn-copy"'));
  console.log('   - Has toast notification (id="toast" ... 복사하였습니다):', urlShort.data.includes('id="toast"') && urlShort.data.includes('복사하였습니다'));

  const url2qr = await testUrl('http://127.0.0.1:5500/url2qr/');
  console.log('3. QR Code Generator (http://127.0.0.1:5500/url2qr/): status', url2qr.status);
  console.log('   - Has QR button (nav-btn-qr):', url2qr.data.includes('nav-btn-qr'));
  console.log('   - Has URL Short button (nav-btn-short):', url2qr.data.includes('nav-btn-short'));
}

run();
