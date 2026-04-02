const fs = require('fs');

try {
  const fileContent = fs.readFileSync('./planning docs/comprobantes-api-docs.json', 'utf8');
  const docs = JSON.parse(fileContent);

  const method = docs.paths['/invoice/send'].post;
  console.log('RequestBody:', JSON.stringify(method.requestBody, null, 2));

  if (docs.components && docs.components.schemas) {
     const schemaNames = Object.keys(docs.components.schemas).filter(s => s.toLowerCase().includes('invoice') || s.toLowerCase().includes('company'));
     console.log('Relevant Schemas:', schemaNames);
     if (schemaNames.includes('Invoice')) {
        console.log('Invoice Schema:', JSON.stringify(docs.components.schemas['Invoice'], null, 2));
     }
  }

} catch (e) {
  console.error(e);
}
