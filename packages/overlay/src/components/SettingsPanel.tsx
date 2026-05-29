import {
  COLOR_OPTIONS,
  OUTPUT_DETAIL_OPTIONS,
  type OverlaySettings,
} from "@comment-to-fix/core";
import { IconMoon, IconSun } from "./icons";

type Props = {
  settings: OverlaySettings;
  onChange: (patch: Partial<OverlaySettings>) => void;
  visible: boolean;
  above: boolean;
};

function Switch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      className={`ctf-switch ${checked ? "on" : ""}`}
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
    >
      <div className="ctf-switch-knob" />
    </div>
  );
}

export function SettingsPanel({ settings, onChange, visible, above }: Props) {
  if (!visible) return null;

  const detailLabel =
    OUTPUT_DETAIL_OPTIONS.find((o) => o.value === settings.outputDetail)?.label ?? "Standard";

  return (
    <div className={`ctf-settings ${above ? "above" : ""}`} data-ctf-settings>
      <h3>Settings</h3>

      <div className="ctf-settings-row">
        <span className="ctf-settings-label">Output detail</span>
        <button
          type="button"
          className="ctf-cycle-btn"
          onClick={() => {
            const idx = OUTPUT_DETAIL_OPTIONS.findIndex((o) => o.value === settings.outputDetail);
            const next = OUTPUT_DETAIL_OPTIONS[(idx + 1) % OUTPUT_DETAIL_OPTIONS.length]!;
            onChange({ outputDetail: next.value });
          }}
        >
          {detailLabel}
        </button>
      </div>

      <div className="ctf-settings-row">
        <span className="ctf-settings-label">Theme</span>
        <button
          type="button"
          className="ctf-btn"
          onClick={() => onChange({ dark: !settings.dark })}
          aria-label="Toggle theme"
        >
          {settings.dark ? <IconSun size={18} /> : <IconMoon size={18} />}
        </button>
      </div>

      <div className="ctf-settings-row">
        <span className="ctf-settings-label">Marker color</span>
      </div>
      <div className="ctf-color-row">
        {COLOR_OPTIONS.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`ctf-color-swatch ${settings.annotationColorId === c.id ? "selected" : ""}`}
            style={{ background: c.color }}
            title={c.label}
            onClick={() => onChange({ annotationColorId: c.id })}
          />
        ))}
      </div>

      <div className="ctf-settings-row" style={{ marginTop: 12 }}>
        <span className="ctf-settings-label">Clear after copy</span>
        <Switch
          checked={settings.autoClearAfterCopy}
          onChange={(v) => onChange({ autoClearAfterCopy: v })}
        />
      </div>

      <div className="ctf-settings-row">
        <span className="ctf-settings-label">Clear after send</span>
        <Switch
          checked={settings.autoClearAfterSend}
          onChange={(v) => onChange({ autoClearAfterSend: v })}
        />
      </div>

      <div className="ctf-settings-row">
        <span className="ctf-settings-label">Block interactions</span>
        <Switch
          checked={settings.blockInteractions}
          onChange={(v) => onChange({ blockInteractions: v })}
        />
      </div>

      <div className="ctf-settings-row">
        <span className="ctf-settings-label">Click marker to delete</span>
        <Switch
          checked={settings.markerClickBehavior === "delete"}
          onChange={(v) => onChange({ markerClickBehavior: v ? "delete" : "edit" })}
        />
      </div>
    </div>
  );
}
