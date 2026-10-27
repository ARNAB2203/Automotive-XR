import Link from "next/link";
import { Car } from "../components/car";
export default function Home() {
  return (
    <main className="wrap">
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">A new perspective on driving</div>
          <h1>
            Your vision.
            <br />
            Your vehicle.
            <br />
            <span style={{ color: "#7d8c72" }}>Entirely yours.</span>
          </h1>
          <p>
            Explore every angle. Find your finish. Create a vehicle that feels
            unmistakably like you.
          </p>
          <div className="actions">
            <Link className="pill" href="/vehicles">
              Explore the collection <span>→</span>
            </Link>
            <Link className="small" href="/showroom">
              Step inside our showroom →
            </Link>
          </div>
        </div>
        <div className="scene-card">
          <span className="scene-badge">AETHER GT · CONCEPT SERIES</span>
          <Car />
          <span className="scene-note">
            Schematic preview · placeholder vehicle
          </span>
        </div>
      </section>
      <div className="stats">
        <div>
          <strong>Every angle.</strong>
          <small>Exterior & interior perspectives</small>
        </div>
        <div>
          <strong>Every detail.</strong>
          <small>Finishes that reflect your style</small>
        </div>
        <div>
          <strong>One of you.</strong>
          <small>Save a configuration made yours</small>
        </div>
      </div>
      <section>
        <div className="section-top">
          <div>
            <div className="eyebrow">Built for the way you move</div>
            <h2>Meet your next chapter.</h2>
          </div>
          <Link className="small" href="/vehicles">
            View the collection →
          </Link>
        </div>
        <div className="feature-strip" style={{ marginTop: 0 }}>
          <div>
            <span className="eyebrow">The grand touring concept</span>
            <h2 style={{ marginTop: 20 }}>
              Aether GT.
              <br />
              Considered in every detail.
            </h2>
          </div>
          <div>
            <p>
              A quieter kind of statement. Discover our development demonstrator
              and explore the possibilities of a personal configuration.
            </p>
            <div className="actions">
              <Link className="pill light" href="/vehicles">
                Make it yours →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
