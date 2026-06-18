import { Box, Cuboid, Home, ShoppingCart, UsersRound } from 'lucide-react'

export type MainTab = 'today' | 'sell' | 'stock' | 'debts' | 'insights'

interface AppBottomNavProps {
  active: MainTab
  onNavigate: (view: MainTab) => void
}

const navItems = [
  { label: 'Today', view: 'today', icon: Home },
  { label: 'Sell', view: 'sell', icon: ShoppingCart },
  { label: 'Stock', view: 'stock', icon: Cuboid },
  { label: 'Debts', view: 'debts', icon: UsersRound },
  { label: 'Insights', view: 'insights', icon: Box }
] as const

export default function AppBottomNav({ active, onNavigate }: AppBottomNavProps) {
  return (
    <nav className="bottom-nav exact-bottom-nav" aria-label="Main navigation">
      {navItems.map((item) => {
        const Icon = item.icon
        return (
          <button
            className={active === item.view ? 'active' : ''}
            key={item.view}
            type="button"
            onClick={() => onNavigate(item.view)}
          >
            <Icon size={24} strokeWidth={2.2} />
            {item.label}
          </button>
        )
      })}
    </nav>
  )
}
