import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import type { GameState } from '../game/gameState';
import type { GameActions } from '../game/useGame';
import UiIcon from './UiIcon';

/**
 * Switch — a small accessible toggle matching the `.cf-switch` look. Reports as
 * a `role="switch"` with `aria-checked` so the on/off state isn't conveyed by
 * color alone.
 */
interface SwitchProps {
  on: boolean;
  label: string;
  onToggle: () => void;
}

function Switch({ on, label, onToggle }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
      className={`cf-switch${on ? ' cf-switch--on' : ''}`}
    >
      <span className="cf-switch-knob" />
    </button>
  );
}

/**
 * SettingsSheet — the "For grown-ups" overlay behind the parental gate. Text is
 * allowed here (adult-facing): child name, reduce-motion and voice toggles, and
 * a privacy reassurance chip. Only renders when `settingsOpen`.
 */
interface SettingsSheetProps {
  state: GameState;
  actions: GameActions;
  /** Element to restore focus to when the sheet closes (the parental gate). */
  restoreFocusRef?: RefObject<HTMLElement | null>;
}

/** Focusable elements inside the sheet, in DOM order, for the focus trap. */
function focusableIn(root: HTMLElement): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => !el.hasAttribute('disabled'));
}

export default function SettingsSheet({
  state,
  actions,
  restoreFocusRef,
}: SettingsSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const open = state.settingsOpen;

  // Move focus into the sheet on open; restore to the gate on close.
  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const restoreTo = restoreFocusRef?.current ?? null;
    return () => {
      restoreTo?.focus();
    };
  }, [open, restoreFocusRef]);

  // Trap Tab focus within the sheet and close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        actions.closeSettings();
        return;
      }
      if (e.key !== 'Tab') return;
      const sheet = sheetRef.current;
      if (!sheet) return;
      const focusable = focusableIn(sheet);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first || !sheet.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !sheet.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, actions]);

  if (!open) return null;

  return (
    <div
      className="cf-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="For grown-ups"
    >
      <div className="cf-sheet" ref={sheetRef}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2
            style={{
              margin: 0,
              fontFamily: 'var(--cf-font-display)',
              fontWeight: 800,
              fontSize: 27,
              color: 'var(--cf-ink)',
            }}
          >
            For grown-ups
          </h2>
          <button
            type="button"
            onClick={actions.closeSettings}
            aria-label="Close settings"
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              border: '3px solid var(--cf-ink)',
              background: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: 24,
              color: 'var(--cf-ink)',
              fontWeight: 700,
              lineHeight: 1,
              padding: 0,
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            fontSize: 14,
            color: 'var(--cf-ink-soft)',
            margin: '6px 0 24px',
            fontWeight: 500,
          }}
        >
          Settings live here, away from little fingers.
        </div>

        <label
          htmlFor="cf-child-name"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontWeight: 700,
            color: 'var(--cf-ink)',
            fontSize: 15,
            marginBottom: 8,
          }}
        >
          <UiIcon name="child" size={20} />
          <span>
            Child&rsquo;s name{' '}
            <span style={{ fontWeight: 500, color: 'var(--cf-ink-faint)' }}>
              (optional)
            </span>
          </span>
        </label>
        <input
          id="cf-child-name"
          ref={inputRef}
          className="cf-input"
          value={state.childName}
          onChange={(e) => actions.setName(e.target.value)}
          placeholder="Child's name (optional)"
        />
        <div
          style={{
            fontSize: 12.5,
            color: 'var(--cf-ink-faint)',
            margin: '8px 0',
            fontWeight: 500,
          }}
        >
          Stays on this device — never sent anywhere.
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 0',
            borderTop: '2px solid rgba(90,70,51,0.12)',
            marginTop: 8,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              color: 'var(--cf-ink)',
            }}
          >
            <UiIcon
              name="settings"
              size={22}
              className="cf-settings-row-icon"
            />
            <div>
              <div
                style={{ fontWeight: 700, color: 'var(--cf-ink)', fontSize: 16 }}
              >
                Reduce motion
              </div>
              <div
                style={{
                  fontSize: 12.5,
                  color: 'var(--cf-ink-soft)',
                  fontWeight: 500,
                }}
              >
                Calmer celebration, one soft sparkle.
              </div>
            </div>
          </div>
          <Switch
            on={state.reduceMotion}
            label="Reduce motion"
            onToggle={actions.toggleReduceMotion}
          />
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 0',
            borderTop: '2px solid rgba(90,70,51,0.12)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              color: 'var(--cf-ink)',
            }}
          >
            <UiIcon name="voice" size={22} className="cf-settings-row-icon" />
            <div>
              <div
                style={{ fontWeight: 700, color: 'var(--cf-ink)', fontSize: 16 }}
              >
                Mascot voice
              </div>
              <div
                style={{
                  fontSize: 12.5,
                  color: 'var(--cf-ink-soft)',
                  fontWeight: 500,
                }}
              >
                Speaks the prompts and praise aloud.
              </div>
            </div>
          </div>
          <Switch
            on={state.voiceOn}
            label="Mascot voice"
            onToggle={actions.toggleVoice}
          />
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 0',
            borderTop: '2px solid rgba(90,70,51,0.12)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              color: 'var(--cf-ink)',
            }}
          >
            <UiIcon name="settings" size={22} className="cf-settings-row-icon" />
            <div>
              <div
                style={{ fontWeight: 700, color: 'var(--cf-ink)', fontSize: 16 }}
              >
                Adding &amp; taking away
              </div>
              <div
                style={{
                  fontSize: 12.5,
                  color: 'var(--cf-ink-soft)',
                  fontWeight: 500,
                }}
              >
                Show the math games now (they also unlock on their own).
              </div>
            </div>
          </div>
          <Switch
            on={state.settings.arithmetic === true}
            label="Adding and taking away"
            onToggle={actions.toggleArithmetic}
          />
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginTop: 18,
            padding: 12,
            background: '#EFEAD9',
            borderRadius: 14,
          }}
        >
          <UiIcon name="heart" size={20} className="cf-reassure-heart" />
          <div
            style={{
              fontSize: 11,
              color: 'var(--cf-ink-soft)',
              fontWeight: 600,
              lineHeight: 1.4,
            }}
          >
            No ads · No in-app purchases · No data collected · No way to fail
          </div>
        </div>
      </div>
    </div>
  );
}
