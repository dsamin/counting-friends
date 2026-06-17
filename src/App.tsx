import { useEffect, useMemo } from 'react';
import { useGame } from './game/useGame';
import { createWebAudioEngine } from './audio/webAudioEngine';
import CharacterDefs from './components/CharacterDefs';
import Scene from './components/Scene';
import StartScreen from './screens/StartScreen';
import PlayScreen from './screens/PlayScreen';

/**
 * App — the root. Creates the live audio engine exactly once, drives the game
 * via `useGame`, keeps the engine's enabled flag in sync with the voice toggle,
 * and renders the continuous storybook scene plus whichever screen is active.
 */
export default function App() {
  // Create the engine once for the lifetime of the app.
  const engine = useMemo(() => createWebAudioEngine(), []);
  const { state, actions } = useGame({ audio: engine });

  // Keep voice-over enabled state in sync with the settings toggle.
  useEffect(() => {
    engine.setEnabled?.(state.voiceOn);
  }, [engine, state.voiceOn]);

  return (
    <div className="cf-app">
      <CharacterDefs />
      <Scene />
      {state.screen === 'start' ? (
        <StartScreen state={state} actions={actions} />
      ) : (
        <PlayScreen state={state} actions={actions} />
      )}
    </div>
  );
}
