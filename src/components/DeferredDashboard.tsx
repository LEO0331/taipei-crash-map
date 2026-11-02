import { useEffect, useRef, useState, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
  fallback: ReactNode;
  immediate: boolean;
};

export function DeferredDashboard({ children, fallback, immediate }: Props) {
  const slot = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(immediate);

  useEffect(() => {
    if (visible) return;
    if (immediate || !('IntersectionObserver' in window)) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: '160px 0px' });
    if (slot.current) observer.observe(slot.current);
    return () => observer.disconnect();
  }, [immediate, visible]);

  return <div ref={slot} className="dashboard-slot">{visible || immediate ? children : fallback}</div>;
}
