import { getAddonKey } from '$lib/server/config';
import { buildManifest } from '$lib/server/manifest';

export function GET({ url, platform }: { url: URL; platform: App.Platform }) {
	const origin = url.origin;
	const addonKey = getAddonKey(platform.env);
	return Response.json(buildManifest(origin, addonKey));
}
