import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Summary from '../Summary'

const data = (saved, invested, spent) => ({
  saved:    saved.map((a, i)    => ({ id: i, label: 'x', amount: String(a) })),
  invested: invested.map((a, i) => ({ id: i, label: 'x', amount: String(a) })),
  spent:    spent.map((a, i)    => ({ id: i, label: 'x', amount: String(a) })),
  goals: [],
})

describe('Summary', () => {
  it('renders nothing when all amounts are zero', () => {
    const { container } = render(<Summary data={data([], [], [])} />)
    expect(container.firstChild).toBeNull()
  })

  it('displays formatted saved amount', () => {
    render(<Summary data={data([1000], [], [])} />)
    expect(screen.getByText('$1,000.00')).toBeInTheDocument()
  })

  it('displays formatted invested amount', () => {
    render(<Summary data={data([], [500], [])} />)
    expect(screen.getByText('$500.00')).toBeInTheDocument()
  })

  it('displays formatted spent amount', () => {
    render(<Summary data={data([500], [], [250.5])} />)
    // query specifically by the Spent stat label's sibling value
    const spentLabel = screen.getByText('Spent')
    const spentValue = spentLabel.closest('.stat').querySelector('.stat-value')
    expect(spentValue).toHaveTextContent('$250.50')
  })

  it('shows positive net when saved+invested > spent', () => {
    render(<Summary data={data([1000], [500], [200])} />)
    expect(screen.getByText('+$1,300.00')).toBeInTheDocument()
  })

  it('shows negative net when spent > saved+invested', () => {
    render(<Summary data={data([100], [], [500])} />)
    // Component renders abs value in red (stat-value--spent) for negative net
    const netLabel = screen.getByText('Net')
    const netValue = netLabel.closest('.stat').querySelector('.stat-value')
    expect(netValue).toHaveTextContent('$400.00')
    expect(netValue).toHaveClass('stat-value--spent')
  })

  it('renders the stacked bar when data is present', () => {
    const { container } = render(<Summary data={data([500], [200], [300])} />)
    expect(container.querySelector('.summary-bar')).toBeInTheDocument()
  })

  it('sums multiple entries in the same category', () => {
    render(<Summary data={{ saved: [{ id: 1, label: 'a', amount: '300' }, { id: 2, label: 'b', amount: '200' }], invested: [], spent: [], goals: [] }} />)
    expect(screen.getByText('$500.00')).toBeInTheDocument()
  })
})
