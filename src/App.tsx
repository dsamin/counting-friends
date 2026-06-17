import { useEffect, useMemo } from 'react';
import { Capacitor } from '@capacitor/core';
import { useGame } from './game/useGame';
import { createWebAudioEngine } from './audio/webAudioEngine';
import { createNativeAudioEngine } from './native/capacitorTtsEngine';
import CharacterDefs from './components/CharacterDefs';
import Scene from './components/Scene';
import StartScreen from './screens/StartScreen';
import PlayScreen from './screens/PlayScreen';

/**
 * App — the root. Creates the live audio engine exactly once, drives the game
 * via `useGame`, keeps the engine's enabled flag in sync with the voice toggle,
 * and renders the continuous storybook scene plus whichever screen is active.
 */
/** Particle density for the celebration burst (tweakable prop, see HANDOFF §12). */
const CONFETTI_DENSITY: 'full' | 'calm' = 'full';

export default function App() {
  // Create the engine once for the lifetime of the app. On a native (Capacitor)
  // platform, use the iOS TTS engine for reliable voice inside WKWebView; on the
  // web, the proven Web Speech / WebAudio engine — identical to before.
  const engine = useMemo(
    () =>
      Capacitor.isNativePlatform()
        ? createNativeAudioEngine()
        : createWebAudioEngine(),
    [],
  );
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
        <PlayScreen
          state={state}
          actions={actions}
          confettiDensity={CONFETTI_DENSITY}
        />
      )}
    </div>
  );
}
