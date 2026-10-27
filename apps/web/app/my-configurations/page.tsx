import { Garage } from "../../components/garage";
export default function Page() {
  return (
    <main className="wrap">
      <div className="page-head">
        <div className="eyebrow">Your garage</div>
        <h1>Keep the possibilities close.</h1>
        <p>Your saved configurations, ready whenever you are.</p>
      </div>
      <Garage />
    </main>
  );
}
