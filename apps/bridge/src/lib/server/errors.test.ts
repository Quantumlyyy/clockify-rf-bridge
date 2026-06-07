import { describe, expect, it } from 'vitest';
import { ClockifyError, ValidationError, WorkspaceError } from '@clockify-rf-bridge/invoice-core';
import { RfHttpError, RfParseError } from '@clockify-rf-bridge/request-finance';
import { BadGatewayError, BadRequestError, toHttpError, UnauthorizedError } from './errors';

describe('toHttpError', () => {
	it('maps ValidationError to 400', () => {
		const err = toHttpError(new ValidationError({ message: 'bad input' }));
		expect(err).toBeInstanceOf(BadRequestError);
		expect(err.status).toBe(400);
		expect(err.message).toBe('bad input');
	});

	it('maps ClockifyError to 502', () => {
		const err = toHttpError(new ClockifyError({ message: 'Clockify down' }));
		expect(err).toBeInstanceOf(BadGatewayError);
		expect(err.status).toBe(502);
	});

	it('maps WorkspaceError to 502', () => {
		const err = toHttpError(new WorkspaceError({ message: 'DO failed' }));
		expect(err.status).toBe(502);
	});

	it('maps RfHttpError 4xx to 400', () => {
		const err = toHttpError(new RfHttpError({ status: 422, body: 'invalid invoice' }));
		expect(err).toBeInstanceOf(BadRequestError);
	});

	it('maps RfHttpError 5xx to 502', () => {
		const err = toHttpError(new RfHttpError({ status: 503, body: 'unavailable' }));
		expect(err).toBeInstanceOf(BadGatewayError);
	});

	it('maps RfParseError to 502', () => {
		const err = toHttpError(new RfParseError({ message: 'parse failed' }));
		expect(err.status).toBe(502);
	});

	it('maps missing authToken lifecycle error to 400', () => {
		const err = toHttpError(new Error('INSTALLED lifecycle missing authToken'));
		expect(err).toBeInstanceOf(BadRequestError);
	});

	it('passes through HttpError subclasses', () => {
		const err = toHttpError(new UnauthorizedError('nope'));
		expect(err.status).toBe(401);
	});
});
