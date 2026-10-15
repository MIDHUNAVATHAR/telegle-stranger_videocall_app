import App from './App';

export default function HomePage() {
  return (
    <>
      {/* Hidden Accessible Semantic SEO Structure for Search Engines (Googlebot, Bingbot) */}
      <h1
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        Donkey Play — Free Live Random Video Chat & Stranger Video Calls | Top Omegle Alternative
      </h1>
      <section
        aria-label="About Donkey Play Random Video Chat"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        <p>
          Donkey Play is the premier free online random video chat and stranger chat platform. Meet new friends and connect with verified strangers worldwide in live 1-on-1 video calls. The safest Omegle alternative with strict moderation, no nudity, and instant video roulette matchmaking.
        </p>
        <h2>Best Omegle Alternative for Random Video Calls and Stranger Chat</h2>
        <ul>
          <li>Live 1-on-1 Random Video Call with Strangers</li>
          <li>Instant Video Roulette Matching Online</li>
          <li>Free Stranger Chat with Optional Gender Filters</li>
          <li>Safe and Moderated 18+ Adult Video Community</li>
        </ul>
      </section>

      <App />
    </>
  );
}
