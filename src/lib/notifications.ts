// 브라우저 알림 관리자
export class NotificationManager {
  private static permissionRequested = false;

  // 알림 권한 요청
  static async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return 'denied';
    }

    if (Notification.permission === 'default' && !NotificationManager.permissionRequested) {
      NotificationManager.permissionRequested = true;
      const permission = await Notification.requestPermission();
      return permission;
    }

    return Notification.permission;
  }

  // 알림 표시
  static async notify(title: string, options: {
    body: string;
    icon?: string;
    tag?: string;
    requireInteraction?: boolean;
    onClick?: () => void;
  }): Promise<boolean> {
    const permission = await NotificationManager.requestPermission();
    
    if (permission !== 'granted') {
      console.log('Notification permission denied');
      return false;
    }

    try {
      const notification = new Notification(title, {
        body: options.body,
        icon: options.icon || '/favicon.ico',
        tag: options.tag,
        requireInteraction: options.requireInteraction || false,
        badge: '/favicon.ico'
      });

      if (options.onClick) {
        notification.onclick = (event) => {
          event.preventDefault();
          window.focus();
          options.onClick!();
          notification.close();
        };
      }

      // 5초 후 자동 닫기 (requireInteraction이 false인 경우)
      if (!options.requireInteraction) {
        setTimeout(() => {
          notification.close();
        }, 5000);
      }

      return true;
    } catch (error) {
      console.error('Failed to show notification:', error);
      return false;
    }
  }

  // Pure Ocean 특화 알림들
  static async notifyDocumentCompleted(documentTitle: string, documentUrl: string) {
    const success = await NotificationManager.notify(
      '📝 문서 첨삭 완료!',
      {
        body: `${documentTitle} 첨삭이 완료되었습니다. 결과를 확인해보세요.`,
        icon: '/pure-ocean-icon.png',
        tag: 'document-completed',
        requireInteraction: true,
        onClick: () => {
          window.open(documentUrl, '_blank');
        }
      }
    );

    return success;
  }

  static async notifyDocumentFailed(documentTitle: string, error: string) {
    const success = await NotificationManager.notify(
      '❌ 문서 첨삭 실패',
      {
        body: `${documentTitle} 첨삭 중 오류가 발생했습니다: ${error}`,
        icon: '/pure-ocean-icon.png',
        tag: 'document-failed',
        requireInteraction: true
      }
    );

    return success;
  }

  static async notifyDocumentProgress(documentTitle: string, currentStep: string, progress: number) {
    // 진행 상황은 덜 방해적으로 표시 (선택적)
    const success = await NotificationManager.notify(
      '🔄 문서 첨삭 진행 중',
      {
        body: `${documentTitle}: ${currentStep} (${progress}%)`,
        icon: '/pure-ocean-icon.png',
        tag: 'document-progress',
        requireInteraction: false
      }
    );

    return success;
  }

  // 페이지 포커스 상태 확인
  static isPageVisible(): boolean {
    return document.visibilityState === 'visible';
  }

  // 페이지가 보이지 않을 때만 알림 표시
  static async notifyIfHidden(title: string, options: Parameters<typeof NotificationManager.notify>[1]) {
    if (!NotificationManager.isPageVisible()) {
      return await NotificationManager.notify(title, options);
    }
    return false;
  }
}

// 브라우저 알림을 위한 React Hook
export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    const newPermission = await NotificationManager.requestPermission();
    setPermission(newPermission);
    return newPermission;
  }, []);

  return {
    permission,
    requestPermission,
    notify: NotificationManager.notify,
    notifyDocumentCompleted: NotificationManager.notifyDocumentCompleted,
    notifyDocumentFailed: NotificationManager.notifyDocumentFailed,
    notifyDocumentProgress: NotificationManager.notifyDocumentProgress,
    isSupported: 'Notification' in window
  };
}

// 타입 정의
declare global {
  interface Window {
    Notification: typeof Notification;
  }
}

// React import (useEffect, useCallback, useState 추가 필요)
import { useEffect, useCallback, useState } from 'react';