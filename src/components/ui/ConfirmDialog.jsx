import Modal from './Modal'
import Button from './Button'

export default function ConfirmDialog({
  open, onClose, onConfirm, loading,
  title = 'Una uhakika?',
  message = 'Kitendo hiki hakiwezi kutenguliwa.',
  confirmLabel = 'Endelea',
  danger = true
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>Ghairi</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-slate-600">{message}</p>
    </Modal>
  )
}
