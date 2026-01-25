import { DisplayPanel } from './radio/DisplayPanel';
import { WaveformVisualizer } from './radio/WaveformVisualizer';
import { Globe } from './radio/Globe';
import { PageMeta } from './radio/PageMeta';
import { TimelineDial } from './controls/TimelineDial';
import { FilterDial } from './controls/FilterDial';
import { ControlButtons } from './controls/ControlButtons';
import './Radio.css';

export function Radio() {
  return (
    <div className="radio">
      <PageMeta />
      {/* Top section - display, globe, and visualizer */}
      <div className="radio-top">
        <div className="radio-display">
          <DisplayPanel />
        </div>
        <div className="radio-side-panel">
          <Globe />
          <WaveformVisualizer />
        </div>
      </div>

      {/* Controls row - playback buttons and filter knobs */}
      <div className="radio-controls-row">
        <div className="radio-playback">
          <ControlButtons />
        </div>
        <div className="radio-filters-inline">
          <FilterDial type="location" />
          <FilterDial type="genre" />
        </div>
      </div>

      {/* Divider */}
      <div className="radio-divider" />

      {/* Timeline dial (main feature) */}
      <div className="radio-timeline">
        <TimelineDial />
      </div>
    </div>
  );
}
