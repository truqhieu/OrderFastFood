import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import Icon from '../components/Icon.jsx';

const DialogContext = createContext(null);

const ICONS = { danger: 'trash', warning: 'alert', info: 'help', gift: 'gift' };

/**
 * Promise-based replacements for window.confirm / window.prompt:
 *   if (!(await confirm({ title, message, danger: true }))) return;
 *   const reason = await prompt({ title, defaultValue });  // null when cancelled
 */
export function DialogProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const [value, setValue] = useState('');
  const inputRef = useRef(null);
  const okRef = useRef(null);

  const open = useCallback((kind, opts) => {
    const options = typeof opts === 'string' ? { message: opts } : opts;
    setValue(options.defaultValue || '');
    return new Promise((resolve) => setDialog({ kind, ...options, resolve }));
  }, []);

  const confirm = useCallback((opts) => open('confirm', opts), [open]);
  const prompt = useCallback((opts) => open('prompt', opts), [open]);

  const close = (result) => {
    dialog.resolve(result);
    setDialog(null);
  };
  const cancel = () => close(dialog.kind === 'prompt' ? null : false);
  const accept = () => {
    if (dialog.kind === 'prompt') {
      if (dialog.required && !value.trim()) return inputRef.current?.focus();
      close(value.trim());
    } else close(true);
  };

  useEffect(() => {
    if (!dialog) return;
    (dialog.kind === 'prompt' ? inputRef : okRef).current?.focus();
    const onKey = (e) => e.key === 'Escape' && cancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const tone = dialog?.tone || (dialog?.danger ? 'danger' : 'info');

  return (
    <DialogContext.Provider value={{ confirm, prompt }}>
      {children}
      {dialog && (
        <div className="modal-backdrop dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && cancel()}>
          <form
            className="dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
            onSubmit={(e) => { e.preventDefault(); accept(); }}>
            <div className={`dialog-icon dialog-${tone}`}><Icon name={ICONS[tone]} size={26} /></div>
            <h3 id="dialog-title">{dialog.title || (dialog.kind === 'prompt' ? 'Nhập thông tin' : 'Xác nhận')}</h3>
            {dialog.message && <p className="dialog-message">{dialog.message}</p>}
            {dialog.kind === 'prompt' && (
              dialog.multiline
                ? <textarea ref={inputRef} rows={3} value={value} placeholder={dialog.placeholder} onChange={(e) => setValue(e.target.value)} />
                : <input ref={inputRef} type={dialog.inputType || 'text'} value={value} placeholder={dialog.placeholder} onChange={(e) => setValue(e.target.value)} />
            )}
            <div className="dialog-actions">
              <button type="button" className="btn btn-ghost" onClick={cancel}>{dialog.cancelText || 'Huỷ'}</button>
              <button
                ref={okRef}
                type="submit"
                className={`btn ${tone === 'danger' ? 'btn-danger-solid' : 'btn-primary'}`}
                disabled={dialog.kind === 'prompt' && dialog.required && !value.trim()}>
                {dialog.confirmText || 'Đồng ý'}
              </button>
            </div>
          </form>
        </div>
      )}
    </DialogContext.Provider>
  );
}

export const useDialog = () => useContext(DialogContext);
