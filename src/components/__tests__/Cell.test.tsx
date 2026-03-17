import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Cell from '@/components/Cell';

function renderCell(overrides: Partial<React.ComponentProps<typeof Cell>> = {}) {
  const props = {
    value: 'hello',
    row: 0,
    col: 0,
    isFirstRow: false,
    isFirstCol: false,
    focusToken: 0,
    onSave: vi.fn(),
    onNavigate: vi.fn(),
    ...overrides,
  };
  const result = render(
    <table><tbody><tr><Cell {...props} /></tr></tbody></table>
  );
  return { ...result, onSave: props.onSave, onNavigate: props.onNavigate };
}

describe('Cell', () => {
  describe('click to edit', () => {
    it('enters edit mode on click and shows input', async () => {
      renderCell();
      const td = screen.getByRole('cell');
      await userEvent.click(td);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });
  });

  describe('keyboard navigation', () => {
    it('Enter calls onSave (if changed) and onNavigate down', async () => {
      const { onSave, onNavigate } = renderCell({ value: 'hello' });
      await userEvent.click(screen.getByRole('cell'));
      const input = screen.getByRole('textbox');
      await userEvent.clear(input);
      await userEvent.type(input, 'world');
      await userEvent.keyboard('{Enter}');
      expect(onSave).toHaveBeenCalledWith(0, 0, 'world');
      expect(onNavigate).toHaveBeenCalledWith(0, 0, 'down');
    });

    it('Tab calls onSave (if changed) and onNavigate right', async () => {
      const { onSave, onNavigate } = renderCell({ value: 'hello' });
      await userEvent.click(screen.getByRole('cell'));
      const input = screen.getByRole('textbox');
      await userEvent.clear(input);
      await userEvent.type(input, 'new');
      await userEvent.keyboard('{Tab}');
      expect(onSave).toHaveBeenCalledWith(0, 0, 'new');
      expect(onNavigate).toHaveBeenCalledWith(0, 0, 'right');
    });

    it('Escape resets draft and does not call onSave or onNavigate', async () => {
      const { onSave, onNavigate } = renderCell({ value: 'hello' });
      await userEvent.click(screen.getByRole('cell'));
      const input = screen.getByRole('textbox');
      await userEvent.clear(input);
      await userEvent.type(input, 'changed');
      await userEvent.keyboard('{Escape}');
      expect(onSave).not.toHaveBeenCalled();
      expect(onNavigate).not.toHaveBeenCalled();
      // After Escape the cell should display the original value
      expect(screen.getByText('hello')).toBeInTheDocument();
    });

    it('Enter does not call onSave when draft equals value', async () => {
      const { onSave } = renderCell({ value: 'hello' });
      await userEvent.click(screen.getByRole('cell'));
      // don't change anything, just press Enter
      await userEvent.keyboard('{Enter}');
      expect(onSave).not.toHaveBeenCalled();
    });
  });

  describe('blur', () => {
    it('calls commit on blur', async () => {
      const { onSave } = renderCell({ value: '' });
      await userEvent.click(screen.getByRole('cell'));
      const input = screen.getByRole('textbox');
      await userEvent.type(input, 'typed');
      await userEvent.tab(); // moves focus away → blur
      expect(onSave).toHaveBeenCalledWith(0, 0, 'typed');
    });
  });

  describe('external value sync', () => {
    it('updates displayed value when prop changes while not editing', () => {
      const { rerender } = renderCell({ value: 'old' });
      expect(screen.getByText('old')).toBeInTheDocument();
      rerender(
        <table><tbody><tr><Cell
          value="new"
          row={0}
          col={0}
          isFirstRow={false}
          isFirstCol={false}
          focusToken={0}
          onSave={vi.fn()}
          onNavigate={vi.fn()}
        /></tr></tbody></table>
      );
      expect(screen.getByText('new')).toBeInTheDocument();
    });
  });

  describe('focusToken', () => {
    it('enters edit mode when focusToken increments', () => {
      const { rerender } = renderCell({ value: 'x', focusToken: 0 });
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      rerender(
        <table><tbody><tr><Cell
          value="x"
          row={0}
          col={0}
          isFirstRow={false}
          isFirstCol={false}
          focusToken={1}
          onSave={vi.fn()}
          onNavigate={vi.fn()}
        /></tr></tbody></table>
      );
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });
  });
});
