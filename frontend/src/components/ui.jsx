import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icons';

export function Spinner({ size = 'md', label = 'Loading', inline = false }) {
  return (
    <span
      className={`spinner spinner--${size} ${inline ? 'spinner--inline' : ''}`}
      role="status"
      aria-label={label}
    />
  );
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading = false,
  className = '',
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      className={`btn btn--${variant} btn--${size} ${className}`}
      disabled={props.disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="spinner spinner--sm" aria-hidden="true" />
      ) : icon ? (
        <Icon name={icon} size={size === 'sm' ? 15 : 17} />
      ) : null}
      {children ? <span>{children}</span> : null}
      {iconRight ? <Icon name={iconRight} size={size === 'sm' ? 15 : 17} /> : null}
    </button>
  );
}

export function IconButton({ label, icon, variant = 'ghost', size = 'md', className = '', ...props }) {
  return (
    <button
      type="button"
      className={`icon-btn icon-btn--${variant} icon-btn--${size} ${className}`}
      aria-label={label}
      title={label}
      {...props}
    >
      <Icon name={icon} size={size === 'sm' ? 16 : 18} />
    </button>
  );
}

function fieldIds(id) {
  return {
    field: id,
    hint: `${id}-hint`,
    error: `${id}-error`,
  };
}

export function TextField({
  label,
  id,
  error,
  hint,
  required,
  className = '',
  inputClassName = '',
  ...props
}) {
  const autoId = useId();
  const fieldId = id || `field-${autoId}`;
  const ids = fieldIds(fieldId);
  const describedBy = error ? ids.error : hint ? ids.hint : undefined;
  return (
    <div className={`field ${className}`}>
      {label ? (
        <label htmlFor={fieldId}>
          {label}
          {required ? (
            <span className="req" aria-hidden="true">
              {' '}
              *
            </span>
          ) : null}
        </label>
      ) : null}
      <input
        id={fieldId}
        className={`input ${inputClassName}`}
        required={required}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        {...props}
      />
      {hint && !error ? (
        <p className="field__hint" id={ids.hint}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="field__error" id={ids.error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function SelectField({
  label,
  id,
  error,
  hint,
  required,
  options = [],
  placeholder,
  className = '',
  children,
  ...props
}) {
  const autoId = useId();
  const fieldId = id || `field-${autoId}`;
  const ids = fieldIds(fieldId);
  const describedBy = error ? ids.error : hint ? ids.hint : undefined;
  return (
    <div className={`field ${className}`}>
      {label ? (
        <label htmlFor={fieldId}>
          {label}
          {required ? (
            <span className="req" aria-hidden="true">
              {' '}
              *
            </span>
          ) : null}
        </label>
      ) : null}
      <select
        id={fieldId}
        className="input select"
        required={required}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        {...props}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) =>
          typeof option === 'string' ? (
            <option key={option} value={option}>
              {option}
            </option>
          ) : (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          )
        )}
        {children}
      </select>
      {hint && !error ? (
        <p className="field__hint" id={ids.hint}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="field__error" id={ids.error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function PasswordField({
  label,
  id,
  error,
  hint,
  required,
  className = '',
  ...props
}) {
  const autoId = useId();
  const fieldId = id || `field-${autoId}`;
  const ids = fieldIds(fieldId);
  const [visible, setVisible] = useState(false);
  const describedBy = error ? ids.error : hint ? ids.hint : undefined;

  return (
    <div className={`field ${className}`}>
      {label ? (
        <label htmlFor={fieldId}>
          {label}
          {required ? (
            <span className="req" aria-hidden="true">
              {' '}
              *
            </span>
          ) : null}
        </label>
      ) : null}
      <div className="input-wrap">
        <input
          id={fieldId}
          className="input input--with-action"
          type={visible ? 'text' : 'password'}
          required={required}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          {...props}
        />
        <button
          type="button"
          className="input-action"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
        >
          <Icon name={visible ? 'eyeOff' : 'eye'} size={18} />
        </button>
      </div>
      {hint && !error ? (
        <p className="field__hint" id={ids.hint}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="field__error" id={ids.error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TextareaField({
  label,
  id,
  error,
  hint,
  required,
  className = '',
  ...props
}) {
  const autoId = useId();
  const fieldId = id || `field-${autoId}`;
  const ids = fieldIds(fieldId);
  const describedBy = error ? ids.error : hint ? ids.hint : undefined;
  return (
    <div className={`field ${className}`}>
      {label ? (
        <label htmlFor={fieldId}>
          {label}
          {required ? (
            <span className="req" aria-hidden="true">
              {' '}
              *
            </span>
          ) : null}
        </label>
      ) : null}
      <textarea
        id={fieldId}
        className="input textarea"
        required={required}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        {...props}
      />
      {hint && !error ? (
        <p className="field__hint" id={ids.hint}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="field__error" id={ids.error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Badge({ children, tone = 'neutral', className = '' }) {
  return <span className={`badge badge--${tone} ${className}`}>{children}</span>;
}

export function ProgressBar({ value, tone = 'sage', label, className = '', size = 'md' }) {
  const safe = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div
      className={`progress progress--${size} ${className}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(safe)}
      aria-label={label || `${Math.round(safe)} percent`}
    >
      <span className={`progress__fill progress__fill--${tone}`} style={{ width: `${safe}%` }} />
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  description,
  eyebrow,
  children,
  footer,
  size = 'md',
  initialFocusRef,
}) {
  const dialogRef = useRef(null);
  const previousFocus = useRef(null);
  const closeRef = useRef(onClose);
  const titleId = useId();
  const descriptionId = useId();

  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    previousFocus.current = document.activeElement;
    const timer = setTimeout(() => {
      const node = dialogRef.current;
      if (!node) return;
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
        return;
      }
      const focusable = node.querySelector(
        'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      );
      (focusable || node).focus();
    }, 30);

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        closeRef.current?.();
        return;
      }
      if (event.key !== 'Tab') return;
      const node = dialogRef.current;
      if (!node) return;
      const focusables = Array.from(
        node.querySelectorAll(
          'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previousFocus.current && typeof previousFocus.current.focus === 'function') {
        previousFocus.current.focus();
      }
    };
  }, [open, initialFocusRef]);

  if (!open) return null;

  return createPortal(
    <div
      className="modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeRef.current?.();
      }}
    >
      <div
        ref={dialogRef}
        className={`modal modal--${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
      >
        <header className="modal__header">
          <div>
            {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
            {title ? (
              <h2 className="modal__title" id={titleId}>
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="modal__description" id={descriptionId}>
                {description}
              </p>
            ) : null}
          </div>
          <IconButton label="Close dialog" icon="x" onClick={() => closeRef.current?.()} />
        </header>
        <div className="modal__body">{children}</div>
        {footer ? <footer className="modal__footer">{footer}</footer> : null}
      </div>
    </div>,
    document.body
  );
}

export function ConfirmDialog({
  open,
  title = 'Delete this item?',
  description,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  loading = false,
  tone = 'danger',
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={tone} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className={`confirm-note confirm-note--${tone}`}>
        <Icon name="alert" size={18} />
        <p>This action cannot be undone.</p>
      </div>
    </Modal>
  );
}

export function EmptyState({ icon = 'inbox', title, description, action, className = '' }) {
  return (
    <div className={`empty-state ${className}`}>
      <span className="empty-state__icon" aria-hidden="true">
        <Icon name={icon} size={24} />
      </span>
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
      {action ? <div className="empty-state__action">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ error, onRetry, className = '' }) {
  return (
    <div className={`error-state ${className}`} role="alert">
      <span className="error-state__icon" aria-hidden="true">
        <Icon name="alert" size={22} />
      </span>
      <div>
        <h3>We couldn’t load this right now</h3>
        <p>{error?.message || 'Something went wrong. Please try again.'}</p>
      </div>
      {onRetry ? (
        <Button variant="secondary" size="sm" icon="refresh" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

export function FormAlert({ children, tone = 'danger' }) {
  if (!children) return null;
  return (
    <div className={`form-alert form-alert--${tone}`} role="alert">
      <Icon name={tone === 'danger' ? 'alert' : 'info'} size={18} />
      <p>{children}</p>
    </div>
  );
}

export function Skeleton({ width, height = 16, className = '', radius = 8 }) {
  return (
    <span
      className={`skeleton ${className}`}
      style={{ width, height, borderRadius: radius }}
      aria-hidden="true"
    />
  );
}

export function LoadingCard({ rows = 3 }) {
  return (
    <div className="loading-card" aria-label="Loading content" role="status">
      <Skeleton width="38%" height={14} />
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} width={index % 2 ? '72%' : '92%'} height={12} />
      ))}
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, actions, className = '' }) {
  return (
    <header className={`page-header ${className}`}>
      <div className="page-header__text">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1 className="page-title">{title}</h1>
        {description ? <p className="page-description">{description}</p> : null}
      </div>
      {actions ? <div className="page-header__actions">{actions}</div> : null}
    </header>
  );
}

export function SectionHeader({ title, description, action, className = '' }) {
  return (
    <div className={`section-header ${className}`}>
      <div>
        <h2 className="section-title">{title}</h2>
        {description ? <p className="section-description">{description}</p> : null}
      </div>
      {action ? <div className="section-header__action">{action}</div> : null}
    </div>
  );
}

export function SegmentedControl({ options, value, onChange, label, className = '', size = 'md' }) {
  return (
    <div className={`segmented segmented--${size} ${className}`} role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`segmented__option ${value === option.value ? 'is-active' : ''}`}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.icon ? <Icon name={option.icon} size={15} /> : null}
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({ checked, onChange, label, description, id }) {
  const autoId = useId();
  const switchId = id || `switch-${autoId}`;
  return (
    <div className="switch-row">
      <div className="switch-row__text">
        <span className="switch-row__label" id={`${switchId}-label`}>
          {label}
        </span>
        {description ? <p className="switch-row__description">{description}</p> : null}
      </div>
      <button
        type="button"
        id={switchId}
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${switchId}-label`}
        className={`switch ${checked ? 'is-on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className="switch__thumb" />
      </button>
    </div>
  );
}

export function Avatar({ name, size = 'md', tone = 'sage' }) {
  const parts = (name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '');
  return (
    <span className={`avatar avatar--${size} avatar--${tone}`} aria-hidden="true">
      {parts.join('') || '?'}
    </span>
  );
}

export function InsetNote({ icon = 'lock', title, children, tone = 'sage' }) {
  return (
    <div className={`inset-note inset-note--${tone}`}>
      <span className="inset-note__icon" aria-hidden="true">
        <Icon name={icon} size={18} />
      </span>
      <div>
        {title ? <p className="inset-note__title">{title}</p> : null}
        <p className="inset-note__body">{children}</p>
      </div>
    </div>
  );
}

export function PriorityDot({ priority = 'medium' }) {
  return <span className={`priority-dot priority-dot--${priority}`} aria-hidden="true" />;
}
