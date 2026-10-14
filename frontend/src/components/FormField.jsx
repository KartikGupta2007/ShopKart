import { useState } from 'react'

/**
 * One labelled, controlled input with its validation message.
 * Shared by the login and register forms so both look and behave the same.
 */
export default function FormField({
  label,
  name,
  type = 'text',
  value,
  onChange,
  error,
  hint,
  ...inputProps
}) {
  const [revealed, setRevealed] = useState(false)
  const isPassword = type === 'password'
  const errorId = `${name}-error`

  return (
    <div className={`field${error ? ' field--invalid' : ''}`}>
      <label className="field__label" htmlFor={name}>
        {label}
      </label>

      <div className="field__control">
        <input
          id={name}
          name={name}
          type={isPassword && revealed ? 'text' : type}
          value={value}
          onChange={onChange}
          className="field__input"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          {...inputProps}
        />

        {isPassword && (
          <button
            type="button"
            className="field__toggle"
            onClick={() => setRevealed((shown) => !shown)}
            aria-label={revealed ? 'Hide password' : 'Show password'}
          >
            {revealed ? 'Hide' : 'Show'}
          </button>
        )}
      </div>

      {error ? (
        <p className="field__error" id={errorId}>
          {error}
        </p>
      ) : (
        hint && <p className="field__hint">{hint}</p>
      )}
    </div>
  )
}
