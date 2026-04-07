import { Client } from '@elastic/elasticsearch';

const elastic = new Client({
  node: 'http://localhost:9200'
});

export default async function Home() {
  const categories = await elastic.search({
    index: "categories"
  })

  console.log(categories);

  return (
    <div>
      {categories.hits.hits.map((c, i) => <div key={i}>{JSON.stringify(c._source)}</div>)}
    </div>
  );
}
