import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import Goals from '../Goals'

const noOp = () => {}

const makeGoal = (id, title, target, current = '0') => ({
  id, title, target: String(target), current: String(current)
})

describe('Goals', () => {
  it('shows empty state when no goals exist', () => {
    render(<Goals goals={[]} onAdd={noOp} onUpdate={noOp} onRemove={noOp} />)
    expect(screen.getByText(/no goals yet/i)).toBeInTheDocument()
  })

  it('renders a goal card with title', () => {
    render(<Goals
      goals={[makeGoal(1, 'Emergency Fund', 5000, 1000)]}
      onAdd={noOp} onUpdate={noOp} onRemove={noOp}
    />)
    expect(screen.getByText('Emergency Fund')).toBeInTheDocument()
  })

  it('shows the target amount', () => {
    render(<Goals
      goals={[makeGoal(1, 'Vacation', 2000, 500)]}
      onAdd={noOp} onUpdate={noOp} onRemove={noOp}
    />)
    expect(screen.getByText('$2,000.00')).toBeInTheDocument()
  })

  it('shows correct progress percentage', () => {
    // 500/2000 = 25%
    render(<Goals
      goals={[makeGoal(1, 'Vacation', 2000, 500)]}
      onAdd={noOp} onUpdate={noOp} onRemove={noOp}
    />)
    expect(screen.getByText('25%')).toBeInTheDocument()
  })

  it('shows 100% and "Goal reached!" when fully funded', () => {
    render(<Goals
      goals={[makeGoal(1, 'Car', 5000, 5000)]}
      onAdd={noOp} onUpdate={noOp} onRemove={noOp}
    />)
    expect(screen.getByText('100%')).toBeInTheDocument()
    expect(screen.getByText('Goal reached!')).toBeInTheDocument()
  })

  it('shows remaining amount when not complete', () => {
    // target=1000, current=600 → remaining=400
    render(<Goals
      goals={[makeGoal(1, 'Fund', 1000, 600)]}
      onAdd={noOp} onUpdate={noOp} onRemove={noOp}
    />)
    expect(screen.getByText('$400.00')).toBeInTheDocument()
  })

  it('calls onRemove with the goal id when × is clicked', () => {
    const onRemove = vi.fn()
    render(<Goals
      goals={[makeGoal(42, 'Test Goal', 1000, 0)]}
      onAdd={noOp} onUpdate={noOp} onRemove={onRemove}
    />)
    fireEvent.click(screen.getByTitle('Remove'))
    expect(onRemove).toHaveBeenCalledWith(42)
  })

  it('shows the add goal form when "+ Add Goal" is clicked', () => {
    render(<Goals goals={[]} onAdd={noOp} onUpdate={noOp} onRemove={noOp} />)
    fireEvent.click(screen.getByText('+ Add Goal'))
    expect(screen.getByPlaceholderText(/goal title/i)).toBeInTheDocument()
  })

  it('calls onAdd with title and target when form is submitted', () => {
    const onAdd = vi.fn()
    render(<Goals goals={[]} onAdd={onAdd} onUpdate={noOp} onRemove={noOp} />)
    fireEvent.click(screen.getByText('+ Add Goal'))
    fireEvent.change(screen.getByPlaceholderText(/goal title/i), { target: { value: 'New Car' } })
    fireEvent.change(screen.getByPlaceholderText(/target amount/i), { target: { value: '8000' } })
    fireEvent.click(screen.getByText('Add Goal'))
    expect(onAdd).toHaveBeenCalledWith('New Car', '8000')
  })

  it('does not submit the form when title is empty', () => {
    const onAdd = vi.fn()
    render(<Goals goals={[]} onAdd={onAdd} onUpdate={noOp} onRemove={noOp} />)
    fireEvent.click(screen.getByText('+ Add Goal'))
    fireEvent.change(screen.getByPlaceholderText(/target amount/i), { target: { value: '500' } })
    fireEvent.click(screen.getByText('Add Goal'))
    expect(onAdd).not.toHaveBeenCalled()
  })
})
