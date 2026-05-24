import { motion, AnimatePresence } from 'framer-motion'
import { X, Phone } from 'lucide-react'

export default function CrisisBanner({ visible, onDismiss }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          style={{ background: 'rgba(252,165,165,0.15)', borderBottom: '1px solid rgba(252,165,165,0.3)' }}
          className="w-full px-4 py-3 flex items-center justify-between gap-3 z-50"
        >
          <div className="flex items-center gap-3 flex-1 flex-wrap">
            <span style={{ color: 'var(--accent-coral)', fontSize: '20px' }}>💙</span>
            <p style={{ color: 'var(--text-primary)', fontFamily: 'DM Sans', fontSize: '14px' }}>
              <strong>I hear you.</strong> Please reach out to a counselor:{' '}
              <strong>iCall 9152987821</strong> | <strong>Vandrevala 1860-2662-345</strong>
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href="tel:9152987821"
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium"
              style={{ background: 'var(--accent-coral)', color: '#1a1d2e' }}
            >
              <Phone size={14} /> Call Now
            </a>
            <button
              onClick={onDismiss}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              <X size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}