import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import Suggestions from '../Suggestions'

const SAMPLE_DATA = {
  saved:    [{ id: 1, label: 'HYSA', amount: '5000' }],
  invested: [{ id: 2, label: 'VOO',  amount: '2000' }],
  spent:    [{ id: 3, label: 'Rent', amount: '1500' }],
  goals:    [],
}

const MOCK_RESPONSE = {
  summary: 'Tracking $8,500.00 total — saved 58.8%, invested 23.5%, spent 17.6%. Net: +$5,500.00.',
  suggestions: [
    { type: 'insight', priority: 'low',  title: 'Solid savings rate (58.8%)', text: 'Great job saving.' },
    { type: 'alert',   priority: 'high', title: 'Watch spending',             text: 'Spending is high.' },
    { type: 'market',  priority: 'low',  title: 'S&P 500 up 1.2% today',     text: 'Markets are up.' },
  ],
  metrics: { saved: 5000, invested: 2000, spent: 1500, total: 8500, net: 5500,
             savings_rate: 58.8, investment_rate: 23.5, spending_rate: 17.6 },
  market: {},
}

describe('Suggestions', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows placeholder before Analyze is clicked', () => {
    const { container } = render(<Suggestions data={SAMPLE_DATA} />)
    // Text is split across elements ("Click <strong>Analyze</strong> to get...")
    expect(container.querySelector('.sug-placeholder')).toBeInTheDocument()
  })

  it('shows Analyze button initially', () => {
    render(<Suggestions data={SAMPLE_DATA} />)
    expect(screen.getByRole('button', { name: /analyze/i })).toBeInTheDocument()
  })

  it('shows loading state while fetching', async () => {
    global.fetch.mockReturnValue(new Promise(() => {})) // never resolves
    render(<Suggestions data={SAMPLE_DATA} />)
    fireEvent.click(screen.getByRole('button', { name: /analyze/i }))
    expect(await screen.findByText(/analyzing/i)).toBeInTheDocument()
  })

  it('renders summary after successful fetch', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => MOCK_RESPONSE,
    })
    render(<Suggestions data={SAMPLE_DATA} />)
    fireEvent.click(screen.getByRole('button', { name: /analyze/i }))
    await waitFor(() => screen.getByText(MOCK_RESPONSE.summary))
    expect(screen.getByText(MOCK_RESPONSE.summary)).toBeInTheDocument()
  })

  it('renders a card for each suggestion', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => MOCK_RESPONSE,
    })
    render(<Suggestions data={SAMPLE_DATA} />)
    fireEvent.click(screen.getByRole('button', { name: /analyze/i }))
    await waitFor(() => screen.getByText('Solid savings rate (58.8%)'))
    expect(screen.getByText('Watch spending')).toBeInTheDocument()
    expect(screen.getByText('S&P 500 up 1.2% today')).toBeInTheDocument()
  })

  it('shows metric pills after successful fetch', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => MOCK_RESPONSE,
    })
    render(<Suggestions data={SAMPLE_DATA} />)
    fireEvent.click(screen.getByRole('button', { name: /analyze/i }))
    await waitFor(() => screen.getByText('58.8%'))
    expect(screen.getByText('23.5%')).toBeInTheDocument()
    expect(screen.getByText('17.6%')).toBeInTheDocument()
  })

  it('shows error message when fetch fails', async () => {
    global.fetch.mockRejectedValue(new Error('Network Error'))
    render(<Suggestions data={SAMPLE_DATA} />)
    fireEvent.click(screen.getByRole('button', { name: /analyze/i }))
    await waitFor(() => screen.getByText(/network error/i))
  })

  it('shows error message when server returns non-200', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 500 })
    render(<Suggestions data={SAMPLE_DATA} />)
    fireEvent.click(screen.getByRole('button', { name: /analyze/i }))
    await waitFor(() => screen.getByText(/server error/i))
  })

  it('button label changes to Refresh after first load', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => MOCK_RESPONSE,
    })
    render(<Suggestions data={SAMPLE_DATA} />)
    fireEvent.click(screen.getByRole('button', { name: /analyze/i }))
    await waitFor(() => screen.getByRole('button', { name: /refresh/i }))
  })
})
