import PropTypes from 'prop-types';
import { useMemo } from 'react';

/**
 * Minimal SVG sparkline — line + last-point dot. No axis, no labels.
 *
 * @param {Object} props
 * @param {number[]} props.values
 * @param {number} [props.width]
 * @param {number} [props.height]
 * @param {string} [props.stroke]
 * @param {string} [props.fill]
 */
export function Sparkline({
  values,
  width = 80,
  height = 22,
  stroke = '#00D9FF',
  fill = 'rgba(0,217,255,0.10)',
}) {
  const { d, area, lastX, lastY } = useMemo(() => {
    if (!values || values.length === 0) return { d: '', area: '', lastX: 0, lastY: 0 };
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const stepX = width / Math.max(1, values.length - 1);
    const points = values.map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / range) * (height - 2) - 1;
      return [x, y];
    });
    const dStr = points
      .map(([x, y], i) => (i === 0 ? `M${x.toFixed(1)},${y.toFixed(1)}` : `L${x.toFixed(1)},${y.toFixed(1)}`))
      .join(' ');
    const areaStr = `${dStr} L${width},${height} L0,${height} Z`;
    const [lx, ly] = points[points.length - 1];
    return { d: dStr, area: areaStr, lastX: lx, lastY: ly };
  }, [values, width, height]);

  return (
    <svg width={width} height={height} className="block">
      <path d={area} fill={fill} stroke="none" />
      <path d={d} fill="none" stroke={stroke} strokeWidth={1.25} />
      <circle cx={lastX} cy={lastY} r={1.6} fill={stroke} />
    </svg>
  );
}

Sparkline.propTypes = {
  values: PropTypes.arrayOf(PropTypes.number).isRequired,
  width: PropTypes.number,
  height: PropTypes.number,
  stroke: PropTypes.string,
  fill: PropTypes.string,
};
