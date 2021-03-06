import * as assert from 'assert';
import * as crypto from 'crypto';
import * as qs from 'query-string';
import * as got from 'got';
import {JsonConvert} from 'json2typescript';
import {Agent} from 'https';

export declare type ClassType<T> = {
	new (...args: any[]): T;
};

export interface TransportOptions {
	key: string;
	secret: string;
	baseUrl: string;
	agent?: boolean | Agent;
}

export class BittrexResponse {
	success:boolean;
	message: string;
	result: object | object[] | null;
	pathname?: string;
	data?: object;
	error?: any;
}

export class Transport {
	private jsonConvert: JsonConvert = new JsonConvert();

	constructor(public transportOptions: TransportOptions) {
		assert(!!this.transportOptions.key, 'key is required');
		assert(!!this.transportOptions.secret, 'secret is required');

		if (this.transportOptions.agent && typeof this.transportOptions.agent === 'boolean') {
			this.transportOptions.agent = new Agent({
				keepAlive: true,
				maxSockets: 100,
				maxFreeSockets: 10
			});
		}
	}

	public async request<T>(responseType: ClassType<T>, pathname: string, data = {}): Promise<T | T[]> {
		const {url, opts} = this.prepareRequest(pathname, data);
		return got(url, opts).then((response: got.Response<Object>) => {
			return this.handleResponse(responseType, response, pathname, data);
		});
	}

	private makeRejection(pathname: string, data: object, error: any, bittrexResponse: BittrexResponse): BittrexResponse {
		bittrexResponse.pathname = pathname;
		bittrexResponse.data = data;
		bittrexResponse.error = error;
		return Object.assign(new BittrexResponse(), bittrexResponse);
	}

	private handleResponse<T>(responseType: ClassType<T>, response: got.Response<Object>, pathname: string, data: object): Promise<T | T[]> {
		return new Promise<T | T[]>((resolve, reject) => {
			let bittrexResponse = response.body as BittrexResponse;
			if (bittrexResponse.success) {
				try {
					return resolve(this.jsonConvert.deserialize(bittrexResponse.result, responseType));
				} catch (error) {
					return reject(this.makeRejection(pathname, data, error, bittrexResponse));
				}
			} else {
				return reject(this.makeRejection(pathname, data, null, bittrexResponse));
			}
		});
	}

	private prepareRequest(pathname: string, data = {}) {
		const url = `${this.transportOptions.baseUrl}${pathname}`;

		const query = {
			apikey: this.transportOptions.key,
			nonce: Math.floor(Date.now() / 1000),
			...this.removeUndefined(data)
		};

		const urlSigned = `${url}?${qs.stringify(query)}`;
		const signature = crypto.createHmac('sha512', this.transportOptions.secret)
			.update(urlSigned, 'utf8')
			.digest('hex');

		const opts = {
			agent: this.transportOptions.agent,
			json: true,
			headers: {
				'User-Agent': 'Mozilla/4.0 (compatible; bittrex-typescript)',
				apisign: signature
			}
		};

		return {url: urlSigned, opts: opts};
	}

	private removeUndefined(obj: any) {
		return Object.keys(obj).reduce((acc: any, key) => {
			const _acc = acc;
			if (obj[key] !== undefined) _acc[key] = obj[key];
			return _acc;
		}, {});
	}
}
