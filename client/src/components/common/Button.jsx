export function Button({
  children,
  variant = 'primary',
  type = 'button',
  loading = false,
  className = '',
  ...rest
}) {
  return (
    <button
      type={type}
      className={`btn btn-${variant} ${loading ? 'is-loading' : ''} ${className}`}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {loading ? '…' : children}
    </button>
  );
}

export default Button;
