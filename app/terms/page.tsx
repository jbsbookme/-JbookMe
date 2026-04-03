export default function TermsPage() {
  return (
    <section className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8">
      <header className="mb-6 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/50">
          JBookMe
        </p>
        <h1 className="text-3xl font-semibold text-white sm:text-4xl">Terms</h1>
      </header>

      <div className="space-y-5 text-sm leading-relaxed text-white/80">
        <p>Booking requires agreement to the terms below.</p>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-white">Appointments</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>Late arrivals may be canceled.</li>
            <li>No-shows may affect future bookings.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-white">Payments</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>Payment methods: in person, CashApp, Zelle (if barber provides).</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-white">SMS Notifications</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>SMS is transactional only.</li>
            <li>Message frequency varies.</li>
            <li>Msg & data rates may apply.</li>
            <li>Reply STOP to unsubscribe, HELP for help.</li>
          </ul>
        </section>
      </div>
    </section>
  );
}
