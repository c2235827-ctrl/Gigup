declare const window: any;

function waitForOneSignal(): Promise<any> {
  return new Promise((resolve) => {
    if (window.OneSignal) {
      resolve(window.OneSignal);
      return;
    }
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push((OneSignal: any) => resolve(OneSignal));
  });
}

/**
 * Call after login or registration.
 * Links the GigUp user ID to their OneSignal subscription.
 */
export async function identifyUserInOneSignal(user: {
  id: string;
  full_name: string;
  phone: string;
}): Promise<void> {
  try {
    const OneSignal = await waitForOneSignal();
    await OneSignal.login(user.id);
    await OneSignal.User.addTags({
      full_name: user.full_name,
      phone: user.phone,
      platform: 'web',
      last_login: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('OneSignal identify failed:', err);
  }
}

/**
 * Call after logout.
 */
export async function logoutOneSignal(): Promise<void> {
  try {
    const OneSignal = await waitForOneSignal();
    await OneSignal.logout();
  } catch (err) {
    console.warn('OneSignal logout failed:', err);
  }
}

/**
 * Request push permission. Call only from a user action — never on app load.
 */
export async function requestPushPermission(): Promise<boolean> {
  try {
    const OneSignal = await waitForOneSignal();
    const permission = await OneSignal.Notifications.requestPermission();
    return permission;
  } catch (err) {
    console.warn('OneSignal permission request failed:', err);
    return false;
  }
}

/**
 * Check if push permission is already granted.
 */
export async function isPushPermissionGranted(): Promise<boolean> {
  try {
    const OneSignal = await waitForOneSignal();
    return OneSignal.Notifications.permission;
  } catch {
    return false;
  }
}

/**
 * Update a tag — call after purchase or other key events.
 */
export async function updateOneSignalTag(key: string, value: string): Promise<void> {
  try {
    const OneSignal = await waitForOneSignal();
    await OneSignal.User.addTag(key, value);
  } catch (err) {
    console.warn('OneSignal tag update failed:', err);
  }
}
