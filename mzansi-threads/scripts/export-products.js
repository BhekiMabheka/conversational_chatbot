// Exports the shop's product catalogue to the chatbot knowledge base, so Thandi always quotes current prices.
// Usage: npm run export-kb   (optionally pass an output path)
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { products } from '../src/products.js';

const out = process.argv[2] ?? fileURLToPath(new URL('../../chatbot/knowledge/products.json', import.meta.url));
const zar = (n) => `R${n.toLocaleString('en-ZA').replace(/\s/g, ' ')}`;

const sizesFor = (p) => (p.category === 'Accessories' ? 'One size'
  : p.name.includes('Veldskoen') ? 'UK/SA 3–13' : 'XS, S, M, L, XL, XXL');

const data = {
  title: 'Product catalogue',
  items: products.map((p) => ({
    name: p.name,
    category: p.category,
    price: `${zar(p.price)} (VAT incl.)`,
    sizes: sizesFor(p),
    label: p.tag ?? null,
    description: p.description,
  })),
};

await writeFile(out, JSON.stringify(data, null, 2) + '\n');
console.log(`Wrote ${products.length} products to ${out}`);
