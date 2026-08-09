import * as schema from '@database/schema';
import { pgGenerate } from 'drizzle-dbml-generator';

const out = './schema.dbml';
pgGenerate({ schema, out });
console.log('DBML Schema generated at ./schema.dbml');
