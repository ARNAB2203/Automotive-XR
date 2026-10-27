import { LeadForm } from "../../components/lead-form";
export default function Page() {
  return (
    <main className="wrap content-narrow">
      <div className="page-head">
        <div className="eyebrow">Your next chapter starts here</div>
        <h1>Let’s make it personal.</h1>
        <p>
          Connect with your studio for a quotation or a test-drive enquiry.
          We’ll take it from here.
        </p>
      </div>
      <LeadForm />
    </main>
  );
}
