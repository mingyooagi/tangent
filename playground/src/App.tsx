import { Hero } from './components/Hero'
import { Card } from './components/Card'

export default function App() {
  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      <Hero />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginTop: '40px' }}>
        <Card />
        <Card />
        <Card />
      </div>
    </div>
  )
}
