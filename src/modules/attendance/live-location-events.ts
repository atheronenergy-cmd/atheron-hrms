export const LIVE_LOCATION_EVENT = "hrms-live-location";

export function publishLiveSharing(sharing: boolean) {
  window.dispatchEvent(new CustomEvent(LIVE_LOCATION_EVENT, { detail: { sharing } }));
}
