/**
 * ChartPanel Component Tests
 *
 * Tests for the ledger timeline UI and chain verification.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChartPanel } from '../ChartPanel';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('ChartPanel', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Timeline rendering', () => {
    it('renders loading state initially', () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves
      
      render(<ChartPanel />);
      
      expect(screen.getByText('Loading ledger...')).toBeInTheDocument();
    });

    it('renders empty state when no entries', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ entries: [] }),
      });
      
      render(<ChartPanel />);
      
      await waitFor(() => {
        expect(screen.getByText('No entries in the ledger')).toBeInTheDocument();
      });
    });

    it('renders timeline with entries from API', async () => {
      const mockEntries = [
        {
          id: 'entry-1',
          ts: Date.now() - 1000,
          organ_id: null,
          event: 'WISH',
          payload_json: JSON.stringify({ wish: 'Test wish' }),
          prev_hash: '0'.repeat(64),
          hash: 'abc123',
        },
        {
          id: 'entry-2',
          ts: Date.now(),
          organ_id: 'organ-1',
          event: 'TRANSPLANT_APPROVED',
          payload_json: JSON.stringify({ slot_id: 'slot-1' }),
          prev_hash: 'abc123',
          hash: 'def456',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ entries: mockEntries }),
      });
      
      render(<ChartPanel />);
      
      await waitFor(() => {
        expect(screen.getByRole('list', { name: /ledger entries/i })).toBeInTheDocument();
      });

      // Check entries are rendered
      const entries = screen.getAllByRole('listitem');
      expect(entries).toHaveLength(2);

      // Check event types are shown
      expect(screen.getByText('WISH')).toBeInTheDocument();
      expect(screen.getByText('TRANSPLANT_APPROVED')).toBeInTheDocument();
    });

    it('displays organ ID when present', async () => {
      const mockEntries = [
        {
          id: 'entry-1',
          ts: Date.now(),
          organ_id: 'organ-test-123',
          event: 'BUILD',
          payload_json: '{}',
          prev_hash: '0'.repeat(64),
          hash: 'abc123',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ entries: mockEntries }),
      });
      
      render(<ChartPanel />);
      
      await waitFor(() => {
        expect(screen.getByText(/organ-test-123/)).toBeInTheDocument();
      });
    });

    it('uses mock data when API fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      render(<ChartPanel />);
      
      await waitFor(() => {
        // Mock data should include WISH entry
        expect(screen.getByText('WISH')).toBeInTheDocument();
      });
    });
  });

  describe('Verify button', () => {
    it('triggers verification on click', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            entries: [{
              id: 'entry-1',
              ts: Date.now(),
              organ_id: null,
              event: 'WISH',
              payload_json: '{}',
              prev_hash: '0'.repeat(64),
              hash: 'abc123',
            }],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ valid: true }),
        });
      
      render(<ChartPanel />);
      
      await waitFor(() => {
        expect(screen.getByText('WISH')).toBeInTheDocument();
      });

      const verifyBtn = screen.getByRole('button', { name: /verify chain/i });
      fireEvent.click(verifyBtn);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/ledger/verify');
      });
    });

    it('shows verifying state during verification', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            entries: [{
              id: 'entry-1',
              ts: Date.now(),
              organ_id: null,
              event: 'WISH',
              payload_json: '{}',
              prev_hash: '0'.repeat(64),
              hash: 'abc123',
            }],
          }),
        })
        .mockImplementation(() => new Promise(() => {})); // Never resolves
      
      render(<ChartPanel />);
      
      await waitFor(() => {
        expect(screen.getByText('WISH')).toBeInTheDocument();
      });

      const verifyBtn = screen.getByRole('button', { name: /verify chain/i });
      fireEvent.click(verifyBtn);

      expect(screen.getByText('Verifying...')).toBeInTheDocument();
      expect(verifyBtn).toBeDisabled();
    });

    it('is keyboard operable with Enter key', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ entries: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ valid: true }),
        });
      
      render(<ChartPanel />);
      
      await waitFor(() => {
        expect(screen.getByText('No entries in the ledger')).toBeInTheDocument();
      });

      const verifyBtn = screen.getByRole('button', { name: /verify chain/i });
      verifyBtn.focus();
      
      fireEvent.keyDown(verifyBtn, { key: 'Enter' });

      expect(mockFetch).toHaveBeenCalledWith('/api/ledger/verify');
    });
  });

  describe('Verification result display', () => {
    it('displays valid result', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            entries: [{
              id: 'entry-1',
              ts: Date.now(),
              organ_id: null,
              event: 'WISH',
              payload_json: '{}',
              prev_hash: '0'.repeat(64),
              hash: 'abc123',
            }],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ valid: true }),
        });
      
      render(<ChartPanel />);
      
      await waitFor(() => {
        expect(screen.getByText('WISH')).toBeInTheDocument();
      });

      const verifyBtn = screen.getByRole('button', { name: /verify chain/i });
      fireEvent.click(verifyBtn);

      await waitFor(() => {
        expect(screen.getByText('Chain valid')).toBeInTheDocument();
      });

      // Check for success indicator
      const result = screen.getByRole('status');
      expect(result).toHaveClass('chart-panel__verification--valid');
    });

    it('displays invalid result with error index', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            entries: [{
              id: 'entry-1',
              ts: Date.now(),
              organ_id: null,
              event: 'WISH',
              payload_json: '{}',
              prev_hash: '0'.repeat(64),
              hash: 'abc123',
            }],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ valid: false, errorIndex: 2 }),
        });
      
      render(<ChartPanel />);
      
      await waitFor(() => {
        expect(screen.getByText('WISH')).toBeInTheDocument();
      });

      const verifyBtn = screen.getByRole('button', { name: /verify chain/i });
      fireEvent.click(verifyBtn);

      await waitFor(() => {
        expect(screen.getByText(/Chain invalid at entry 2/)).toBeInTheDocument();
      });

      // Check for error indicator
      const result = screen.getByRole('status');
      expect(result).toHaveClass('chart-panel__verification--invalid');
    });

    it('uses local verification when API fails', async () => {
      // First call: fetch ledger entries (will use mock data on failure)
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        // Second call: verify (will use local verification on failure)
        .mockRejectedValueOnce(new Error('Network error'));
      
      render(<ChartPanel />);
      
      // Wait for mock entries to load (component uses mock data on error)
      await waitFor(() => {
        expect(screen.getByText('WISH')).toBeInTheDocument();
      });

      const verifyBtn = screen.getByRole('button', { name: /verify chain/i });
      fireEvent.click(verifyBtn);

      // Mock data has valid chain, should show valid
      await waitFor(() => {
        expect(screen.getByText('Chain valid')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has correct ARIA labels', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ entries: [] }),
      });
      
      render(<ChartPanel />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /verify chain integrity/i })).toBeInTheDocument();
      });
      
      expect(screen.getByLabelText(/the chart.*ledger timeline/i)).toBeInTheDocument();
    });

    it('announces verification result to screen readers', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            entries: [{
              id: 'entry-1',
              ts: Date.now(),
              organ_id: null,
              event: 'WISH',
              payload_json: '{}',
              prev_hash: '0'.repeat(64),
              hash: 'abc123',
            }],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ valid: true }),
        });
      
      render(<ChartPanel />);
      
      await waitFor(() => {
        expect(screen.getByText('WISH')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /verify chain/i }));

      await waitFor(() => {
        const status = screen.getByRole('status');
        expect(status).toHaveAttribute('aria-live', 'polite');
      });
    });

    it('has visible focus indicators', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          entries: [{
            id: 'entry-1',
            ts: Date.now(),
            organ_id: null,
            event: 'WISH',
            payload_json: '{}',
            prev_hash: '0'.repeat(64),
            hash: 'abc123',
          }],
        }),
      });
      
      render(<ChartPanel />);
      
      await waitFor(() => {
        expect(screen.getByText('WISH')).toBeInTheDocument();
      });

      const entry = screen.getByRole('listitem');
      expect(entry).toHaveAttribute('tabindex', '0');
    });
  });
});
