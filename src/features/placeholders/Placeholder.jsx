import PropTypes from 'prop-types';
import { Panel } from '@/components/primitives';

/**
 * Stand-in for Phase 2/3 screens. Renders a centered "coming in Phase N" panel.
 */
export default function Placeholder({ title, phase = 2, note }) {
  return (
    <div className="h-full grid place-items-center bg-bg-base grid-bg">
      <Panel
        elevated
        className="w-[520px]"
        header={<span className="section-label">{title}</span>}
        footer={`Scheduled · Phase ${phase}`}
      >
        <div className="p-4 text-xs text-text-secondary leading-relaxed">
          <p>This surface is scaffolded but not yet built out.</p>
          {note ? <p className="mt-2 text-text-muted">{note}</p> : null}
        </div>
      </Panel>
    </div>
  );
}

Placeholder.propTypes = {
  title: PropTypes.string.isRequired,
  phase: PropTypes.number,
  note: PropTypes.string,
};
