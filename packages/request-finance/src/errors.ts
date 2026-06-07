import { Data } from 'effect';

export class RfHttpError extends Data.TaggedError('RfHttpError')<{
	readonly status: number;
	readonly body: string;
}> {}

export class RfParseError extends Data.TaggedError('RfParseError')<{
	readonly message: string;
}> {}

export type RfApiError = RfHttpError | RfParseError;
