export default function BookPage() {
  return (
    <main style={{ padding: 40 }}>
      <h1>Book</h1>
      <p>Download the app to book your appointment</p>
      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        <a href="https://apps.apple.com" target="_blank" rel="noreferrer">
          App Store
        </a>
        <a href="https://play.google.com/store" target="_blank" rel="noreferrer">
          Google Play
        </a>
      </div>
    </main>
  );
}
