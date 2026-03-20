import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LoginPage } from '@/pages/Login';
import { loginAuth } from '@/api/endpoints';

const mockLoginAuth = vi.fn();
const mockOnLoginSuccess = vi.fn();

vi.mock('@/api/endpoints', () => ({
  loginAuth: vi.fn(),
}));

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loginAuth).mockImplementation(mockLoginAuth);
    mockLoginAuth.mockResolvedValue({
      data: {
        enabled: true,
        authenticated: true,
        user: { user_id: '1', username: 'alice' },
      },
    });
  });

  it('submits username and password then calls success callback', async () => {
    render(<LoginPage onLoginSuccess={mockOnLoginSuccess} />);

    fireEvent.change(screen.getByLabelText('账号'), { target: { value: 'alice' } });
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'alice-pass' } });
    fireEvent.click(screen.getByRole('button', { name: '登录' }));

    await waitFor(() => {
      expect(loginAuth).toHaveBeenCalledWith('alice', 'alice-pass');
      expect(mockOnLoginSuccess).toHaveBeenCalled();
    });
  });
});
