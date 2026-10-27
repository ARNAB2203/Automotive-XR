import { Catalog } from "../../components/catalog";
export default function Page() {
  return (
    <main className="wrap">
      <div className="page-head">
        <div className="eyebrow">The collection</div>
        <h1>Find your kind of extraordinary.</h1>
        <p>Begin with a model. Make every detail your own.</p>
      </div>
      <Catalog />
    </main>
  );
}
