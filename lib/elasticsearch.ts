import { Client } from '@elastic/elasticsearch';

export const elastic = new Client({
  node: 'http://localhost:9200',
  auth: {
    apiKey: "OXBJVWtwMEJkSjN2RHptS0pONjY6eUo3VE9vR2FibmM3UVljQnhjYlBTdw=="
  }
});