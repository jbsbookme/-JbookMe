export default function PrivacyPage() {
  return (
    <section className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8">
      <header className="mb-6 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/50">
          JBookMe
        </p>
        <h1 className="text-3xl font-semibold text-white sm:text-4xl">Privacy Policy</h1>
      </header>

      <div className="space-y-5 text-sm leading-relaxed text-white/80">
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-white">Data We Collect</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>Name, phone number, and email address.</li>
            <li>Used only for booking appointments and related updates.</li>
            <li>No data is sold or shared with third parties.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-white">SMS Notifications</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>SMS is used only for transactional notifications.</li>
            <li>Users can opt out at any time by replying STOP.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-white">Contact</h2>
          <p>support@jbsbookme.com</p>
        </section>
      </div>
    </section>
  );
}
