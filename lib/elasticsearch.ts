import { Client } from '@elastic/elasticsearch';

export const elastic = new Client({
  node: 'http://localhost:9200',
});