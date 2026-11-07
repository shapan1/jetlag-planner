import { useTheme } from '../hooks/useTheme'

export default function ThemeToggle() {
  const [theme, cycle] = useTheme()
  const label = theme === 'auto' ? 'Auto' : theme === 'light' ? 'Light' : 'Dark'
  return (
    <button type="button" className="btn small ghost" onClick={cycle} aria-label={`Theme: ${label}. Tap to change.`}>
      Theme: {label}
    </button>
  )
}
