import { useState, FormEvent } from 'react';

type Props = {
  onSubmit: (text: string) => void;
  disabled: boolean;
};

export function FillInInput({ onSubmit, disabled }: Props) {
  const [value, setValue] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setValue('');
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mt-4">
      <input
        type="text"
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled}
        placeholder="Type your answer…"
        className="flex-1 bg-gray-900 border-2 border-gray-700 rounded-xl px-4 py-3 text-white font-mono focus:border-primary-500 focus:outline-none disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white font-medium px-6 rounded-xl"
      >
        Submit
      </button>
    </form>
  );
}
