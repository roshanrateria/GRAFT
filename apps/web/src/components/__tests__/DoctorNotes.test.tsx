/**
 * DoctorNotes Component Tests
 *
 * Tests for the Doctor's Notes panel in the Theatre UI.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DoctorNotes } from '../DoctorNotes';

describe('DoctorNotes', () => {
  describe('Rendering', () => {
    it('renders the panel with title', () => {
      render(<DoctorNotes />);
      
      expect(screen.getByText("Doctor's Notes")).toBeInTheDocument();
    });

    it('renders the wish input field', () => {
      render(<DoctorNotes />);
      
      expect(screen.getByLabelText('Make a wish')).toBeInTheDocument();
    });

    it('renders the submit button', () => {
      render(<DoctorNotes />);
      
      expect(screen.getByRole('button', { name: 'Submit wish' })).toBeInTheDocument();
    });

    it('renders placeholder text for spec display', () => {
      render(<DoctorNotes />);
      
      expect(screen.getByText('Spec will appear here...')).toBeInTheDocument();
    });

    it('renders placeholder text for properties display', () => {
      render(<DoctorNotes />);
      
      expect(screen.getByText('Properties will appear here...')).toBeInTheDocument();
    });

    it('renders placeholder text for build progress', () => {
      render(<DoctorNotes />);
      
      expect(screen.getByText('Build progress will appear here...')).toBeInTheDocument();
    });
  });

  describe('Wish Input', () => {
    it('allows typing in the wish textarea', () => {
      render(<DoctorNotes />);
      
      const textarea = screen.getByLabelText('Make a wish');
      fireEvent.change(textarea, { target: { value: 'Add a mood tracker' } });
      
      expect(textarea).toHaveValue('Add a mood tracker');
    });

    it('disables submit button when wish is empty', () => {
      render(<DoctorNotes />);
      
      const submitBtn = screen.getByRole('button', { name: 'Submit wish' });
      expect(submitBtn).toBeDisabled();
    });

    it('enables submit button when wish has text', () => {
      render(<DoctorNotes />);
      
      const textarea = screen.getByLabelText('Make a wish');
      fireEvent.change(textarea, { target: { value: 'Add a mood tracker' } });
      
      const submitBtn = screen.getByRole('button', { name: 'Submit wish' });
      expect(submitBtn).not.toBeDisabled();
    });

    it('submits wish on button click', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      render(<DoctorNotes />);
      
      const textarea = screen.getByLabelText('Make a wish');
      fireEvent.change(textarea, { target: { value: 'Add a mood tracker' } });
      
      const submitBtn = screen.getByRole('button', { name: 'Submit wish' });
      fireEvent.click(submitBtn);
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Wish submitted:', 'Add a mood tracker');
      });
    });

    it('submits wish on Ctrl+Enter', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      render(<DoctorNotes />);
      
      const textarea = screen.getByLabelText('Make a wish');
      fireEvent.change(textarea, { target: { value: 'Add a calendar widget' } });
      
      // Simulate Ctrl+Enter
      fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Wish submitted:', 'Add a calendar widget');
      });
    });

    it('submits wish on Cmd+Enter (Mac)', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      render(<DoctorNotes />);
      
      const textarea = screen.getByLabelText('Make a wish');
      fireEvent.change(textarea, { target: { value: 'Add a todo list' } });
      
      // Simulate Cmd+Enter
      fireEvent.keyDown(textarea, { key: 'Enter', metaKey: true });
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Wish submitted:', 'Add a todo list');
      });
    });
  });

  describe('Assumptions Section', () => {
    it('shows assumptions after wish submission', async () => {
      render(<DoctorNotes />);
      
      const textarea = screen.getByLabelText('Make a wish');
      fireEvent.change(textarea, { target: { value: 'Add a mood tracker' } });
      
      const submitBtn = screen.getByRole('button', { name: 'Submit wish' });
      fireEvent.click(submitBtn);
      
      await waitFor(() => {
        expect(screen.getByText('Assumptions')).toBeInTheDocument();
      });
    });

    it('displays assumption items with correct status markers', async () => {
      render(<DoctorNotes />);
      
      const textarea = screen.getByLabelText('Make a wish');
      fireEvent.change(textarea, { target: { value: 'Add a mood tracker' } });
      
      const submitBtn = screen.getByRole('button', { name: 'Submit wish' });
      fireEvent.click(submitBtn);
      
      await waitFor(() => {
        // Check for pending assumption marker
        const markers = screen.getAllByText('?');
        expect(markers.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Accessibility', () => {
    it('has correct ARIA labels', () => {
      render(<DoctorNotes />);
      
      expect(screen.getByRole('region', { name: "Doctor's Notes" })).toBeInTheDocument();
    });

    it('has accessible hint for keyboard shortcut', () => {
      render(<DoctorNotes />);
      
      expect(screen.getByText('Press Ctrl+Enter to submit')).toBeInTheDocument();
    });

    it('announces streaming content to screen readers', () => {
      render(<DoctorNotes />);
      
      const specArea = screen.getByRole('status', { name: '' });
      expect(specArea).toHaveAttribute('aria-live', 'polite');
    });

    it('has visible focus for interactive elements', () => {
      render(<DoctorNotes />);
      
      const textarea = screen.getByLabelText('Make a wish');
      textarea.focus();
      expect(document.activeElement).toBe(textarea);
      
      const submitBtn = screen.getByRole('button', { name: 'Submit wish' });
      submitBtn.focus();
      expect(document.activeElement).toBe(submitBtn);
    });
  });
});
