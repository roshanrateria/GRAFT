# Expense Tracker Organ Specification

## Overview

An expense tracking widget that displays expenses by category with filtering and totals.

## Requirements

### Functional Requirements

- **REQ-1**: The organ SHALL display a list of expense categories
- **REQ-2**: The organ SHALL allow filtering by category
- **REQ-3**: The organ SHALL show total expenses per category
- **REQ-4**: The organ SHALL emit the current total to an output port

### Non-Functional Requirements

- **NFR-1**: The organ SHALL use injected time via Nerve API for any time-based features
- **NFR-2**: The organ SHALL respect prefers-reduced-motion for animations

## Design

### UI Components

1. **Category Filter**: Clickable category buttons for filtering
2. **Expense List**: List of expenses in selected category
3. **Totals Display**: Per-category and grand total amounts

### Permissions Required

- `read:expenses.list` - Read expense data
- `emit:expenseTotal` - Emit current total

### Output Ports

- **expenseTotal** (object): Emitted when filtered total changes
  - `{ category: string | null, total: number, count: number }`

## Accessibility

- All buttons keyboard accessible
- ARIA labels for interactive elements
- Screen reader announcements for total changes
