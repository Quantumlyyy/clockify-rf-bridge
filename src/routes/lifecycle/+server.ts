import { handleLifecycle, type LifecyclePayload } from '$lib/server/lifecycle';
import { jsonError } from '$lib/server/errors';

export async function POST({ request, platform }: { request: Request; platform: App.Platform }) {
	try {
		const lifecycleToken = request.headers.get('X-Addon-Lifecycle-Token');
		if (!lifecycleToken) {
			return Response.json({ error: 'Missing lifecycle token' }, { status: 401 });
		}

		const payload = (await request.json()) as LifecyclePayload;
		await handleLifecycle(payload, lifecycleToken, platform.env);
		return new Response(null, { status: 204 });
	} catch (error) {
		return jsonError(error);
	}
}
