export class HttpError extends Error {
	constructor(
		public readonly status: number,
		message: string
	) {
		super(message);
		this.name = 'HttpError';
	}
}

export class UnauthorizedError extends HttpError {
	constructor(message = 'Unauthorized') {
		super(401, message);
		this.name = 'UnauthorizedError';
	}
}

export class ForbiddenError extends HttpError {
	constructor(message = 'Forbidden') {
		super(403, message);
		this.name = 'ForbiddenError';
	}
}

export class ConflictError extends HttpError {
	constructor(message = 'Conflict') {
		super(409, message);
		this.name = 'ConflictError';
	}
}

export class BadRequestError extends HttpError {
	constructor(message = 'Bad request') {
		super(400, message);
		this.name = 'BadRequestError';
	}
}

export function jsonError(error: unknown): Response {
	if (error instanceof HttpError) {
		return Response.json({ error: error.message }, { status: error.status });
	}
	console.error('Unhandled error:', error);
	return Response.json({ error: 'Internal server error' }, { status: 500 });
}
