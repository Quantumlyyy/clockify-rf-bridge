import { getEncryptedToken } from './db/tokens';
import { getDb } from './db/index';
import { BadRequestError } from './errors';

/** Provider-token seam — swap implementation when RF OAuth lands. */
export async function getRfToken(workspaceId: string, env: Env): Promise<string> {
	const token = await getEncryptedToken(getDb(env), workspaceId, 'rf_api', env);
	if (!token) {
		throw new BadRequestError(
			'Request Finance API token is not configured. Open add-on settings to add it.'
		);
	}
	return token;
}
