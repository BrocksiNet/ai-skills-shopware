/**
 * @sw-package framework
 */
type NotificationConfig = { title?: string; message: string };

export default function useNotification() {
    const dispatch = (variant: string, config: NotificationConfig): void => {
        void Shopware.Store.get('notification').createNotification({ variant, ...config });
    };

    return {
        createNotificationSuccess: (config: NotificationConfig): void => dispatch('success', config),
        createNotificationError: (config: NotificationConfig): void => dispatch('critical', config),
    };
}
