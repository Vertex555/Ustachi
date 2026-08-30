export function Spinner({ size = 'md', label } = {}) {
  return (
    <div className={`spinner spinner-${size}`} role="status" aria-label={label || 'Loading'}>
      <span className="spinner-ring" />
    </div>
  );
}

export default Spinner;
