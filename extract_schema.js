const fs = require('fs');

try {
  const fileContent = fs.readFileSync('./planning docs/comprobantes-api-docs.json', 'utf8');
  const docs = JSON.parse(fileContent);

  const paths = Object.keys(docs.paths);
  const invoicePathKey = paths.find(p => p.includes('invoice/send') || p.includes('invoice'));
  
  if (invoicePathKey) {
    console.log(`Found path: ${invoicePathKey}`);
    const method = docs.paths[invoicePathKey].post;
    if (method && method.requestBody && method.requestBody.content['application/json']) {
      const schema = method.requestBody.content['application/json'].schema;
      fs.writeFileSync('./temp_invoice_schema.json', JSON.stringify(schema, null, 2));
      console.log('Schema saved to temp_invoice_schema.json');
    } else {
      console.log('Could not find expected request body in path');
    }
  } else {
    console.log('Could not find any path with "invoice"');
    console.log('Available paths:', paths.slice(0, 10)); // just print first 10
  }
} catch (e) {
  console.error(e);
}
