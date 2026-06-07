import { ClockifyError, ValidationError, WorkspaceError } from '@clockify-rf-bridge/invoice-core';
import { RfHttpError, RfParseError } from '@clockify-rf-bridge/request-finance';

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

export class BadRequestError extends HttpError {
	constructor(message = 'Bad request') {
		super(400, message);
		this.name = 'BadRequestError';
	}
}

export class BadGatewayError extends HttpError {
	constructor(message = 'Upstream service error') {
		super(502, message);
		this.name = 'BadGatewayError';
	}
}

export function toHttpError(error: unknown): HttpError {
	if (error instanceof HttpError) return error;

	if (error instanceof ValidationError) {
		return new BadRequestError(error.message);
	}

	if (error instanceof ClockifyError || error instanceof WorkspaceError) {
		return new BadGatewayError(error.message);
	}

	if (error instanceof RfHttpError) {
		const message = error.body.slice(0, 300) || `Request Finance API error (${error.status})`;
		if (error.status >= 400 && error.status < 500) {
			return new BadRequestError(message);
		}
		return new BadGatewayError(message);
	}

	if (error instanceof RfParseError) {
		return new BadGatewayError(error.message);
	}

	if (error instanceof Error) {
		if (error.message.includes('missing authToken')) {
			return new BadRequestError(error.message);
		}
		if (error.message.includes('is not configured')) {
			return new BadRequestError(error.message);
		}
	}

	return new HttpError(500, 'Internal server error');
}

export function jsonError(error: unknown): Response {
	const httpError = toHttpError(error);
	if (httpError.status >= 500) {
		console.error('Unhandled error:', error);
	}
	return Response.json({ error: httpError.message }, { status: httpError.status });
}
