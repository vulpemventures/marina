import { Observable } from './observable';

type RpcResponse = {
    jsonrpc: string,
    result?: any,
    error?: string | {
        code: number,
        message: string,
    },
    id: number,
}

type RpcRequest = {
    jsonrpc: string,
    method: string,
    params?: any[],
}

type Request = {
    resolve: (result: any) => any,
    reject: (error: Error) => any,
    method: string,
    timeout: number,
}

export type ElectrumWSOptions = {
    proxy: boolean,
    token?: string,
    reconnect: boolean,
}

export enum ElectrumWSEvent {
    OPEN = 'open',
    CLOSE = 'close',
    CONNECTED = 'connected',
    DISCONNECTED = 'disconnected',
    RECONNECTING = 'reconnecting',
    ERROR = 'error',
    MESSAGE = 'message',
}


const RECONNECT_TIMEOUT = 1000;
const CONNECTED_TIMEOUT = 500;
const REQUEST_TIMEOUT = 1000 * 10; // 10 seconds
const CLOSE_CODE = 1000; // 1000 indicates a normal closure, meaning that the purpose for which the connection was established has been fulfilled

export class ElectrumWS extends Observable {
    private options: ElectrumWSOptions;
    private endpoint: string;

    private requests = new Map<number, Request>();
    private subscriptions = new Map<string, (...payload: any[]) => any>();

    private connected = false;
    private connectedTimeout: number | undefined;

    private reconnectionTimeout = -1;

    private incompleteMessage = '';

    public ws!: WebSocket;

    constructor(endpoint: string, options: Partial<ElectrumWSOptions> = {}) {
        super();

        this.endpoint = endpoint;

        this.options = Object.assign({
            proxy: true,
            reconnect: true,
        }, options);

        this.connect();

        Object.values(ElectrumWSEvent).forEach((ev: string) => {
            this.on(ev, (e: any) => e
                ? console.debug(`ElectrumWS - ${ev.toUpperCase()}:`, e)
                : console.debug(`ElectrumWS - ${ev.toUpperCase()}`),
            );
        });

    }

    public async request(method: string, ...params: (string | number | (string | number)[])[]): Promise<any> {
        let id: number;
        do {
            id = Math.ceil(Math.random() * 1e5);
        } while (this.requests.has(id));

        const payload = {
            jsonrpc: "2.0",
            method,
            params,
            id,
        };

        if (!this.connected) {
            await new Promise((resolve) => this.once(ElectrumWSEvent.CONNECTED, () => resolve(true)));
        }

        const promise = new Promise((resolve, reject) => {
            const timeout = window.setTimeout(() => {
                this.requests.delete(id);
                reject(new Error('Request timeout'));
            }, REQUEST_TIMEOUT);

            this.requests.set(id, {
                resolve,
                reject,
                method,
                timeout,
            });
        });

        console.debug('ElectrumWS SEND:', method, ...params);
        this.ws.send(this.options.proxy ? stringToBytes(JSON.stringify(payload) + '\n') : JSON.stringify(payload));

        return promise;
    }

    public async subscribe(method: string, callback: (...payload: any[]) => any, ...params: (string | number)[]) {
        const subscriptionKey = `${method}${typeof params[0] === 'string' ? `-${params[0]}` : ''}`;
        this.subscriptions.set(subscriptionKey, callback);

        // If not currently connected, the subscription will be activated in onOpen()
        if (!this.connected) return;

        callback(...params, await this.request(`${method}.subscribe` , ...params));
    }

    public async unsubscribe(method: string, ...params: (string | number)[]) {
        const subscriptionKey = `${method}${typeof params[0] === 'string' ? `-${params[0]}` : ''}`;
        this.subscriptions.delete(subscriptionKey);

        return this.request(`${method}.unsubscribe`, ...params);
    }

    public isConnected() {
        return this.connected;
    }

    public async close(reason: string) {
        this.options.reconnect = false;

        // Reject all pending requests
        for (const [id, request] of this.requests) {
            window.clearTimeout(request.timeout);
            this.requests.delete(id);
            console.debug('Rejecting pending request:', request.method);
            request.reject(new Error(reason));
        }

        window.clearTimeout(this.reconnectionTimeout);

        if (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN) {
            /* The websocket connection is not closed instantly and can take a very long time to trigger the close event */
            const closingPromise = new Promise((resolve) => this.once(ElectrumWSEvent.CLOSE, () => resolve(true)));
            this.ws.close(CLOSE_CODE, reason);
            return closingPromise;
        }
    }

    private connect() {
        let url = this.endpoint;
        if (this.options.proxy && this.options.token) {
            url = `${url}?token=${this.options.token}`;
        }

        this.ws = new WebSocket(url, this.options.proxy ? 'binary' : undefined);
        this.ws.binaryType = 'arraybuffer';

        this.ws.addEventListener('open', this.onOpen.bind(this));
        this.ws.addEventListener('message', this.onMessage.bind(this));
        this.ws.addEventListener('error', this.onError.bind(this));
        this.ws.addEventListener('close', this.onClose.bind(this));
    }

    private onOpen() {
        this.fire(ElectrumWSEvent.OPEN);

        this.connectedTimeout = window.setTimeout(() => {
            this.connected = true;
            this.fire(ElectrumWSEvent.CONNECTED);

            // Resubscribe to registered subscriptions
            for (const [subscriptionKey, callback] of this.subscriptions) {
                const params = subscriptionKey.split('-');
                const method = params.shift();
                if (!method) {
                    console.warn('Cannot resubscribe, no method in subscription key:', subscriptionKey);
                    continue;
                }
                this.subscribe(method, callback, ...params).catch((error) => {
                    if (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN) {
                        this.ws.close(CLOSE_CODE, error.message);
                    }
                });
            }
        }, CONNECTED_TIMEOUT);
    }

    private onMessage(msg: MessageEvent) {
        // Handle potential multi-line frames
        const raw = typeof msg.data === 'string' ? msg.data : bytesToString(msg.data);
        const lines = raw.split('\n').filter(line => line.length > 0);

        for (const line of lines) {
            const response = this.parseLine(line);
            if (!response) continue;
            this.fire(ElectrumWSEvent.MESSAGE, response);

            if ('id' in response && this.requests.has(response.id)) {
                const request = this.requests.get(response.id)!;
                window.clearTimeout(request.timeout);
                this.requests.delete(response.id);

                if ('result' in response) {
                    request.resolve(response.result);
                } else if (response.error) {
                    request.reject(new Error(typeof response.error === 'string' ? response.error : response.error.message));
                } else {
                    request.reject(new Error('No result'));
                }
            }

            if ('method' in response && /** @type {string} */ (response.method).endsWith('subscribe')) {
                const method = response.method.replace('.subscribe', '');
                const params = response.params || [];
                // If first parameter is a string (for scripthash subscriptions), it's part of the subscription key.
                // If first parameter is an object (for header subscriptions), it's not.
                const subscriptionKey = `${method}${typeof params[0] === 'string' ? `-${params[0]}` : ''}`;
                if (this.subscriptions.has(subscriptionKey)) {
                    const callback = this.subscriptions.get(subscriptionKey)!;
                    callback(...params);
                }
            }
        }
    }

    private parseLine(line: string): RpcResponse | RpcRequest | false {
        try {
            // console.debug('Parsing JSON:', line);
            const parsed = JSON.parse(line);
            this.incompleteMessage = '';
            return parsed;
        } catch (error) {
            // Ignore
        }

        if (this.incompleteMessage && !line.includes(this.incompleteMessage)) {
            return this.parseLine(`${this.incompleteMessage}${line}`);
        }

        // console.debug('Failed to parse JSON, retrying together with next message');
        this.incompleteMessage = line;
        return false;
    }

    private onError(event: Event) {
        if ((event as ErrorEvent).error) {
            console.error('ElectrumWS ERROR:', (event as ErrorEvent).error);
            this.fire(ElectrumWSEvent.ERROR, (event as ErrorEvent).error);
        }
    }

    private onClose(event: CloseEvent | Error) {
        this.fire(ElectrumWSEvent.CLOSE, event)

        if (!this.connected) window.clearTimeout(this.connectedTimeout);
        else this.fire(ElectrumWSEvent.DISCONNECTED);

        if (this.options.reconnect && this.connected) {
            this.fire(ElectrumWSEvent.RECONNECTING);
            this.reconnectionTimeout = window.setTimeout(() => this.connect(), RECONNECT_TIMEOUT);
        }

        this.connected = false;
    }
}

 function stringToBytes(str: string) {
    const encoder = new TextEncoder(); // utf-8 is the default
    return encoder.encode(str);
}

function bytesToString(bytes: BufferSource) {
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(bytes);
}