import { describe, it, expect } from 'vitest';
import { createProviderContext } from '../providerContext';

describe('createProviderContext', () => {
  it('should create context with provider name', () => {
    const ctx = createProviderContext('anthropic');
    expect(ctx.getProviderName()).toBe('anthropic');
  });

  it('should default operation to unknown', () => {
    const ctx = createProviderContext('test');
    expect(ctx.getOperation()).toBe('unknown');
  });

  it('should default usage context to empty object', () => {
    const ctx = createProviderContext('test');
    expect(ctx.getUsageContext()).toEqual({});
  });

  it('should set and get usage context', () => {
    const ctx = createProviderContext('anthropic');
    ctx.setUsageContext({ projectId: '123', mapId: '456' }, 'generateBrief');
    expect(ctx.getUsageContext()).toEqual({ projectId: '123', mapId: '456' });
    expect(ctx.getOperation()).toBe('generateBrief');
  });

  it('should not update operation if not provided', () => {
    const ctx = createProviderContext('test');
    ctx.setUsageContext({}, 'firstOp');
    ctx.setUsageContext({ projectId: 'new' });
    expect(ctx.getOperation()).toBe('firstOp');
    expect(ctx.getUsageContext()).toEqual({ projectId: 'new' });
  });

  it('should create independent contexts per provider', () => {
    const ctx1 = createProviderContext('anthropic');
    const ctx2 = createProviderContext('gemini');
    ctx1.setUsageContext({ projectId: '1' }, 'op1');
    ctx2.setUsageContext({ projectId: '2' }, 'op2');
    expect(ctx1.getUsageContext()).toEqual({ projectId: '1' });
    expect(ctx2.getUsageContext()).toEqual({ projectId: '2' });
    expect(ctx1.getOperation()).toBe('op1');
    expect(ctx2.getOperation()).toBe('op2');
    expect(ctx1.getProviderName()).toBe('anthropic');
    expect(ctx2.getProviderName()).toBe('gemini');
  });
});
