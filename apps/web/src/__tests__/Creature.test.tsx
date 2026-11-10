/**
 * Creature Component Tests
 *
 * Tests for the Creature host application slot grid.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Creature } from '../Creature';

describe('Creature', () => {
  it('renders the top bar with title', () => {
    render(<Creature />);
    
    expect(screen.getByText('GRAFT')).toBeInTheDocument();
    expect(screen.getByText('The Creature')).toBeInTheDocument();
  });

  it('renders a grid of organ slots', () => {
    render(<Creature />);
    
    // Should have 9 slots (3x3 grid)
    const slots = screen.getAllByRole('gridcell');
    expect(slots).toHaveLength(9);
  });

  it('displays empty slot text for all slots initially', () => {
    render(<Creature />);
    
    const emptySlotTexts = screen.getAllByText('Empty slot');
    expect(emptySlotTexts).toHaveLength(9);
  });

  it('has correct accessibility attributes', () => {
    render(<Creature />);
    
    // Main content should have correct label
    expect(screen.getByRole('region', { name: /organ slots/i })).toBeInTheDocument();
    
    // All slots should be keyboard focusable
    const slots = screen.getAllByRole('gridcell');
    slots.forEach(slot => {
      expect(slot).toHaveAttribute('tabindex', '0');
    });
  });

  it('renders the ECG heartbeat line', () => {
    render(<Creature />);
    
    // ECG should be present
    const ecg = document.querySelector('.top-bar__ecg');
    expect(ecg).toBeInTheDocument();
  });
});
