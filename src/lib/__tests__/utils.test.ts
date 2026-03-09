import { describe, it, expect } from 'vitest';
import { sha256 } from '@/lib/utils';

describe('sha256', () => {
  it('produces the correct hash for "hello"', async () => {
    const result = await sha256('hello');
    expect(result).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
  });

  it('produces the correct hash for an empty string', async () => {
    const result = await sha256('');
    expect(result).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });
});
