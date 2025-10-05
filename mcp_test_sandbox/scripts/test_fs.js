import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '..', 'data');
const outputDir = path.join(__dirname, '..');

const inputFile = path.join(dataDir, 'sample.txt');
const outputFile = path.join(outputDir, 'output.txt');

try {
  // Read from sample.txt
  const content = fs.readFileSync(inputFile, 'utf-8');
  console.log(`Read from ${inputFile}: "${content}"`);

  // Write to output.txt
  fs.writeFileSync(outputFile, `Content from sample.txt: ${content}`);
  console.log(`Successfully wrote to ${outputFile}`);

  // Verify
  const newContent = fs.readFileSync(outputFile, 'utf-8');
  console.log(`Verified content of ${outputFile}: "${newContent}"`);

  console.log('\nTest complete. File operations are working correctly in the workspace.');
} catch (error) {
  console.error('Test failed:', error);
}
