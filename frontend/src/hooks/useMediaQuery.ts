import { useState, useEffect, useCallback } from 'react';

export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

export interface ResponsiveInfo {
  breakpoint: Breakpoint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  width: number;
  height: number;
  isLandscape: boolean;
  isPortrait: boolean;
  isTouch: boolean;
  pixelRatio: number;
}

const breakpoints = {
  xs: 0,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
  xxl: 1400,
};

export function useMediaQuery(): ResponsiveInfo {
  const [info, setInfo] = useState<ResponsiveInfo>(() => {
    if (typeof window === 'undefined') {
      return {
        breakpoint: 'lg',
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        width: 1200,
        height: 800,
        isLandscape: true,
        isPortrait: false,
        isTouch: false,
        pixelRatio: 1,
      };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    
    return getResponsiveInfo(width, height);
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setInfo(getResponsiveInfo(width, height));
    };

    const handleOrientationChange = () => {
      setTimeout(handleResize, 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  return info;
}

function getResponsiveInfo(width: number, height: number): ResponsiveInfo {
  let breakpoint: Breakpoint = 'xs';
  
  if (width >= breakpoints.xxl) breakpoint = 'xxl';
  else if (width >= breakpoints.xl) breakpoint = 'xl';
  else if (width >= breakpoints.lg) breakpoint = 'lg';
  else if (width >= breakpoints.md) breakpoint = 'md';
  else if (width >= breakpoints.sm) breakpoint = 'sm';

  const isMobile = width < breakpoints.md;
  const isTablet = width >= breakpoints.md && width < breakpoints.lg;
  const isDesktop = width >= breakpoints.lg;
  const isLandscape = width > height;
  const isPortrait = height >= width;
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const pixelRatio = window.devicePixelRatio || 1;

  return {
    breakpoint,
    isMobile,
    isTablet,
    isDesktop,
    width,
    height,
    isLandscape,
    isPortrait,
    isTouch,
    pixelRatio,
  };
}

export function useBreakpoint(breakpoint: Breakpoint): boolean {
  const { breakpoint: current } = useMediaQuery();
  const breakpointOrder: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'];
  
  return breakpointOrder.indexOf(current) >= breakpointOrder.indexOf(breakpoint);
}

export function useIsMobile(): boolean {
  const { isMobile } = useMediaQuery();
  return isMobile;
}

export function useIsTablet(): boolean {
  const { isTablet } = useMediaQuery();
  return isTablet;
}

export function useIsDesktop(): boolean {
  const { isDesktop } = useMediaQuery();
  return isDesktop;
}

export function useOrientation(): 'landscape' | 'portrait' {
  const { isLandscape } = useMediaQuery();
  return isLandscape ? 'landscape' : 'portrait';
}

export function useDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  const { isMobile, isTablet } = useMediaQuery();
  
  if (isMobile) return 'mobile';
  if (isTablet) return 'tablet';
  return 'desktop';
}

export function usePreferredColorScheme(): 'light' | 'dark' {
  const [scheme, setScheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    setScheme(mediaQuery.matches ? 'dark' : 'light');

    const handler = (e: MediaQueryListEvent) => {
      setScheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return scheme;
}

export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    setReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return reducedMotion;
}

export function useViewportSize() {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateSize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  return size;
}

export function useContainerQuery(
  ref: React.RefObject<HTMLElement>
): { width: number; height: number } {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return size;
}

export function useScrollPosition() {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const updatePosition = () => {
      setPosition({
        x: window.scrollX,
        y: window.scrollY,
      });
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, { passive: true });
    return () => window.removeEventListener('scroll', updatePosition);
  }, []);

  return position;
}

export function useScrollDirection() {
  const [direction, setDirection] = useState<'up' | 'down' | null>(null);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const updateDirection = () => {
      const scrollY = window.scrollY;
      
      if (scrollY > lastScrollY && scrollY > 100) {
        setDirection('down');
      } else if (scrollY < lastScrollY) {
        setDirection('up');
      }
      
      setLastScrollY(scrollY);
    };

    window.addEventListener('scroll', updateDirection, { passive: true });
    return () => window.removeEventListener('scroll', updateDirection);
  }, [lastScrollY]);

  return direction;
}

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export function useBatteryStatus() {
  const [battery, setBattery] = useState<{
    level: number;
    isCharging: boolean;
    chargingTime: number | null;
    dischargingTime: number | null;
  } | null>(null);

  useEffect(() => {
    const nav = navigator as any;
    
    if (!nav.getBattery) return;

    nav.getBattery().then((batteryManager: any) => {
      const updateBattery = () => {
        setBattery({
          level: batteryManager.level,
          isCharging: batteryManager.charging,
          chargingTime: batteryManager.chargingTime,
          dischargingTime: batteryManager.dischargingTime,
        });
      };

      updateBattery();

      batteryManager.addEventListener('levelchange', updateBattery);
      batteryManager.addEventListener('chargingchange', updateBattery);

      return () => {
        batteryManager.removeEventListener('levelchange', updateBattery);
        batteryManager.removeEventListener('chargingchange', updateBattery);
      };
    });
  }, []);

  return battery;
}

export function useDeviceMemory(): number | null {
  const [memory, setMemory] = useState<number | null>(null);

  useEffect(() => {
    const nav = navigator as any;
    if (nav.deviceMemory) {
      setMemory(nav.deviceMemory);
    }
  }, []);

  return memory;
}

export function useHardwareConcurrency(): number {
  const [cores, setCores] = useState(1);

  useEffect(() => {
    if (navigator.hardwareConcurrency) {
      setCores(navigator.hardwareConcurrency);
    }
  }, []);

  return cores;
}

export function useConnectionInfo() {
  const [connection, setConnection] = useState<{
    type: string;
    effectiveType: string;
    downlink: number;
    rtt: number;
    saveData: boolean;
  } | null>(null);

  useEffect(() => {
    const nav = navigator as any;
    
    if (!nav.connection) return;

    const updateConnection = () => {
      const conn = nav.connection;
      setConnection({
        type: conn.type || 'unknown',
        effectiveType: conn.effectiveType || 'unknown',
        downlink: conn.downlink || 0,
        rtt: conn.rtt || 0,
        saveData: conn.saveData || false,
      });
    };

    updateConnection();

    nav.connection.addEventListener('change', updateConnection);
    return () => nav.connection.removeEventListener('change', updateConnection);
  }, []);

  return connection;
}
