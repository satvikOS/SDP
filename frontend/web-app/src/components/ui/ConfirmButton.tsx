'use client';

import { useState, type ReactNode } from 'react';
import { Button, Dialog, DialogTrigger, Heading, Modal, ModalOverlay } from 'react-aria-components';

export function ConfirmButton({ children, label, title, description, confirmLabel = 'Confirm', onConfirm, className }: {
  children: ReactNode; label: string; title: string; description: string;
  confirmLabel?: string; onConfirm: () => void | Promise<void>; className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  return <DialogTrigger isOpen={open} onOpenChange={(next) => { setOpen(next); setError(''); }}>
    <Button className={className} aria-label={label}>{children}</Button>
    <ModalOverlay className="confirmation-overlay" isDismissable={!pending} isKeyboardDismissDisabled={pending}>
      <Modal className="confirmation-modal">
        <Dialog className="confirmation-dialog">
          <Heading slot="title">{title}</Heading>
          <p>{description}</p>
          {error && <p role="alert" className="form-error">{error}</p>}
          <div>
            <Button slot="close" autoFocus isDisabled={pending} className="button quiet-button">Cancel</Button>
            <Button className="button primary-button" isDisabled={pending} onPress={async () => {
              setPending(true); setError('');
              try { await onConfirm(); setOpen(false); }
              catch { setError('The change could not be saved. Nothing was confirmed; please try again.'); }
              finally { setPending(false); }
            }}>{pending ? 'Saving…' : confirmLabel}</Button>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  </DialogTrigger>;
}
