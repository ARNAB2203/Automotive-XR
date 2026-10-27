import Link from "next/link";
import { Catalog } from "../../components/catalog";
export default function Page() {
  return (
    <main className="wrap">
      <div className="page-head">
        <div className="eyebrow">The virtual studio</div>
        <h1>A space for possibility.</h1>
        <p>
          Discover the collection and begin your configuration. An immersive
          Unreal showroom requires a connected GPU session and is not available
          in this demonstrator.
        </p>
        <div className="actions">
          <Link href="/contact" className="pill outline">
            Visit a physical studio →
          </Link>
        </div>
      </div>
      <Catalog />
    </main>
  );
}
