import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';
import { useEffect, useId, useRef, useState } from 'react';
import { CheckIcon, ChevronDownIcon } from './Icons';

export type SelectOption = {
  readonly value: string;
  readonly label: ReactNode;
};

type SelectProps = {
  readonly value: string;
  readonly options: readonly SelectOption[];
  readonly onChange: (value: string) => void;
  readonly id?: string;
  readonly name?: string;
  readonly ariaLabel?: string;
  readonly className?: string;
};

export function Select({ value, options, onChange, id, name, ariaLabel, className }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(() => Math.max(0, options.findIndex((option) => option.value === value)));
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const optionRefs = useRef<Array<HTMLLIElement | null>>([]);
  const generatedId = useId();
  const listboxId = `${id ?? generatedId}-listbox`;
  const selectedOption = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!isOpen) return;
    function handlePointerDown(event: MouseEvent): void {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setHighlightedIndex(Math.max(0, options.findIndex((option) => option.value === value)));
  }, [isOpen, options, value]);

  useEffect(() => {
    if (!isOpen) return;
    optionRefs.current[highlightedIndex]?.scrollIntoView({ block: 'nearest' });
  }, [isOpen, highlightedIndex]);

  useEffect(() => {
    if (isOpen) listRef.current?.focus();
  }, [isOpen]);

  function closeAndRefocus(): void {
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  function selectOption(nextValue: string): void {
    onChange(nextValue);
    closeAndRefocus();
  }

  function handleTriggerKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>): void {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setIsOpen(true);
      return;
    }
    if (event.key === 'Escape') setIsOpen(false);
  }

  function handleListKeyDown(event: ReactKeyboardEvent<HTMLUListElement>): void {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedIndex((current) => Math.min(options.length - 1, current + 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIndex((current) => Math.max(0, current - 1));
    } else if (event.key === 'Home') {
      event.preventDefault();
      setHighlightedIndex(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      setHighlightedIndex(options.length - 1);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const option = options[highlightedIndex];
      if (option) selectOption(option.value);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeAndRefocus();
    } else if (event.key === 'Tab') {
      setIsOpen(false);
    }
  }

  return (
    <div className={`custom-select${isOpen ? ' is-open' : ''}${className ? ` ${className}` : ''}`} ref={rootRef}>
      <button
        id={id}
        name={name}
        type="button"
        className="custom-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-label={ariaLabel}
        onClick={() => setIsOpen((current) => !current)}
        onKeyDown={handleTriggerKeyDown}
        ref={triggerRef}
      >
        <span className="cell-ellipsis">{selectedOption?.label}</span>
        <ChevronDownIcon className="custom-select-chevron" />
      </button>
      {isOpen ? (
        <ul id={listboxId} className="custom-select-panel" role="listbox" tabIndex={-1} aria-label={ariaLabel} onKeyDown={handleListKeyDown} ref={listRef}>
          {options.map((option, index) => (
            <li
              key={option.value}
              ref={(node) => {
                optionRefs.current[index] = node;
              }}
              role="option"
              aria-selected={option.value === value}
              className={`custom-select-option${option.value === value ? ' is-selected' : ''}${index === highlightedIndex ? ' is-highlighted' : ''}`}
              onMouseEnter={() => setHighlightedIndex(index)}
              onClick={() => selectOption(option.value)}
            >
              <span className="cell-ellipsis">{option.label}</span>
              {option.value === value ? <CheckIcon className="custom-select-check" /> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
