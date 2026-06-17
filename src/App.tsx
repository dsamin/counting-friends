/**
 * App — placeholder shell.
 *
 * Renders the full-bleed storybook scene (sky → hills → ground) with the
 * "Counting Friends" wordmark centered. This exists only to prove the
 * build + self-hosted fonts + design tokens are wired correctly; it will be
 * replaced by the real Start/Play screens in a later task.
 */
export default function App() {
  return (
    <div className="cf-app">
      <div className="cf-scene" aria-hidden="true" />
      <main
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}
      >
        <h1
          style={{
            margin: 0,
            fontFamily: 'var(--cf-font-display)',
            fontWeight: 800,
            fontSize: 'clamp(40px, 9vw, 88px)',
            lineHeight: 1.05,
            textAlign: 'center',
            color: 'var(--cf-ink)',
          }}
        >
          Counting <span style={{ color: 'var(--cf-coral)' }}>Friends</span>
        </h1>
      </main>
    </div>
  );
}
