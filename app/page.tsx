import { Client } from '@elastic/elasticsearch';

const elastic = new Client({
  node: 'http://localhost:9200',
  auth: {
    apiKey: "OXBJVWtwMEJkSjN2RHptS0pONjY6eUo3VE9vR2FibmM3UVljQnhjYlBTdw=="
  }
});

export default async function Home() {
  const categories = await elastic.search({
    index: "categories-example"
  })

  console.log(categories);

  return (
    <div>
      {categories.hits.hits.map((c, i) => <div key={i}>{JSON.stringify(c._source)}</div>)}
    </div>
  );
}
