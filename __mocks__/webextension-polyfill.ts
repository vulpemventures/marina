import type { Storage } from 'webextension-polyfill';

interface MockedBrowser {
    storage: {
        local: Storage.LocalStorageArea;
        onChanged: Storage.Static['onChanged'];
    },
}

const Browser = { storage: { local: {} } } as MockedBrowser;
const mockStorage = new Map<string, any>();
let changes: Record<string, Storage.StorageChange> = {};
const listeners = new Set<(changes: Record<string, Storage.StorageChange>, areaName: string) => Promise<void> | void>();

async function processChanges() {
    const changesCopy = { ...changes };
    changes = {}; // Must reset changes before processing listeners
    await Promise.allSettled(Array.from(listeners).map((listener) => listener(changesCopy, 'local')));
}

Browser.storage.local = {
    get: jest.fn((keys: string[] | string | null) => {
        if (keys === null) { // return all
            return Promise.resolve(
                Array.from(mockStorage.entries()).reduce<Record<string, any>>((acc, [key, value]) => {
                    acc[key] = value;
                    return acc;
                }
                    , {})
            );
        }
        if (typeof keys === 'string') {
            return Promise.resolve({
                [keys]: mockStorage.get(keys),
            });
        }
        return Promise.resolve(
            keys.reduce<Record<string, any>>((acc, key) => {
                acc[key] = mockStorage.get(key);
                return acc;
            }, {})
        );
    }),
    set: jest.fn(async (rec: Record<string, any>) => {
        Object.keys(rec).forEach((key) => {
            const oldValue = mockStorage.get(key);
            mockStorage.set(key, rec[key]);
            changes[key] = {
                newValue: rec[key],
                oldValue,
            };
        });
        await processChanges();
        return Promise.resolve();
    }),
    clear: jest.fn(() => {
        mockStorage.clear();
        return Promise.resolve();
    }),
    remove: jest.fn(async (keys: string[]) => {
        keys.forEach((key) => {
            const oldValue = mockStorage.get(key);
            mockStorage.delete(key);
            changes[key] = {
                oldValue,
            };
        });
        await processChanges();
        return Promise.resolve();
    }),
    QUOTA_BYTES: 5242880,
};

Browser.storage.onChanged = {
    addListener: jest.fn((listener) => {
        listeners.add(listener);
    }),
    removeListener: jest.fn((listener) => {
        listeners.delete(listener);
    }),
    hasListener: jest.fn((listener) => {
        return listeners.has(listener);
    }),
    hasListeners: jest.fn(() => {
        return listeners.size > 0;
    }),
}

export default Browser;