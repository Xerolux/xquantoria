import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionTimeoutWarning } from '../SessionTimeoutWarning';

describe('SessionTimeoutWarning', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should not show warning when timeout is far away', () => {
    render(<SessionTimeoutWarning timeout={30} warningTime={5} enabled={true} />);

    expect(screen.queryByText(/Session Timeout Warning/i)).not.toBeInTheDocument();
  });

  it('should show warning before timeout', async () => {
    render(<SessionTimeoutWarning timeout={30} warningTime={5} enabled={true} />);

    // Fast forward past (timeout - warningTime) * 60 * 1000 ms
    vi.advanceTimersByTime(25 * 60 * 1000);

    await waitFor(() => {
      expect(screen.getByText(/Session Timeout Warning/i)).toBeInTheDocument();
    });
  });

  it('should not show warning when disabled', () => {
    render(<SessionTimeoutWarning timeout={30} warningTime={5} enabled={false} />);

    vi.advanceTimersByTime(25 * 60 * 1000);

    expect(screen.queryByText(/Session Timeout Warning/i)).not.toBeInTheDocument();
  });

  it('should display countdown timer', async () => {
    render(<SessionTimeoutWarning timeout={30} warningTime={5} enabled={true} />);

    vi.advanceTimersByTime(25 * 60 * 1000);

    await waitFor(() => {
      expect(screen.getByText(/Your session will expire in/i)).toBeInTheDocument();
    });
  });

  it('should reset timer on user activity', async () => {
    const onLogout = vi.fn();

    render(
      <SessionTimeoutWarning
        timeout={30}
        warningTime={5}
        enabled={true}
        onLogout={onLogout}
      />
    );

    // Simulate user activity
    window.dispatchEvent(new MouseEvent('mousemove'));

    vi.advanceTimersByTime(25 * 60 * 1000);

    await waitFor(() => {
      expect(screen.queryByText(/Session Timeout Warning/i)).not.toBeInTheDocument();
    });

    expect(onLogout).not.toHaveBeenCalled();
  });

  it('should call logout when timer expires', async () => {
    const onLogout = vi.fn();

    render(
      <SessionTimeoutWarning
        timeout={30}
        warningTime={5}
        enabled={true}
        onLogout={onLogout}
      />
    );

    vi.advanceTimersByTime(25 * 60 * 1000);

    await waitFor(() => {
      expect(screen.getByText(/Your session will expire in/i)).toBeInTheDocument();
    });

    // Fast forward through the warning countdown
    vi.advanceTimersByTime(5 * 60 * 1000);

    await waitFor(() => {
      expect(onLogout).toHaveBeenCalled();
    });
  });

  it('should extend session when button is clicked', async () => {
    const onExtendSession = vi.fn();
    const onLogout = vi.fn();

    render(
      <SessionTimeoutWarning
        timeout={30}
        warningTime={5}
        enabled={true}
        onExtendSession={onExtendSession}
        onLogout={onLogout}
      />
    );

    vi.advanceTimersByTime(25 * 60 * 1000);

    await waitFor(() => {
      expect(screen.getByText(/Extend Session/i)).toBeInTheDocument();
    });

    const extendButton = screen.getByText(/Extend Session/i);
    await userEvent.click(extendButton);

    expect(onExtendSession).toHaveBeenCalled();

    vi.advanceTimersByTime(5 * 60 * 1000);

    // Logout should not be called after extending session
    expect(onLogout).not.toHaveBeenCalled();
  });

  it('should logout immediately when logout button is clicked', async () => {
    const onLogout = vi.fn();

    render(
      <SessionTimeoutWarning
        timeout={30}
        warningTime={5}
        enabled={true}
        onLogout={onLogout}
      />
    );

    vi.advanceTimersByTime(25 * 60 * 1000);

    await waitFor(() => {
      expect(screen.getByText(/Logout Now/i)).toBeInTheDocument();
    });

    const logoutButton = screen.getByText(/Logout Now/i);
    await userEvent.click(logoutButton);

    expect(onLogout).toHaveBeenCalled();
  });

  it('should show warning modal when expired', async () => {
    const onLogout = vi.fn();

    render(
      <SessionTimeoutWarning
        timeout={30}
        warningTime={5}
        enabled={true}
        onLogout={onLogout}
      />
    );

    vi.advanceTimersByTime(30 * 60 * 1000);

    await waitFor(() => {
      expect(screen.getByText(/Session Expired/i)).toBeInTheDocument();
    });
  });

  it('should track multiple activity events', async () => {
    render(<SessionTimeoutWarning timeout={30} warningTime={5} enabled={true} />);

    // Trigger multiple activity events
    window.dispatchEvent(new MouseEvent('mousedown'));
    window.dispatchEvent(new KeyboardEvent('keydown'));
    window.dispatchEvent(new TouchEvent('touchstart'));

    vi.advanceTimersByTime(25 * 60 * 1000);

    await waitFor(() => {
      expect(screen.queryByText(/Session Timeout Warning/i)).not.toBeInTheDocument();
    });
  });
});
